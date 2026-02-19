/**
 * PSE WhatsApp Knowledge Base Scraper
 *
 * Connects to WhatsApp Web, captures messages from specified groups,
 * and sends them to the PSE app for embedding + storage.
 *
 * Setup:
 *   1. cp .env.example .env && fill in values
 *   2. npm install
 *   3. npm start
 *   4. Scan the QR code with your phone
 *   5. Keep running — session persists across restarts
 */

require('dotenv').config()
const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const axios = require('axios')

// ── Config ──────────────────────────────────────────────────────────────────
const NEXT_APP_URL = process.env.NEXT_APP_URL || 'http://localhost:3000'
const INGEST_SECRET = process.env.INGEST_SECRET || ''
const SESSION_DIR = process.env.SESSION_DIR || './session'

// Groups to watch — partial name match, case-insensitive
// Empty array = watch ALL groups (use with caution)
const WATCH_GROUPS = (process.env.WATCH_GROUPS || '')
  .split(',')
  .map(g => g.trim().toLowerCase())
  .filter(Boolean)

console.log('═══════════════════════════════════════════════')
console.log('  PSE WhatsApp Knowledge Base Scraper')
console.log('═══════════════════════════════════════════════')
console.log(`  App URL:      ${NEXT_APP_URL}`)
console.log(`  Watching:     ${WATCH_GROUPS.length > 0 ? WATCH_GROUPS.join(', ') : 'ALL groups'}`)
console.log(`  Session dir:  ${SESSION_DIR}`)
console.log('═══════════════════════════════════════════════\n')

// ── WhatsApp Client ──────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: SESSION_DIR
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
})

// ── QR Code ──────────────────────────────────────────────────────────────────
client.on('qr', (qr) => {
  console.log('\n📱 Scan this QR code with your WhatsApp:\n')
  qrcode.generate(qr, { small: true })
  console.log('\nGo to WhatsApp → Settings → Linked Devices → Link a Device\n')
})

// ── Auth Events ──────────────────────────────────────────────────────────────
client.on('authenticated', () => {
  console.log('✅ WhatsApp authenticated — session saved')
})

client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failed:', msg)
  console.log('   Delete the session/ folder and restart to re-scan QR code')
  process.exit(1)
})

client.on('ready', async () => {
  console.log('🟢 WhatsApp client ready!')

  // List all joined groups for reference
  const chats = await client.getChats()
  const groups = chats.filter(c => c.isGroup)
  console.log(`\n📋 You are in ${groups.length} group(s):`)
  groups.forEach(g => {
    const watching = isWatchedGroup(g.name)
    console.log(`   ${watching ? '👁 ' : '   '} ${g.name}`)
  })

  if (WATCH_GROUPS.length > 0) {
    console.log(`\n👁  Watching groups matching: ${WATCH_GROUPS.join(', ')}`)
  } else {
    console.log('\n⚠️  Watching ALL groups — set WATCH_GROUPS in .env to filter')
  }
  console.log('\nReady to capture messages...\n')
})

client.on('disconnected', (reason) => {
  console.log('🔴 WhatsApp disconnected:', reason)
  console.log('   Attempting to reconnect...')
  client.initialize()
})

// ── Message Handler ──────────────────────────────────────────────────────────
client.on('message', async (message) => {
  try {
    // Only process group messages
    if (!message.from.endsWith('@g.us')) return

    // Only process text messages
    if (!message.body || message.body.trim() === '') return

    // Skip system messages (joins, leaves, etc.)
    if (message.type !== 'chat') return

    // Get chat info
    const chat = await message.getChat()
    const groupName = chat.name
    const groupId = message.from

    // Check if this group should be watched
    if (!isWatchedGroup(groupName)) return

    // Get sender info
    const contact = await message.getContact()
    const senderName = contact.pushname || contact.name || message.author || 'Unknown'
    const senderJid = message.author || message.from

    const payload = {
      message_id: message.id._serialized,
      group_id: groupId,
      group_name: groupName,
      sender_jid: senderJid,
      sender_name: senderName,
      body: message.body.trim(),
      timestamp: new Date(message.timestamp * 1000).toISOString()
    }

    console.log(`💬 [${groupName}] ${senderName}: ${message.body.substring(0, 60)}${message.body.length > 60 ? '...' : ''}`)

    // Send to Next.js ingest API
    await ingestMessage(payload)

  } catch (err) {
    console.error('Error processing message:', err.message)
  }
})

// ── Ingest Function ──────────────────────────────────────────────────────────
async function ingestMessage(payload) {
  try {
    const response = await axios.post(
      `${NEXT_APP_URL}/api/knowledge/ingest`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-ingest-secret': INGEST_SECRET
        },
        timeout: 30000
      }
    )

    if (response.status === 200) {
      // Success — silent
    } else if (response.status === 409) {
      // Duplicate — already stored, that's fine
    } else {
      console.warn(`⚠️  Ingest returned ${response.status}`)
    }
  } catch (err) {
    if (err.response?.status === 409) {
      // Duplicate message, ignore
      return
    }
    console.error('❌ Ingest failed:', err.response?.data?.error || err.message)
    // Don't crash — just log and continue
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function isWatchedGroup(groupName) {
  if (WATCH_GROUPS.length === 0) return true // Watch all if not configured
  const nameLower = groupName.toLowerCase()
  return WATCH_GROUPS.some(watchTerm => nameLower.includes(watchTerm))
}

// ── Backfill: Load recent history ─────────────────────────────────────────────
// Uncomment and run once to backfill historical messages
// async function backfillHistory(daysBack = 30) {
//   const chats = await client.getChats()
//   const groups = chats.filter(c => c.isGroup && isWatchedGroup(c.name))
//   console.log(`\n📚 Backfilling ${daysBack} days from ${groups.length} groups...`)
//
//   for (const chat of groups) {
//     const messages = await chat.fetchMessages({ limit: 1000 })
//     const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000
//     const filtered = messages.filter(m =>
//       m.type === 'chat' &&
//       m.body &&
//       m.timestamp * 1000 > cutoff
//     )
//     console.log(`  ${chat.name}: ${filtered.length} messages to ingest`)
//     for (const msg of filtered) {
//       const contact = await msg.getContact()
//       await ingestMessage({
//         message_id: msg.id._serialized,
//         group_id: msg.from,
//         group_name: chat.name,
//         sender_jid: msg.author || msg.from,
//         sender_name: contact.pushname || contact.name || 'Unknown',
//         body: msg.body.trim(),
//         timestamp: new Date(msg.timestamp * 1000).toISOString()
//       })
//       await new Promise(r => setTimeout(r, 100)) // Rate limit
//     }
//   }
//   console.log('✅ Backfill complete')
// }

// ── Start ─────────────────────────────────────────────────────────────────────
console.log('Initializing WhatsApp client...')
client.initialize()

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...')
  await client.destroy()
  process.exit(0)
})
