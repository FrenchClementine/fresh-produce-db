import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  let body: {
    query: string
    group_filter?: string
    match_count?: number
    include_summary?: boolean
    context_window_minutes?: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    query,
    group_filter,
    match_count = 20,
    include_summary = false,
    context_window_minutes = 30,
  } = body

  if (!query || query.trim() === '') {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  // Generate query embedding — falls back to zero vector if OpenAI unavailable
  let queryEmbedding: number[]
  let embeddingAvailable = true
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query.trim(),
    })
    queryEmbedding = embeddingResponse.data[0].embedding
  } catch (err) {
    console.warn('Embedding unavailable, falling back to keyword/entity search:', (err as any)?.message)
    embeddingAvailable = false
    queryEmbedding = new Array(1536).fill(0) // zero vector — semantic results will be filtered out
  }

  // Call context_search RPC
  const { data: rawResults, error } = await supabase.rpc('context_search', {
    search_query: query.trim(),
    query_embedding: queryEmbedding,
    match_count,
    filter_group: group_filter || null,
    time_window_hours: Math.max(1, Math.round(context_window_minutes / 60)),
  })

  if (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // When embedding isn't available, drop semantic results (zero-vector scores are meaningless)
  const results = embeddingAvailable
    ? rawResults
    : (rawResults || []).filter((r: any) => r.match_type !== 'semantic')

  // Optionally generate AI summary of top results
  let summary: string | null = null
  if (include_summary && results && results.length > 0) {
    try {
      const topMessages = results
        .slice(0, 8)
        .map((r: any) => `[${r.group_name} | ${r.sender_name} | ${new Date(r.timestamp).toLocaleDateString('en-GB')}]\n${r.body}`)
        .join('\n\n---\n\n')

      const summaryResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a concise assistant for a fresh produce trading company (PSE).
Summarize WhatsApp conversations to give a trader a quick briefing before a call or decision.
Be direct and factual. Focus on: prices mentioned, quantities, quality issues, supplier names, promises made, delivery timelines.
Format as bullet points. Max 150 words.`
          },
          {
            role: 'user',
            content: `Query: "${query}"\n\nRelevant messages:\n\n${topMessages}\n\nSummarize the key points relevant to this query.`
          }
        ],
        temperature: 0.2,
        max_tokens: 250,
      })

      summary = summaryResponse.choices[0]?.message?.content || null
    } catch (err) {
      console.error('Summary error:', err)
      // Non-fatal — return results without summary
    }
  }

  return NextResponse.json({
    results: results || [],
    summary,
    query,
    count: results?.length || 0,
  })
}

// GET endpoint for thread context
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const messageId = searchParams.get('message_id')
  const contextMinutes = parseInt(searchParams.get('context_minutes') || '30')
  const maxMessages = parseInt(searchParams.get('max_messages') || '10')

  if (!messageId) {
    return NextResponse.json({ error: 'message_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('get_thread_context', {
    target_message_id: messageId,
    context_window_minutes: contextMinutes,
    max_messages: maxMessages,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ context: data || [] })
}
