/**
 * PSE Knowledge Base — Gmail Ingest Script
 * ==========================================
 * Paste this into Google Apps Script (script.google.com)
 * and set a time-based trigger to run every 5–15 minutes.
 *
 * SETUP:
 * 1. Go to https://script.google.com → New Project
 * 2. Paste this entire file
 * 3. Edit the CONFIG section below
 * 4. Click Run → checkNewEmails once to authorise permissions
 * 5. Click Triggers (clock icon) → Add Trigger:
 *    - Function: checkNewEmails
 *    - Event source: Time-driven
 *    - Type: Minutes timer → Every 5 minutes
 */

// ── CONFIG ────────────────────────────────────────────────────────────────────
const CONFIG = {
  // Your deployed Next.js app URL (no trailing slash)
  appUrl: 'https://YOUR_APP_URL_HERE',

  // Must match INGEST_SECRET in your .env.local
  ingestSecret: 'change-me-generate-a-random-secret',

  // Gmail label applied to processed emails (created automatically)
  processedLabel: 'kb-processed',

  // Only process emails received within this many days (safety net on first run)
  lookbackDays: 30,

  // Max attachment size in MB to forward (larger are skipped)
  maxAttachmentMb: 10,
}
// ─────────────────────────────────────────────────────────────────────────────

function checkNewEmails() {
  // Get or create the processed label
  let label = GmailApp.getUserLabelByName(CONFIG.processedLabel)
  if (!label) {
    label = GmailApp.createLabel(CONFIG.processedLabel)
  }

  // Search for all inbox emails NOT yet labeled as processed
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - CONFIG.lookbackDays)
  const dateStr = Utilities.formatDate(cutoff, 'UTC', 'yyyy/MM/dd')

  // This finds emails in your inbox (or CC'd to this account) after the cutoff date
  const threads = GmailApp.search(
    `in:anywhere -label:${CONFIG.processedLabel} after:${dateStr}`,
    0,
    50  // process up to 50 threads per run
  )

  let processed = 0
  let errors = 0

  for (const thread of threads) {
    const messages = thread.getMessages()

    for (const message of messages) {
      try {
        ingestMessage(message)
        processed++
      } catch (e) {
        console.error('Failed to ingest message:', message.getSubject(), e)
        errors++
      }
    }

    // Mark the whole thread as processed
    thread.addLabel(label)
  }

  if (processed > 0 || errors > 0) {
    console.log(`Ingested ${processed} emails. Errors: ${errors}`)
  }
}

function ingestMessage(message) {
  const subject = message.getSubject() || '(no subject)'
  const from = message.getFrom() // "Name <email@example.com>" or just "email@example.com"
  const date = message.getDate()
  const body = message.getPlainBody() || message.getBody().replace(/<[^>]*>/g, ' ')
  const messageId = message.getId()

  // Parse "Name <email@example.com>"
  const fromMatch = from.match(/^(.*?)\s*<(.+?)>$/)
  const fromEmail = fromMatch ? fromMatch[2].trim() : from.trim()
  const fromName = fromMatch ? fromMatch[1].replace(/"/g, '').trim() : fromEmail

  // Process attachments
  const attachments = []
  const rawAttachments = message.getAttachments()

  for (const att of rawAttachments) {
    const sizeBytes = att.getSize()
    const maxBytes = CONFIG.maxAttachmentMb * 1024 * 1024

    if (sizeBytes > maxBytes) {
      console.log(`Skipping large attachment: ${att.getName()} (${Math.round(sizeBytes / 1024 / 1024)}MB)`)
      continue
    }

    const bytes = att.getBytes()
    const base64 = Utilities.base64Encode(bytes)

    attachments.push({
      filename: att.getName(),
      mimeType: att.getContentType(),
      content: base64,
      size: sizeBytes,
    })
  }

  // Skip very short / empty bodies (e.g. calendar invites with no text)
  const bodyTrimmed = body.trim()
  if (bodyTrimmed.length < 5 && attachments.length === 0) return

  // POST to your app
  const payload = {
    secret: CONFIG.ingestSecret,
    messageId: messageId,
    subject: subject,
    from: { email: fromEmail, name: fromName },
    date: date.toISOString(),
    body: bodyTrimmed.slice(0, 20000), // cap at 20k chars
    attachments: attachments,
  }

  const response = UrlFetchApp.fetch(
    `${CONFIG.appUrl}/api/knowledge/ingest-email`,
    {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    }
  )

  const code = response.getResponseCode()
  const text = response.getContentText()

  if (code !== 200) {
    throw new Error(`HTTP ${code}: ${text}`)
  }

  console.log(`✓ ${subject} from ${fromName} — ${text}`)
}

/**
 * Run this once manually to test a single email ingestion.
 * It finds the most recent email in your inbox and ingests it.
 */
function testIngestLatest() {
  const threads = GmailApp.search('in:inbox', 0, 1)
  if (!threads.length) { console.log('No emails found'); return }
  const message = threads[0].getMessages()[0]
  console.log('Testing with:', message.getSubject())
  ingestMessage(message)
  console.log('Done.')
}
