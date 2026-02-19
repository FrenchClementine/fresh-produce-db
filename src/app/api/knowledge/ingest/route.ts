import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const INGEST_SECRET = process.env.INGEST_SECRET || ''

export async function POST(request: NextRequest) {
  // Authenticate the scraper
  const secret = request.headers.get('x-ingest-secret')
  if (INGEST_SECRET && secret !== INGEST_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    message_id: string
    group_id: string
    group_name: string
    sender_jid: string
    sender_name: string
    body: string
    timestamp: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { message_id, group_id, group_name, sender_jid, sender_name, body: text, timestamp } = body

  if (!message_id || !group_id || !text) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from('whatsapp_messages')
    .select('id')
    .eq('message_id', message_id)
    .single()

  if (existing) {
    return NextResponse.json({ status: 'duplicate' }, { status: 409 })
  }

  // Generate embedding
  let embedding: number[] | null = null
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    embedding = embeddingResponse.data[0].embedding
  } catch (err) {
    console.error('Embedding error — storing without embedding:', err)
    // Continue without embedding — message is still searchable via keyword
  }

  // Store in Supabase
  const { error } = await supabase
    .from('whatsapp_messages')
    .insert({
      message_id,
      group_id,
      group_name,
      sender_jid,
      sender_name,
      body: text,
      timestamp,
      embedding: embedding ? JSON.stringify(embedding) : null,
    })

  if (error) {
    console.error('Supabase insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ status: 'ok' })
}
