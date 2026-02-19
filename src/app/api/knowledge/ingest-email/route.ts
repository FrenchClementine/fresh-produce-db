import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const STORAGE_BUCKET = 'whatsapp-media' // reuse same bucket
const INGEST_SECRET = process.env.INGEST_SECRET || ''

// ── PDF text extraction (same as upload route) ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfParse: any = null

async function extractPdfText(bytes: Buffer): Promise<string | null> {
  try {
    if (!pdfParse) {
      pdfParse = (await import('pdf-parse') as any).default
    }
    const result = await pdfParse(bytes)
    const text = result.text?.trim()
    return text && text.length > 20 ? text : null
  } catch {
    return null
  }
}

// ── Embed text ────────────────────────────────────────────────────────────────
async function embedText(text: string): Promise<number[] | null> {
  try {
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // token limit
    })
    return res.data[0].embedding
  } catch {
    return null
  }
}

// ── Upload attachment to Supabase Storage ─────────────────────────────────────
async function uploadAttachment(
  filename: string,
  bytes: Buffer,
  mimeType: string
): Promise<string | null> {
  const safeFilename = filename
    .replace(/[\u200e\u200f\u202a-\u202e\u2060-\u206f\u0000-\u001f\u007f-\u009f]/g, '')
    .replace(/[^a-zA-Z0-9._\-]/g, '_')

  const path = `email-inbox/${safeFilename}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, bytes, { contentType: mimeType, upsert: true })

  if (error) {
    console.error(`Email attachment upload error for ${filename}:`, error.message)
    return null
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// ── Main handler ──────────────────────────────────────────────────────────────

export const maxDuration = 60

interface EmailAttachment {
  filename: string
  mimeType: string
  content: string  // base64
  size: number
}

interface IngestEmailPayload {
  secret: string
  messageId: string                         // Gmail message ID — used for dedup
  subject: string
  from: { email: string; name?: string }
  to?: string                               // To/CC list as a string
  date: string                              // ISO timestamp
  body: string                              // Plain text body
  attachments?: EmailAttachment[]
}

export async function POST(request: NextRequest) {
  let payload: IngestEmailPayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Auth check
  if (!INGEST_SECRET || payload.secret !== INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messageId, subject, from, date, body, attachments = [] } = payload

  if (!messageId || !subject || !from?.email || !body) {
    return NextResponse.json({ error: 'Missing required fields: messageId, subject, from.email, body' }, { status: 400 })
  }

  // Dedup — skip if we've already ingested this message
  const { data: existing } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('message_id', messageId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ skipped: true, message: 'Already ingested' })
  }

  // Process attachments
  const attachmentSummaries: string[] = []
  let primaryMediaUrl: string | null = null

  for (const att of attachments) {
    if (!att.filename || !att.content) continue
    if (att.size > 15 * 1024 * 1024) {
      // Skip attachments > 15 MB
      attachmentSummaries.push(`[Attachment too large to store: ${att.filename}]`)
      continue
    }

    const bytes = Buffer.from(att.content, 'base64')
    const url = await uploadAttachment(att.filename, bytes, att.mimeType || 'application/octet-stream')

    if (url && !primaryMediaUrl) primaryMediaUrl = url

    // Extract PDF text for searchability
    if (att.filename.toLowerCase().endsWith('.pdf')) {
      const pdfText = await extractPdfText(bytes)
      if (pdfText) {
        attachmentSummaries.push(`\n\n── Attachment: ${att.filename} ──\n${pdfText}`)
      } else {
        attachmentSummaries.push(`[PDF: ${att.filename}]`)
      }
    } else {
      attachmentSummaries.push(`[${att.mimeType?.split('/')[0] || 'file'}: ${att.filename}]`)
    }
  }

  // Build the full searchable body
  // Format: "Subject: ...\n\n{body}\n\n{attachment texts}"
  const fullBody = [
    `Subject: ${subject}`,
    '',
    body.trim(),
    ...attachmentSummaries,
  ].join('\n').trim()

  // Generate embedding
  const embedding = await embedText(fullBody)

  const senderName = from.name || from.email
  const senderJid = from.email

  // Store as a row in whatsapp_messages
  // group_id  = 'email'         (fixed — used for thread context lookup)
  // group_name = subject        (makes it filterable by subject in search UI)
  const { error: insertError } = await supabase.from('whatsapp_messages').insert({
    message_id:  messageId,
    group_id:    'email',
    group_name:  subject.length > 80 ? subject.slice(0, 80) + '…' : subject,
    sender_jid:  senderJid,
    sender_name: senderName,
    body:        fullBody,
    timestamp:   date,
    has_media:   attachments.length > 0,
    media_type:  attachments.length > 0 ? (attachments[0].mimeType?.split('/')[0] || 'document') : null,
    media_url:   primaryMediaUrl,
    embedding:   embedding,
  })

  if (insertError) {
    console.error('Email insert error:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Ingested email: "${subject}" from ${senderName}`,
    attachments_processed: attachments.length,
    media_url: primaryMediaUrl,
  })
}
