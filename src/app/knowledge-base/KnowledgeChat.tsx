'use client'

import * as React from 'react'
import { Send, Loader2, Sparkles, Clock, X, Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Source {
  id: string
  group_name: string
  sender_name: string
  body: string
  timestamp: string
  match_type: string
  similarity: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
}

const EXAMPLE_QUESTIONS = [
  'What are the latest PSE numbers?',
  'What recent pricing did we receive?',
  'What is the last discussion about El Dulze?',
  'Any quality issues with iceberg?',
  'What transport rates to UK?',
  'Latest spinach or rucola prices?',
]

function formatDate(ts: string) {
  const d = new Date(ts)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SourceCard({ source }: { source: Source }) {
  const [expanded, setExpanded] = React.useState(false)
  const matchColors: Record<string, string> = {
    entity: 'text-green-400',
    keyword: 'text-blue-400',
    semantic: 'text-purple-400',
  }
  return (
    <div className="border border-terminal-border/60 rounded p-2 bg-terminal-dark/60">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-terminal-accent font-semibold">{source.group_name}</span>
          <span className="text-terminal-muted/50">·</span>
          <span className="text-terminal-text/80">{source.sender_name}</span>
          <span className="text-terminal-muted/50">·</span>
          <span className="flex items-center gap-1 text-terminal-muted/60">
            <Clock className="h-2.5 w-2.5" />
            {formatDate(source.timestamp)}
          </span>
        </div>
        <span className={cn('text-[10px] uppercase font-mono shrink-0', matchColors[source.match_type] || 'text-terminal-muted')}>
          {source.match_type}
        </span>
      </div>
      <p className="text-terminal-muted leading-snug">
        {expanded ? source.body : (source.body.length > 120 ? source.body.slice(0, 120) + '…' : source.body)}
      </p>
      {source.body.length > 120 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-terminal-accent/60 hover:text-terminal-accent mt-1"
        >
          {expanded ? '▲ less' : '▼ more'}
        </button>
      )}
    </div>
  )
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  const [showSources, setShowSources] = React.useState(false)
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-7 h-7 bg-terminal-accent/20 rounded-full flex items-center justify-center mt-0.5">
        <Bot className="h-3.5 w-3.5 text-terminal-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-terminal-panel border border-terminal-border rounded-lg px-4 py-3">
          <div className="text-sm font-mono text-terminal-text leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-[11px] font-mono text-terminal-muted hover:text-terminal-accent transition-colors"
            >
              <Sparkles className="h-3 w-3" />
              {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
              <span>{showSources ? '▲' : '▼'}</span>
            </button>
            {showSources && (
              <div className="mt-2 space-y-1.5 text-xs font-mono">
                {message.sources.map(s => (
                  <SourceCard key={s.id} source={s} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex gap-3 items-start justify-end">
      <div className="bg-terminal-accent/15 border border-terminal-accent/25 rounded-lg px-4 py-3 max-w-[75%]">
        <div className="text-sm font-mono text-terminal-text leading-relaxed">
          {message.content}
        </div>
      </div>
      <div className="shrink-0 w-7 h-7 bg-terminal-muted/20 rounded-full flex items-center justify-center mt-0.5">
        <User className="h-3.5 w-3.5 text-terminal-muted" />
      </div>
    </div>
  )
}

export default function KnowledgeChat() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return

    const userMsg: ChatMessage = { role: 'user', content: question.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/knowledge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), history }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.error || 'Something went wrong'}`,
        }])
        return
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources || [],
      }])
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to get a response. Check your connection.',
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 260px)', minHeight: 400 }}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {messages.length === 0 && (
          <div className="py-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-terminal-accent/10 mb-4">
              <Bot className="h-6 w-6 text-terminal-accent" />
            </div>
            <p className="text-sm font-mono text-terminal-muted mb-1">
              Ask anything about your WhatsApp conversations
            </p>
            <p className="text-xs font-mono text-terminal-muted/50 mb-6">
              Powered by your PSE knowledge base
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
              {EXAMPLE_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-xs font-mono px-3 py-2.5 rounded border border-terminal-border text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent transition-colors leading-snug"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          msg.role === 'user'
            ? <UserBubble key={i} message={msg} />
            : <AssistantBubble key={i} message={msg} />
        ))}

        {loading && (
          <div className="flex gap-3 items-start">
            <div className="shrink-0 w-7 h-7 bg-terminal-accent/20 rounded-full flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-terminal-accent" />
            </div>
            <div className="bg-terminal-panel border border-terminal-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-terminal-muted text-xs font-mono">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-terminal-accent" />
                Searching knowledge base…
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-terminal-border pt-4 shrink-0">
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="mb-2 flex items-center gap-1.5 text-[11px] font-mono text-terminal-muted/60 hover:text-terminal-muted transition-colors"
          >
            <X className="h-3 w-3" />
            Clear conversation
          </button>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send, Shift+Enter for new line)"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-terminal-border bg-terminal-panel px-3 py-2.5 text-sm font-mono text-terminal-text placeholder:text-terminal-muted/50 focus:outline-none focus:border-terminal-accent focus:ring-1 focus:ring-terminal-accent/20 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className={cn(
              'shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border transition-colors',
              loading || !input.trim()
                ? 'border-terminal-border text-terminal-muted/40 cursor-not-allowed'
                : 'border-terminal-accent bg-terminal-accent/10 text-terminal-accent hover:bg-terminal-accent/20'
            )}
          >
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />
            }
          </button>
        </form>
        <p className="text-[10px] font-mono text-terminal-muted/40 mt-1.5">
          Answers based on your imported WhatsApp conversations
        </p>
      </div>
    </div>
  )
}
