import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import JSZip from 'jszip'
// Dynamic import used at call site to avoid Next.js build issues with pdf-parse
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfParse: any = null

export const maxDuration = 300 // 5 min timeout for large chats

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const STORAGE_BUCKET = 'whatsapp-media'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedMessage {
  message_id: string
  group_id: string
  group_name: string
  sender_jid: string
  sender_name: string
  body: string
  timestamp: string
  has_media: boolean
  media_type: string | null
  media_filename: string | null // actual filename from the zip
  media_url: string | null       // URL after uploading to Supabase Storage
  source: 'export'
}

// ── MIME helpers ──────────────────────────────────────────────────────────────

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', heic: 'image/heic', gif: 'image/gif',
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
    mp3: 'audio/mpeg', ogg: 'audio/ogg', m4a: 'audio/mp4',
    opus: 'audio/opus', aac: 'audio/aac',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
  return map[ext] || 'application/octet-stream'
}

function getMediaTypeFromExt(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (['jpg','jpeg','png','webp','heic','gif'].includes(ext)) return 'image'
  if (['mp4','mov','avi','mkv'].includes(ext))                return 'video'
  if (['mp3','ogg','m4a','opus','aac'].includes(ext))         return 'audio'
  if (['pdf','doc','docx','xls','xlsx','ppt','pptx'].includes(ext)) return 'document'
  return 'file'
}

// ── ZIP extraction ────────────────────────────────────────────────────────────

interface ExtractedZip {
  chatText: string
  mediaFiles: Map<string, { bytes: Uint8Array; mimeType: string; mediaType: string; extractedText?: string | null }>
}

async function extractZip(buffer: ArrayBuffer): Promise<ExtractedZip> {
  const zip = await JSZip.loadAsync(buffer)
  let chatText = ''
  const mediaFiles = new Map<string, { bytes: Uint8Array; mimeType: string; mediaType: string; extractedText?: string | null }>()

  const entries = Object.entries(zip.files)

  for (const [path, zipFile] of entries) {
    if (zipFile.dir) continue
    const basename = path.split('/').pop() || path

    if (basename === '_chat.txt' || (basename.endsWith('.txt') && entries.length <= 2)) {
      chatText = await zipFile.async('text')
    } else if (!basename.endsWith('.txt') && !basename.startsWith('.')) {
      const bytes = await zipFile.async('uint8array')
      const mediaType = getMediaTypeFromExt(basename)
      // Extract text from PDFs for searchability
      const extractedText = mediaType === 'document' && basename.toLowerCase().endsWith('.pdf')
        ? await extractPdfText(bytes)
        : null
      mediaFiles.set(basename, {
        bytes,
        mimeType: getMimeType(basename),
        mediaType,
        extractedText,
      })
    }
  }

  return { chatText, mediaFiles }
}

// ── PDF text extraction ───────────────────────────────────────────────────────

async function extractPdfText(bytes: Uint8Array): Promise<string | null> {
  try {
    if (!pdfParse) {
      // Dynamic import avoids Next.js build-time issues with pdf-parse
      pdfParse = (await import('pdf-parse') as any).default
    }
    const buf = Buffer.from(bytes)
    const result = await pdfParse(buf)
    const text = result.text?.trim()
    return text && text.length > 20 ? text : null
  } catch (err) {
    console.warn('PDF text extraction failed:', (err as any)?.message)
    return null
  }
}

// ── Media detection ───────────────────────────────────────────────────────────

function detectMedia(body: string): {
  hasMedia: boolean
  mediaType: string | null
  mediaFilename: string | null
  cleanBody: string
} {
  const trimmed = body.trim()

  // <attached: filename.ext> — from exports WITH media included
  // Handles both standalone attachments AND captions + attachment on same/next line
  const attachedInBody = trimmed.match(/<attached:\s*(.+?)>/)
  if (attachedInBody) {
    const filename = attachedInBody[1].trim()
    const caption = trimmed.replace(/<attached:\s*.+?>/, '').trim()
    return {
      hasMedia: true,
      mediaType: getMediaTypeFromExt(filename),
      mediaFilename: filename,
      // Preserve caption text alongside the media tag
      cleanBody: caption
        ? `${caption}\n[${getMediaTypeFromExt(filename)}: ${filename}]`
        : `[${getMediaTypeFromExt(filename)}: ${filename}]`,
    }
  }

  // Filename on its own line (some Android exports with media)
  const filenameMatch = trimmed.match(/^([\w\-. ]+\.(jpg|jpeg|png|webp|heic|gif|mp4|mov|avi|mp3|ogg|m4a|opus|aac|pdf|docx?|xlsx?|pptx?))(\s+\(file attached\))?$/i)
  if (filenameMatch) {
    const filename = filenameMatch[1]
    return {
      hasMedia: true,
      mediaType: getMediaTypeFromExt(filename),
      mediaFilename: filename,
      cleanBody: `[${getMediaTypeFromExt(filename)}: ${filename}]`,
    }
  }

  // "omitted" patterns — from exports WITHOUT media
  const omitPatterns: [RegExp, string][] = [
    [/^<Media omitted>$/i,             'image'],
    [/^image omitted$/i,               'image'],
    [/^photo omitted$/i,               'image'],
    [/^video omitted$/i,               'video'],
    [/^audio omitted$/i,               'audio'],
    [/^voice message omitted$/i,       'audio'],
    [/^document omitted$/i,            'document'],
    [/^sticker omitted$/i,             'sticker'],
    [/^GIF omitted$/i,                 'gif'],
    [/^Contact card omitted$/i,        'contact'],
  ]
  for (const [pattern, type] of omitPatterns) {
    if (pattern.test(trimmed)) {
      return { hasMedia: true, mediaType: type, mediaFilename: null, cleanBody: `[${type} omitted]` }
    }
  }

  return { hasMedia: false, mediaType: null, mediaFilename: null, cleanBody: body }
}

// ── WhatsApp text parser ──────────────────────────────────────────────────────

const SYSTEM_PATTERNS = [
  /Messages and calls are end-to-end encrypted/,
  /created group/i,
  /added you/i,
  /\bleft\b/,
  /changed the (subject|icon|description|group)/i,
  /removed .+ from this group/i,
  /joined using this group/i,
  /Your security code with/i,
  /This message was deleted/i,
  /Missed (voice|video) call/i,
]

function isSystemMessage(body: string): boolean {
  return SYSTEM_PATTERNS.some(p => p.test(body))
}

function parseDate(day: string, month: string, year: string, timeStr: string): Date | null {
  try {
    let y = parseInt(year)
    if (y < 100) y += 2000
    const d = parseInt(day)
    const m = parseInt(month)
    const t = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s([AP]M))?$/)
    if (!t) return null
    let h = parseInt(t[1])
    const min = parseInt(t[2])
    const sec = t[3] ? parseInt(t[3]) : 0
    if (t[4] === 'PM' && h !== 12) h += 12
    if (t[4] === 'AM' && h === 12) h = 0
    const date = new Date(y, m - 1, d, h, min, sec)
    return isNaN(date.getTime()) ? null : date
  } catch { return null }
}

function parseWhatsAppExport(
  text: string,
  groupName: string,
  limit?: number
): Omit<ParsedMessage, 'media_url'>[] {
  const groupId = `export:${groupName.toLowerCase().replace(/\s+/g, '_')}`
  const messages: Omit<ParsedMessage, 'media_url'>[] = []

  const cleaned = text
    .replace(/^\uFEFF/, '')
    .replace(/[\u200e\u200f\u202a\u202b\u202c]/g, '')
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  const lines = cleaned.split('\n')

  // iOS: [DD/MM/YYYY, HH:MM:SS] or [DD/MM/YYYY, H:MM:SS AM]
  const iosRx    = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?(?:\s[AP]M)?)\]\s(.+?):\s([\s\S]*)$/
  // Android: DD/MM/YYYY, HH:MM -
  const androidRx = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?(?:\s[AP]M)?)\s-\s(.+?):\s([\s\S]*)$/

  interface Pending { day: string; month: string; year: string; time: string; sender: string; body: string }
  let pending: Pending | null = null

  function flush(p: Pending) {
    const date = parseDate(p.day, p.month, p.year, p.time)
    if (!date) return
    const body = p.body.trim()
    if (!body || isSystemMessage(body)) return
    const { hasMedia, mediaType, mediaFilename, cleanBody } = detectMedia(body)
    if (!hasMedia && cleanBody.trim() === '') return
    messages.push({
      message_id: `export_${groupId}_${date.getTime()}_${messages.length}`,
      group_id: groupId,
      group_name: groupName,
      sender_jid: `export:${p.sender.toLowerCase().replace(/\s+/g, '_')}`,
      sender_name: p.sender.trim(),
      body: cleanBody.trim(),
      timestamp: date.toISOString(),
      has_media: hasMedia,
      media_type: mediaType,
      media_filename: mediaFilename,
      source: 'export',
    })
  }

  for (const line of lines) {
    let match = iosRx.exec(line) || androidRx.exec(line)
    if (match) {
      if (pending) flush(pending)
      pending = { day: match[1], month: match[2], year: match[3], time: match[4], sender: match[5], body: match[6] }
    } else if (pending && line.trim()) {
      pending.body += '\n' + line
    }
  }
  if (pending) flush(pending)

  if (limit && messages.length > limit) {
    return messages.slice(messages.length - limit)
  }
  return messages
}

// ── Upload media to Supabase Storage ─────────────────────────────────────────

async function uploadMediaFile(
  groupId: string,
  filename: string,
  bytes: Uint8Array,
  mimeType: string
): Promise<string | null> {
  const safeFolder = groupId.replace(/:/g, '-').replace(/[^a-zA-Z0-9\-_]/g, '_')
  // Strip zero-width / invisible Unicode control characters WhatsApp embeds in filenames
  const safeFilename = filename.replace(/[\u200e\u200f\u202a-\u202e\u2060-\u206f\u0000-\u001f\u007f-\u009f]/g, '')
  const path = `${safeFolder}/${safeFilename}`
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, bytes, { contentType: mimeType, upsert: true })

  if (error) {
    console.error(`Storage upload error for ${filename}:`, error.message)
    return null
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ── Embed in batches ──────────────────────────────────────────────────────────

async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  if (!texts.length) return []
  try {
    const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: texts })
    return res.data.map(d => d.embedding)
  } catch (err) {
    console.error('Embedding batch error:', err)
    return texts.map(() => null)
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file      = formData.get('file')      as File | null
  const groupName = (formData.get('group_name') as string || '').trim()
  const limitStr  = formData.get('limit')     as string | null
  const limit     = limitStr ? parseInt(limitStr) : undefined

  if (!file)      return NextResponse.json({ error: 'No file uploaded' },    { status: 400 })
  if (!groupName) return NextResponse.json({ error: 'group_name is required' }, { status: 400 })

  const isZip = file.name.endsWith('.zip')

  // ── Extract text + media ────────────────────────────────────────────────────
  let chatText = ''
  let zipMedia = new Map<string, { bytes: Uint8Array; mimeType: string; mediaType: string; extractedText?: string | null }>()

  if (isZip) {
    const buffer = await file.arrayBuffer()
    try {
      const extracted = await extractZip(buffer)
      chatText = extracted.chatText
      zipMedia = extracted.mediaFiles
    } catch (err) {
      return NextResponse.json({ error: `Failed to read zip: ${err}` }, { status: 422 })
    }
    if (!chatText) {
      return NextResponse.json({
        error: 'No _chat.txt found inside the zip. Make sure this is a WhatsApp exported chat zip file.',
      }, { status: 422 })
    }
  } else {
    chatText = await file.text()
  }

  if (!chatText.trim()) {
    return NextResponse.json({ error: 'Chat file is empty' }, { status: 400 })
  }

  // ── Parse ───────────────────────────────────────────────────────────────────
  const parsed = parseWhatsAppExport(chatText, groupName, limit)

  if (!parsed.length) {
    return NextResponse.json({
      error: 'No messages could be parsed. Make sure this is a WhatsApp exported chat file.',
    }, { status: 422 })
  }

  const groupId = parsed[0].group_id

  // ── Deduplicate ─────────────────────────────────────────────────────────────
  const { data: existingRows } = await supabase
    .from('whatsapp_messages').select('message_id').eq('group_id', groupId)
  const existingIds = new Set((existingRows || []).map((r: any) => r.message_id))
  const newMessages = parsed.filter(m => !existingIds.has(m.message_id))

  const mediaBreakdown = parsed.reduce((acc, m) => {
    if (m.has_media && m.media_type) acc[m.media_type] = (acc[m.media_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Early return if nothing new to insert
  if (!newMessages.length) {
    return NextResponse.json({
      parsed: parsed.length,
      skipped_duplicates: parsed.length,
      has_media: parsed.filter(m => m.has_media).length,
      media_in_zip: zipMedia.size,
      media_uploaded_to_storage: 0,
      storage_enabled: false,
      media_breakdown: mediaBreakdown,
      embedded: 0,
      inserted: 0,
      errors: 0,
      message: 'All messages already imported.',
    })
  }

  // ── Upload media files to Supabase Storage (parallel) ───────────────────────
  const mediaUrlMap = new Map<string, string>()
  let mediaUploaded = 0
  let storageEnabled = true

  if (zipMedia.size > 0) {
    const MEDIA_CONCURRENCY = 5
    const entries = [...zipMedia.entries()]
    let uploadFailed = 0

    for (let i = 0; i < entries.length; i += MEDIA_CONCURRENCY) {
      const batch = entries.slice(i, i + MEDIA_CONCURRENCY)
      const results = await Promise.all(
        batch.map(([filename, { bytes, mimeType }]) =>
          uploadMediaFile(groupId, filename, bytes, mimeType).then(url => ({ filename, url }))
        )
      )
      for (const { filename, url } of results) {
        if (url) { mediaUrlMap.set(filename, url); mediaUploaded++ }
        else uploadFailed++
      }
    }

    if (mediaUploaded === 0 && uploadFailed > 0) {
      storageEnabled = false
    }
  }

  const stats = {
    parsed: parsed.length,
    skipped_duplicates: parsed.length - newMessages.length,
    has_media: parsed.filter(m => m.has_media).length,
    media_in_zip: zipMedia.size,
    media_uploaded_to_storage: mediaUploaded,
    storage_enabled: storageEnabled && zipMedia.size > 0,
    media_breakdown: mediaBreakdown,
    embedded: 0,
    inserted: 0,
    errors: 0,
  }

  // ── Embed + insert in batches ───────────────────────────────────────────────
  const BATCH = 100

  for (let i = 0; i < newMessages.length; i += BATCH) {
    const batch = newMessages.slice(i, i + BATCH)

    // For PDF messages, substitute extracted text as the body for search
    const batchWithPdfText = batch.map(msg => {
      if (msg.media_filename && msg.media_type === 'document' && msg.media_filename.toLowerCase().endsWith('.pdf')) {
        const pdfData = zipMedia.get(msg.media_filename)
        if (pdfData?.extractedText) {
          return { ...msg, body: `${pdfData.extractedText}\n\n[PDF: ${msg.media_filename}]` }
        }
      }
      return msg
    })

    // Embed only messages with real text (not pure [omitted] stubs)
    const textMask = batchWithPdfText.map(m => !m.has_media || m.body.replace(/^\[.+?\]$/, '').trim().length > 0)
    const realTexts = batchWithPdfText.filter((_, j) => textMask[j]).map(m => m.body)
    const batchEmbeds = realTexts.length ? await embedBatch(realTexts) : []
    stats.embedded += realTexts.length

    let ei = 0
    const embeddings: (number[] | null)[] = batchWithPdfText.map((_, j) => textMask[j] ? batchEmbeds[ei++] ?? null : null)

    const rows = batchWithPdfText.map((msg, j) => ({
      message_id:  msg.message_id,
      group_id:    msg.group_id,
      group_name:  msg.group_name,
      sender_jid:  msg.sender_jid,
      sender_name: msg.sender_name,
      body:        msg.body,
      timestamp:   msg.timestamp,
      has_media:   msg.has_media,
      media_type:  msg.media_type,
      media_url:   msg.media_filename ? (mediaUrlMap.get(msg.media_filename) ?? null) : null,
      source:      msg.source,
      embedding:   embeddings[j] ? JSON.stringify(embeddings[j]) : null,
    }))

    const { error } = await supabase
      .from('whatsapp_messages')
      .upsert(rows, { onConflict: 'message_id', ignoreDuplicates: true })
    if (error) { console.error('Insert error:', error); stats.errors += batch.length }
    else stats.inserted += batch.length

    if (i + BATCH < newMessages.length) await new Promise(r => setTimeout(r, 150))
  }

  return NextResponse.json({
    ...stats,
    message: `Imported ${stats.inserted} messages from "${groupName}".`,
  })
}
