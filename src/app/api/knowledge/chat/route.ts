import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  let body: {
    question: string
    history?: ChatMessage[]
    group_filter?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { question, history = [], group_filter } = body

  if (!question || question.trim() === '') {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }

  // Generate embedding for semantic search
  let queryEmbedding: number[]
  let embeddingAvailable = true
  try {
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question.trim(),
    })
    queryEmbedding = embeddingResponse.data[0].embedding
  } catch {
    embeddingAvailable = false
    queryEmbedding = new Array(1536).fill(0)
  }

  // Search knowledge base for relevant messages
  const { data: rawResults, error } = await supabase.rpc('context_search', {
    search_query: question.trim(),
    query_embedding: queryEmbedding,
    match_count: 15,
    filter_group: group_filter || null,
    time_window_hours: 24,
  })

  if (error) {
    console.error('KB search error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = embeddingAvailable
    ? rawResults || []
    : (rawResults || []).filter((r: any) => r.match_type !== 'semantic')

  // Build context from top results
  const contextMessages = results
    .slice(0, 12)
    .map((r: any) =>
      `[${r.group_name} | ${r.sender_name} | ${new Date(r.timestamp).toLocaleDateString('en-GB')}]\n${r.body}`
    )
    .join('\n\n---\n\n')

  const systemPrompt = `You are a knowledgeable assistant for PSE, a fresh produce trading company.
You have access to WhatsApp conversation history between traders, suppliers, and buyers.
Answer questions based ONLY on the provided conversation context.
Be concise and factual. Mention specific names, prices, dates, and quantities when available.
If the context doesn't contain enough information to answer, say so clearly.
Format numbers and prices clearly. Use bullet points for lists.`

  const contextBlock = results.length > 0
    ? `\n\nRelevant WhatsApp conversations:\n\n---\n\n${contextMessages}\n\n---\n\nAnswer based on the above conversations.`
    : '\n\nNo relevant conversations found in the knowledge base for this query.'

  // Build conversation history for GPT
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt + contextBlock },
    ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: question.trim() },
  ]

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.2,
      max_tokens: 500,
    })

    const answer = completion.choices[0]?.message?.content || 'No answer generated.'

    // Return top sources for citations
    const sources = results.slice(0, 5).map((r: any) => ({
      id: r.id,
      group_name: r.group_name,
      sender_name: r.sender_name,
      body: r.body.length > 120 ? r.body.slice(0, 120) + '…' : r.body,
      timestamp: r.timestamp,
      match_type: r.match_type,
      similarity: r.similarity,
    }))

    return NextResponse.json({ answer, sources, question })
  } catch (err) {
    console.error('Chat completion error:', err)
    return NextResponse.json({ error: 'AI unavailable' }, { status: 500 })
  }
}
