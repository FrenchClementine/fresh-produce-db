'use client'

import * as React from 'react'
import { Search, Loader2, ChevronDown, ChevronUp, MessageSquare, Clock, Filter, Sparkles, X, Upload, Image, Video, Music, FileIcon, Network, Bot, Mail, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { getEmailPreview } from './email-utils'

// Lazy-load graph (uses ResizeObserver + SVG, fine in browser but skip SSR)
const KnowledgeGraph = dynamic(() => import('./KnowledgeGraph'), { ssr: false, loading: () => (
  <div className="flex items-center justify-center h-64 text-terminal-muted font-mono text-sm gap-2">
    <Loader2 className="h-4 w-4 animate-spin" /> Loading graph…
  </div>
) })

const KnowledgeChat = dynamic(() => import('./KnowledgeChat'), { ssr: false })
const OrderSearch = dynamic(() => import('./OrderSearch'), { ssr: false })

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  message_id: string
  group_name: string
  sender_name: string
  body: string
  timestamp: string
  similarity: number
  match_type: 'entity' | 'keyword' | 'semantic'
  has_media?: boolean
  media_type?: string | null
  media_url?: string | null
  source?: string
}

interface ThreadMessage {
  id: string
  message_id: string
  group_name: string
  sender_name: string
  body: string
  timestamp: string
  is_target: boolean
  media_url?: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return `Today ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays === 1) return `Yesterday ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function highlightQuery(text: string, query: string) {
  if (!query.trim()) return text
  const terms = query.trim().split(/\s+/).filter(Boolean)
  const regex = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-terminal-accent/30 text-terminal-accent rounded px-0.5">{part}</mark>
      : part
  )
}

const IMAGE_EXTS = /\.(jpg|jpeg|png|webp|heic|gif)$/i
const PDF_EXT = /\.pdf$/i

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const ATTACHED_RE = /<attached:\s*(.+?)>/i
const INLINE_FILE_RE = /\[(image|video|audio|document):\s*(.+?)\]/i

// Derive a Supabase Storage URL from body text for messages imported before media_url was stored
function getInlineMediaUrl(body: string, groupName: string): string | null {
  const m = ATTACHED_RE.exec(body) || INLINE_FILE_RE.exec(body)
  const filename = m ? (m[2] || m[1]).trim() : null
  if (!filename) return null
  const safeFolder = `export-${groupName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9\-_]/g, '_')}`
  const safeFilename = filename.replace(/[\u200e\u200f\u202a-\u202e\u2060-\u206f\u0000-\u001f\u007f-\u009f]/g, '')
  if (!SUPABASE_URL) return null
  return `${SUPABASE_URL}/storage/v1/object/public/whatsapp-media/${safeFolder}/${safeFilename}`
}

function MediaPreview({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = React.useState(false)
  const [pdfExpanded, setPdfExpanded] = React.useState(false)
  if (failed) return null
  const filename = decodeURIComponent(url.split('/').pop() || 'attachment')

  if (IMAGE_EXTS.test(url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="attachment"
        onError={() => setFailed(true)}
        className={className || 'mt-2 max-h-64 rounded border border-terminal-border object-contain'}
      />
    )
  }

  if (PDF_EXT.test(url)) {
    return (
      <div className="mt-2">
        <button
          onClick={() => setPdfExpanded(!pdfExpanded)}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-terminal-accent hover:underline mb-1"
        >
          <FileIcon className="h-3 w-3" />
          {filename}
          <span className="text-terminal-muted/60">{pdfExpanded ? '▲ hide' : '▼ preview'}</span>
        </button>
        {pdfExpanded && (
          <iframe
            src={`${url}#toolbar=0`}
            className="w-full h-96 rounded border border-terminal-border bg-white"
            title={filename}
          />
        )}
      </div>
    )
  }

  // Other files: download link
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono text-terminal-accent hover:underline"
    >
      <FileIcon className="h-3 w-3" />
      {filename}
    </a>
  )
}

const MATCH_TYPE_COLORS: Record<string, string> = {
  entity: 'bg-green-500/20 text-green-400 border-green-500/30',
  keyword: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  semantic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

// ── Components ────────────────────────────────────────────────────────────────

function MatchBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      'text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wide',
      MATCH_TYPE_COLORS[type] || 'bg-terminal-muted/20 text-terminal-muted'
    )}>
      {type}
    </span>
  )
}

function ThreadContext({
  messageId,
  query,
  onClose,
}: {
  messageId: string
  query: string
  onClose: () => void
}) {
  const [thread, setThread] = React.useState<ThreadMessage[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/knowledge/search?message_id=${messageId}&context_minutes=30&max_messages=20`)
        const data = await res.json()
        setThread(data.context || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [messageId])

  return (
    <div className="mt-3 border border-terminal-border/50 rounded bg-terminal-dark/50">
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border/50">
        <span className="text-xs font-mono text-terminal-muted">Thread context (±30 min)</span>
        <button onClick={onClose} className="text-terminal-muted hover:text-terminal-text">
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 text-terminal-muted text-xs font-mono">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading thread...
          </div>
        ) : thread.length === 0 ? (
          <p className="text-terminal-muted text-xs font-mono">No context found</p>
        ) : (
          thread.map((msg) => (
            <div key={msg.id} className={cn(
              'text-xs font-mono p-2 rounded',
              msg.is_target
                ? 'bg-terminal-accent/10 border border-terminal-accent/30'
                : 'text-terminal-muted'
            )}>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('font-semibold', msg.is_target ? 'text-terminal-accent' : 'text-terminal-text')}>
                  {msg.sender_name}
                </span>
                <span className="text-terminal-muted/60 text-[10px]">
                  {new Date(msg.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {msg.is_target && <span className="text-[10px] text-terminal-accent">← this message</span>}
              </div>
              <div className={msg.is_target ? 'text-terminal-text' : ''}>
                {msg.is_target ? highlightQuery(msg.body, query) : msg.body}
              </div>
              {(msg.media_url || getInlineMediaUrl(msg.body, msg.group_name)) && (
                <MediaPreview url={(msg.media_url || getInlineMediaUrl(msg.body, msg.group_name))!} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Detect if a result is an email (body starts with "Subject: ...")
function isEmail(body: string) {
  return body.startsWith('Subject:')
}


function ResultCard({ result, query }: { result: SearchResult; query: string }) {
  const [showThread, setShowThread] = React.useState(false)
  const [showFullEmail, setShowFullEmail] = React.useState(false)
  const [pdfOpen, setPdfOpen] = React.useState(false)
  const email = isEmail(result.body)
  const emailData = React.useMemo(() => email ? getEmailPreview(result.body) : null, [email, result.body])
  const mediaUrl = result.media_url || getInlineMediaUrl(result.body, result.group_name)

  return (
    <div className={cn(
      'border rounded-lg p-4 transition-colors',
      email
        ? 'border-sky-500/30 hover:border-sky-400/60 bg-sky-950/10'
        : 'border-terminal-border hover:border-terminal-accent/50 bg-terminal-panel'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {email && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-sky-400 bg-sky-400/10 border border-sky-400/20 px-1.5 py-0.5 rounded">
              <Mail className="h-2.5 w-2.5" />
              Email
            </span>
          )}
          <span className={cn('text-xs font-mono font-semibold', email ? 'text-sky-400' : 'text-terminal-accent')}>
            {result.group_name}
          </span>
          <span className="text-terminal-border">·</span>
          <span className="text-xs font-mono text-terminal-text">{result.sender_name}</span>
          <span className="text-terminal-border">·</span>
          <span className="text-xs font-mono text-terminal-muted flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(result.timestamp)}
          </span>
          {!email && result.has_media && result.media_type && (
            <span className="flex items-center gap-1 text-[10px] font-mono text-terminal-muted/70 bg-terminal-dark px-1.5 py-0.5 rounded border border-terminal-border">
              {result.media_type === 'image'    && <Image    className="h-3 w-3 text-blue-400"   />}
              {result.media_type === 'video'    && <Video    className="h-3 w-3 text-purple-400" />}
              {result.media_type === 'audio'    && <Music    className="h-3 w-3 text-green-400"  />}
              {result.media_type === 'document' && <FileIcon className="h-3 w-3 text-orange-400" />}
              {result.media_type}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MatchBadge type={result.match_type} />
          <span className="text-[10px] font-mono text-terminal-muted/60">
            {(result.similarity * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Email: compact preview */}
      {email && emailData ? (
        <div>
          <p className="text-sm font-mono text-terminal-text leading-relaxed whitespace-pre-wrap break-words">
            {highlightQuery((showFullEmail ? emailData.fullLines : emailData.previewLines).join('\n'), query)}
          </p>
          {emailData.fullLines.length > 6 && (
            <button
              onClick={() => setShowFullEmail(!showFullEmail)}
              className="mt-1.5 flex items-center gap-1 text-xs font-mono text-sky-400/70 hover:text-sky-400 transition-colors"
            >
              {showFullEmail ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show full email</>}
            </button>
          )}
          {/* Attachment */}
          {mediaUrl && (
            <div className="mt-3">
              {PDF_EXT.test(mediaUrl) ? (
                <div>
                  <button
                    onClick={() => setPdfOpen(!pdfOpen)}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-400 hover:text-sky-300 bg-sky-400/10 border border-sky-400/20 px-2.5 py-1.5 rounded transition-colors"
                  >
                    <FileIcon className="h-3.5 w-3.5" />
                    {decodeURIComponent(mediaUrl.split('/').pop() ?? 'attachment.pdf').replace(/_/g, ' ')}
                    <span className="text-sky-400/60 ml-1">{pdfOpen ? '▲ hide' : '▼ open'}</span>
                  </button>
                  {pdfOpen && (
                    <div className="mt-2">
                      <iframe src={`${mediaUrl}#toolbar=1`} className="w-full h-[600px] rounded border border-sky-500/30 bg-white" title="PDF" />
                      <a href={mediaUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-mono text-sky-400 hover:underline">↗ Open in new tab</a>
                    </div>
                  )}
                </div>
              ) : IMAGE_EXTS.test(mediaUrl) ? (
                <MediaPreview url={mediaUrl} />
              ) : (
                <a href={mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-400 hover:underline bg-sky-400/10 border border-sky-400/20 px-2.5 py-1.5 rounded">
                  <FileIcon className="h-3.5 w-3.5" />
                  {decodeURIComponent(mediaUrl.split('/').pop() ?? 'attachment').replace(/_/g, ' ')}
                </a>
              )}
            </div>
          )}
          {/* Attachment names from body (no URL) */}
          {!mediaUrl && emailData.attachmentNames.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {emailData.attachmentNames.map(name => (
                <span key={name} className="inline-flex items-center gap-1.5 text-xs font-mono text-terminal-muted/50 bg-terminal-dark border border-terminal-border px-2 py-1 rounded">
                  <FileIcon className="h-3 w-3" />{name}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm font-mono text-terminal-text leading-relaxed whitespace-pre-wrap break-words">
            {highlightQuery(result.body, query)}
          </p>
          {mediaUrl && <MediaPreview url={mediaUrl} />}
        </>
      )}

      {/* Thread toggle — skip for emails */}
      {!email && (
        <div className="mt-3">
          <button
            onClick={() => setShowThread(!showThread)}
            className="flex items-center gap-1.5 text-xs font-mono text-terminal-muted hover:text-terminal-accent transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            {showThread ? 'Hide' : 'Show'} context
            {showThread ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showThread && (
            <ThreadContext messageId={result.id} query={query} onClose={() => setShowThread(false)} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab definitions ────────────────────────────────────────────────────────────

type Tab = 'search' | 'graph' | 'chat' | 'orders'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'search', label: 'Search',  icon: <Search  className="h-3.5 w-3.5" /> },
  { id: 'orders', label: 'Orders',  icon: <Hash    className="h-3.5 w-3.5" /> },
  { id: 'graph',  label: 'Graph',   icon: <Network className="h-3.5 w-3.5" /> },
  { id: 'chat',   label: 'Ask AI',  icon: <Bot     className="h-3.5 w-3.5" /> },
]

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const [activeTab, setActiveTab] = React.useState<Tab>('search')
  const [query, setQuery] = React.useState('')
  const [groupFilter, setGroupFilter] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [summary, setSummary] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [includeSummary, setIncludeSummary] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const [groups, setGroups] = React.useState<string[]>([])

  const inputRef = React.useRef<HTMLInputElement>(null)

  // Focus search on mount
  React.useEffect(() => {
    if (activeTab === 'search') inputRef.current?.focus()
  }, [activeTab])

  // Extract unique groups from results
  React.useEffect(() => {
    const found = [...new Set(results.map(r => r.group_name))].sort()
    setGroups(found)
  }, [results])

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setHasSearched(true)
    setSummary(null)

    try {
      const res = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          group_filter: groupFilter || undefined,
          match_count: 30,
          include_summary: includeSummary,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error('Search error:', data.error)
        setResults([])
        return
      }

      setResults(data.results || [])
      setSummary(data.summary || null)
    } catch (err) {
      console.error('Search failed:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  function clearSearch() {
    setQuery('')
    setResults([])
    setSummary(null)
    setHasSearched(false)
    setGroupFilter('')
    inputRef.current?.focus()
  }

  return (
    <div className="min-h-screen bg-terminal-dark text-terminal-text">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 bg-terminal-accent/20 rounded flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-terminal-accent" />
            </div>
            <h1 className="text-xl font-mono font-bold text-terminal-text">
              PSE Knowledge Base
            </h1>
          </div>
          <p className="text-sm font-mono text-terminal-muted ml-11">
            Search your WhatsApp conversations &amp; emails — suppliers, prices, quality, promises
          </p>
          <div className="ml-11 mt-3 flex items-center gap-2 flex-wrap">
            <Link href="/knowledge-base/import">
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs border-terminal-border text-terminal-muted hover:text-terminal-accent hover:border-terminal-accent flex items-center gap-2"
              >
                <Upload className="h-3.5 w-3.5" />
                Import WhatsApp
              </Button>
            </Link>
            <Link href="/knowledge-base/email-setup">
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs border-sky-500/40 text-sky-400/70 hover:text-sky-400 hover:border-sky-400 flex items-center gap-2"
              >
                <Mail className="h-3.5 w-3.5" />
                Email setup
              </Button>
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-terminal-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-mono transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-terminal-accent text-terminal-accent'
                  : 'border-transparent text-terminal-muted hover:text-terminal-text'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'search' && hasSearched && results.length > 0 && (
                <span className="bg-terminal-accent/20 text-terminal-accent text-[10px] px-1.5 py-0.5 rounded-full">
                  {results.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Search Tab ── */}
        {activeTab === 'search' && (
          <>
            {/* Search Form */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-terminal-muted" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder='Search anything — "Barbastathis iceberg", "spinach quality", "delivery delay"...'
                  className="pl-12 pr-24 h-14 text-base font-mono bg-terminal-panel border-terminal-border border-2 text-terminal-text placeholder:text-terminal-muted/50 focus:border-terminal-accent focus:ring-2 focus:ring-terminal-accent/20"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {query && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="text-terminal-muted hover:text-terminal-text"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <Button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="h-8 px-4 bg-terminal-accent text-terminal-dark font-mono text-sm hover:bg-terminal-accent/80"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {groups.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-terminal-muted" />
                    <span className="text-xs font-mono text-terminal-muted">Group:</span>
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setGroupFilter('')}
                        className={cn(
                          'text-xs font-mono px-2 py-0.5 rounded border transition-colors',
                          !groupFilter
                            ? 'border-terminal-accent text-terminal-accent bg-terminal-accent/10'
                            : 'border-terminal-border text-terminal-muted hover:border-terminal-text'
                        )}
                      >
                        All
                      </button>
                      {groups.map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGroupFilter(g === groupFilter ? '' : g)}
                          className={cn(
                            'text-xs font-mono px-2 py-0.5 rounded border transition-colors',
                            g === groupFilter
                              ? 'border-terminal-accent text-terminal-accent bg-terminal-accent/10'
                              : 'border-terminal-border text-terminal-muted hover:border-terminal-text'
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 ml-auto cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSummary}
                    onChange={e => setIncludeSummary(e.target.checked)}
                    className="rounded border-terminal-border"
                  />
                  <Sparkles className="h-3.5 w-3.5 text-terminal-accent" />
                  <span className="text-xs font-mono text-terminal-muted">AI summary</span>
                </label>
              </div>
            </form>

            {/* AI Summary */}
            {summary && (
              <div className="mb-6 p-4 border border-terminal-accent/30 rounded-lg bg-terminal-accent/5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-terminal-accent" />
                  <span className="text-xs font-mono text-terminal-accent font-semibold uppercase tracking-wide">
                    AI Briefing
                  </span>
                </div>
                <div className="text-sm font-mono text-terminal-text leading-relaxed whitespace-pre-wrap">
                  {summary}
                </div>
              </div>
            )}

            {/* Results count */}
            {hasSearched && !loading && (
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-mono text-terminal-muted">
                  {results.length === 0
                    ? 'No messages found'
                    : `${results.length} message${results.length !== 1 ? 's' : ''} found`}
                  {groupFilter && ` in "${groupFilter}"`}
                </span>
                {results.length > 0 && (
                  <div className="flex items-center gap-3 text-[11px] font-mono text-terminal-muted">
                    <span className={MATCH_TYPE_COLORS.entity + ' px-1.5 py-0.5 rounded border text-[10px]'}>entity</span>
                    <span className={MATCH_TYPE_COLORS.keyword + ' px-1.5 py-0.5 rounded border text-[10px]'}>keyword</span>
                    <span className={MATCH_TYPE_COLORS.semantic + ' px-1.5 py-0.5 rounded border text-[10px]'}>semantic</span>
                  </div>
                )}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center gap-3 py-12 justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-terminal-accent" />
                <span className="text-sm font-mono text-terminal-muted">Searching conversations...</span>
              </div>
            )}

            {/* Empty state — not yet searched */}
            {!hasSearched && !loading && (
              <div className="py-16 text-center">
                <MessageSquare className="h-12 w-12 text-terminal-border mx-auto mb-4" />
                <p className="text-terminal-muted font-mono text-sm mb-6">
                  Your WhatsApp knowledge base — search anything
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                  {[
                    'Barbastathis iceberg',
                    'spinach quality issue',
                    'delivery delay',
                    'price increase',
                    'Thessaloniki transport',
                    'UK buyer iceberg',
                  ].map(example => (
                    <button
                      key={example}
                      onClick={() => { setQuery(example); setTimeout(() => handleSearch(), 50) }}
                      className="text-xs font-mono px-3 py-1.5 rounded border border-terminal-border text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No results */}
            {hasSearched && !loading && results.length === 0 && (
              <div className="py-12 text-center">
                <Search className="h-10 w-10 text-terminal-border mx-auto mb-3" />
                <p className="text-terminal-muted font-mono text-sm">No messages found for this query.</p>
                <p className="text-terminal-muted/60 font-mono text-xs mt-1">
                  Try different keywords or check the WhatsApp scraper is running.
                </p>
              </div>
            )}

            {/* Results */}
            {!loading && results.length > 0 && (
              <div className="space-y-3">
                {(groupFilter
                  ? results.filter(r => r.group_name === groupFilter)
                  : results
                ).map(result => (
                  <ResultCard key={result.id} result={result} query={query} />
                ))}
              </div>
            )}

            {/* Footer */}
            {results.length > 0 && !loading && (
              <div className="mt-8 pt-4 border-t border-terminal-border text-center">
                <p className="text-xs font-mono text-terminal-muted/50">
                  {results.length} results · Click "Show context" to see the full conversation thread
                </p>
              </div>
            )}
          </>
        )}

        {/* ── Graph Tab ── */}
        {activeTab === 'graph' && (
          <div>
            {!hasSearched && (
              <div className="mb-4 p-3 border border-terminal-border/50 rounded-lg bg-terminal-panel text-xs font-mono text-terminal-muted flex items-start gap-2">
                <Network className="h-3.5 w-3.5 text-terminal-accent shrink-0 mt-0.5" />
                <span>
                  Search on the <button onClick={() => setActiveTab('search')} className="text-terminal-accent hover:underline">Search tab</button> first,
                  then come back here to visualise the senders, groups and keywords from your results.
                </span>
              </div>
            )}
            {hasSearched && results.length > 0 && (
              <div className="mb-4 text-xs font-mono text-terminal-muted flex items-center gap-2">
                <span className="text-terminal-accent">{query}</span>
                <span className="text-terminal-muted/50">·</span>
                <span>{results.length} results visualised</span>
                <button
                  onClick={() => setActiveTab('search')}
                  className="ml-auto text-terminal-muted/60 hover:text-terminal-accent flex items-center gap-1"
                >
                  <Search className="h-3 w-3" /> Refine search
                </button>
              </div>
            )}
            <KnowledgeGraph query={query} results={results} />
          </div>
        )}

        {/* ── Orders Tab ── */}
        {activeTab === 'orders' && (
          <OrderSearch />
        )}

        {/* ── Chat Tab ── */}
        {activeTab === 'chat' && (
          <KnowledgeChat />
        )}

      </div>
    </div>
  )
}
