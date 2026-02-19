/**
 * Supabase Edge Function: search-knowledge-base
 *
 * Deploy: supabase functions deploy search-knowledge-base
 *
 * Set secrets:
 *   supabase secrets set OPENAI_API_KEY=sk-...
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... (optional, for Claude summary)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const { query, group_filter, match_count = 20, include_summary = false } = await req.json()

    if (!query) {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 1. Embed the query with OpenAI
    const embedResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: query.trim(),
      }),
    })

    if (!embedResponse.ok) {
      const err = await embedResponse.text()
      throw new Error(`OpenAI embedding failed: ${err}`)
    }

    const embedData = await embedResponse.json()
    const queryEmbedding = embedData.data[0].embedding

    // 2. Call context_search RPC
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data: results, error } = await supabase.rpc('context_search', {
      search_query: query.trim(),
      query_embedding: queryEmbedding,
      match_count,
      filter_group: group_filter || null,
      time_window_hours: 24,
    })

    if (error) throw error

    // 3. Optionally generate AI summary using Claude
    let summary: string | null = null
    if (include_summary && results && results.length > 0 && ANTHROPIC_API_KEY) {
      const topMessages = results
        .slice(0, 5)
        .map((r: any) => `[${r.group_name} | ${r.sender_name} | ${new Date(r.timestamp).toLocaleDateString('en-GB')}]\n${r.body}`)
        .join('\n\n---\n\n')

      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 300,
          messages: [{
            role: 'user',
            content: `You are a concise assistant for PSE (Produce Services Europe), a fresh produce trading company.

Summarize these WhatsApp conversations to give a trader a quick briefing.
Be direct and factual. Focus on: prices, quantities, quality issues, supplier names, promises made, delivery timelines.
Format as bullet points. Max 150 words.

Query: "${query}"

Relevant messages:
${topMessages}

Summarize the key points relevant to this query.`
          }],
        }),
      })

      if (claudeResponse.ok) {
        const claudeData = await claudeResponse.json()
        summary = claudeData.content?.[0]?.text || null
      }
    }

    return new Response(JSON.stringify({
      results: results || [],
      summary,
      query,
      count: results?.length || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
