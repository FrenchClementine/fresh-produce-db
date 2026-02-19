'use client'

import * as React from 'react'
import { Search, Loader2, FileIcon, CheckCircle, Circle, ChevronDown, ChevronUp, MessageSquare, Mail, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getEmailPreview } from './email-utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  message_id: string
  group_name: string
  sender_name: string
  body: string
  timestamp: string
  similarity: number
  match_type: string
  has_media?: boolean
  media_type?: string | null
  media_url?: string | null
}

// ── Document types to look for ─────────────────────────────────────────────────

const DOC_TYPES = [
  { id: 'purchase',   label: 'Purchase Confirmation',   keywords: ['purchase confirmation', 'purchase confirm', 'aankoop'] },
  { id: 'transport',  label: 'Transport Confirmation',   keywords: ['transport confirmation', 'transport confirm', 'transport bevestiging'] },
  { id: 'sales',      label: 'Sales Confirmation',       keywords: ['sales confirmation', 'sales confirm', 'verkoop'] },
  { id: 'quality',    label: 'Quality Issue',            keywords: ['quality issue', 'quality claim', 'quality complaint', 'kwaliteit'] },
  { id: 'delivery',   label: 'Delivery Ticket',          keywords: ['delivery ticket', 'delivery note', 'leveringsbon', 'delivery slip'] },
  { id: 'weight',     label: 'Weight Return',            keywords: ['weight return', 'weight note', 'gewicht', 'weight slip'] },
  { id: 'invoice',    label: 'Invoice',                  keywords: ['invoice', 'factuur', 'inv '] },
] as const

type DocId = typeof DOC_TYPES[number]['id']

interface DocMatch {
  result: SearchResult
  pdfUrl: string | null
}

interface OrderData {
  allResults: SearchResult[]
  docs: Record<DocId, DocMatch | null>
  supplier: string | null
  customer: string | null
  transporter: string | null
  conversations: SearchResult[]  // non-email or emails that didn't match a doc type
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PDF_EXT = /\.pdf$/i

function matchDocType(result: SearchResult): DocId | null {
  const haystack = (result.group_name + ' ' + result.body.slice(0, 200)).toLowerCase()
  for (const dt of DOC_TYPES) {
    if (dt.keywords.some(kw => haystack.includes(kw))) return dt.id
  }
  return null
}

function formatDate(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return `Today ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays === 1) return `Yesterday`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Very simple extraction: find the line after a label
function extractParty(body: string, labels: string[]): string | null {
  const lines = body.split('\n')
  for (const line of lines) {
    const lower = line.toLowerCase()
    for (const label of labels) {
      if (lower.includes(label)) {
        // Try to get value from same line (e.g. "Supplier: GS Growers")
        const afterColon = line.split(':').slice(1).join(':').trim()
        if (afterColon && afterColon.length > 1 && afterColon.length < 80) return afterColon
        // Otherwise grab the next non-empty line
        const idx = lines.indexOf(line)
        for (let i = idx + 1; i < Math.min(idx + 5, lines.length); i++) {
          const next = lines[i].trim()
          if (next && next.length > 1 && next.length < 80 && !next.includes(':')) return next
        }
      }
    }
  }
  return null
}

function processResults(results: SearchResult[]): OrderData {
  const docs: Record<DocId, DocMatch | null> = {
    purchase: null, transport: null, sales: null,
    quality: null, delivery: null, weight: null, invoice: null,
  }
  const conversations: SearchResult[] = []

  for (const r of results) {
    const isEmailResult = r.body.startsWith('Subject:')
    if (isEmailResult) {
      const docType = matchDocType(r)
      if (docType && !docs[docType]) {
        const pdfUrl = r.media_url && PDF_EXT.test(r.media_url) ? r.media_url : null
        docs[docType] = { result: r, pdfUrl }
      } else {
        conversations.push(r)
      }
    } else {
      conversations.push(r)
    }
  }

  // Extract key parties from matched documents
  let supplier: string | null = null
  let customer: string | null = null
  let transporter: string | null = null

  if (docs.purchase) {
    supplier = extractParty(docs.purchase.result.body, ['seller', 'supplier', 'vendor', 'leverancier', 'from:'])
      ?? docs.purchase.result.sender_name
  }
  if (docs.sales) {
    customer = extractParty(docs.sales.result.body, ['buyer', 'customer', 'client', 'klant', 'to:'])
  }
  if (docs.transport) {
    transporter = extractParty(docs.transport.result.body, ['transporter', 'carrier', 'trucker', 'vervoerder'])
      ?? docs.transport.result.sender_name
  }

  return { allResults: results, docs, supplier, customer, transporter, conversations }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PdfViewer({ url, filename }: { url: string; filename: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs font-mono text-sky-400 hover:text-sky-300 bg-sky-400/10 border border-sky-400/20 px-2 py-1 rounded transition-colors"
      >
        <FileIcon className="h-3 w-3" />
        {filename.replace(/_/g, ' ')}
        <span className="text-sky-400/50">{open ? '▲' : '▼ open'}</span>
      </button>
      {open && (
        <div className="mt-2">
          <iframe src={`${url}#toolbar=1`} className="w-full h-[640px] rounded border border-sky-500/30 bg-white" title={filename} />
          <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-mono text-sky-400 hover:underline">
            ↗ Open in new tab
          </a>
        </div>
      )}
    </div>
  )
}

function DocRow({ docType, match }: { docType: typeof DOC_TYPES[number]; match: DocMatch | null }) {
  const [showPreview, setShowPreview] = React.useState(false)
  const emailData = match ? getEmailPreview(match.result.body) : null
  const filename = match?.pdfUrl
    ? decodeURIComponent(match.pdfUrl.split('/').pop() ?? 'document.pdf')
    : null

  return (
    <div className={cn(
      'border rounded-lg px-4 py-3 transition-colors',
      match
        ? 'border-sky-500/30 bg-sky-950/10'
        : 'border-terminal-border/40 bg-terminal-dark/30'
    )}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {match
            ? <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
            : <Circle      className="h-4 w-4 text-terminal-border shrink-0" />
          }
          <span className={cn('text-sm font-mono font-medium', match ? 'text-terminal-text' : 'text-terminal-muted/50')}>
            {docType.label}
          </span>
        </div>
        {match && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-terminal-muted flex items-center gap-1">
              <Clock className="h-3 w-3" />{formatDate(match.result.timestamp)}
            </span>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs font-mono text-sky-400/70 hover:text-sky-400 flex items-center gap-1 transition-colors"
            >
              {showPreview ? <><ChevronUp className="h-3 w-3" /> hide</> : <><ChevronDown className="h-3 w-3" /> details</>}
            </button>
          </div>
        )}
      </div>

      {match && showPreview && emailData && (
        <div className="mt-3 pt-3 border-t border-terminal-border/30">
          <p className="text-xs font-mono text-terminal-muted mb-2">
            From: <span className="text-terminal-text">{match.result.sender_name}</span>
          </p>
          <p className="text-sm font-mono text-terminal-text/80 leading-relaxed whitespace-pre-wrap break-words">
            {emailData.previewLines.join('\n')}
          </p>
          {filename && match.pdfUrl && (
            <PdfViewer url={match.pdfUrl} filename={filename} />
          )}
        </div>
      )}
    </div>
  )
}

function ConversationBubble({ result }: { result: SearchResult }) {
  const [expanded, setExpanded] = React.useState(false)
  const isEmailResult = result.body.startsWith('Subject:')
  const emailData = isEmailResult ? getEmailPreview(result.body) : null
  const lines = isEmailResult && emailData
    ? (expanded ? emailData.fullLines : emailData.previewLines)
    : result.body.split('\n')
  const hasMore = isEmailResult && emailData && emailData.fullLines.length > 6

  return (
    <div className={cn(
      'border rounded-lg px-3 py-2.5 text-xs font-mono',
      isEmailResult
        ? 'border-sky-500/20 bg-sky-950/5'
        : 'border-terminal-border/40 bg-terminal-panel'
    )}>
      <div className="flex items-center gap-2 mb-1.5 text-[11px]">
        {isEmailResult
          ? <Mail className="h-3 w-3 text-sky-400 shrink-0" />
          : <MessageSquare className="h-3 w-3 text-terminal-accent shrink-0" />
        }
        <span className={cn('font-semibold', isEmailResult ? 'text-sky-400' : 'text-terminal-accent')}>
          {result.group_name}
        </span>
        <span className="text-terminal-border">·</span>
        <span className="text-terminal-muted">{result.sender_name}</span>
        <span className="text-terminal-border ml-auto">·</span>
        <span className="text-terminal-muted/60">{formatDate(result.timestamp)}</span>
      </div>
      <p className="text-terminal-text/80 leading-relaxed whitespace-pre-wrap break-words">
        {lines.join('\n')}
      </p>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex items-center gap-1 text-sky-400/60 hover:text-sky-400 transition-colors"
        >
          {expanded ? <><ChevronUp className="h-3 w-3" /> less</> : <><ChevronDown className="h-3 w-3" /> more</>}
        </button>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function OrderSearch() {
  const [orderNum, setOrderNum] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [orderData, setOrderData] = React.useState<OrderData | null>(null)
  const [searched, setSearched] = React.useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => { inputRef.current?.focus() }, [])

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault()
    const num = orderNum.trim().replace(/^PSE\s*/i, '')
    if (!num) return

    setLoading(true)
    try {
      const res = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: num, match_count: 50 }),
      })
      const data = await res.json()
      const results: SearchResult[] = data.results || []
      // Filter to results that actually mention the number
      const relevant = results.filter(r =>
        r.body.toLowerCase().includes(num.toLowerCase()) ||
        r.group_name.toLowerCase().includes(num.toLowerCase())
      )
      setOrderData(processResults(relevant))
      setSearched(num)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const foundDocCount = orderData
    ? DOC_TYPES.filter(dt => orderData.docs[dt.id] !== null).length
    : 0

  return (
    <div className="space-y-6">
      {/* Search input */}
      <form onSubmit={handleSearch}>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-mono text-terminal-muted font-bold">PSE</span>
            <Input
              ref={inputRef}
              value={orderNum}
              onChange={e => setOrderNum(e.target.value.replace(/^PSE\s*/i, ''))}
              placeholder="260245"
              className="pl-12 h-12 font-mono text-lg bg-terminal-panel border-terminal-border border-2 text-terminal-text placeholder:text-terminal-muted/40 focus:border-terminal-accent"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !orderNum.trim()}
            className="h-12 px-6 bg-terminal-accent text-terminal-dark font-mono font-bold hover:bg-terminal-accent/80"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-terminal-accent" />
          <span className="text-sm font-mono text-terminal-muted">Looking up PSE {orderNum}…</span>
        </div>
      )}

      {/* Results */}
      {!loading && orderData && (
        <>
          {/* Order header */}
          <div className="flex items-center gap-3 border-b border-terminal-border pb-4">
            <div className="h-10 w-10 bg-terminal-accent/20 rounded-lg flex items-center justify-center font-mono font-bold text-terminal-accent text-sm">
              #{searched}
            </div>
            <div>
              <h2 className="text-base font-mono font-bold text-terminal-text">PSE {searched}</h2>
              <p className="text-xs font-mono text-terminal-muted">
                {foundDocCount}/{DOC_TYPES.length} documents · {orderData.conversations.length} conversation{orderData.conversations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {orderData.allResults.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-terminal-muted font-mono text-sm">No records found for PSE {searched}</p>
            </div>
          ) : (
            <>
              {/* Key parties */}
              {(orderData.supplier || orderData.customer || orderData.transporter) && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Supplier', value: orderData.supplier },
                    { label: 'Customer', value: orderData.customer },
                    { label: 'Transporter', value: orderData.transporter },
                  ].map(({ label, value }) => (
                    <div key={label} className="border border-terminal-border/50 rounded-lg px-3 py-2.5 bg-terminal-panel">
                      <p className="text-[10px] font-mono text-terminal-muted uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-sm font-mono text-terminal-text truncate">
                        {value ?? <span className="text-terminal-muted/40 text-xs">—</span>}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Documents checklist */}
              <div>
                <h3 className="text-xs font-mono text-terminal-muted uppercase tracking-wide mb-3">Documents</h3>
                <div className="space-y-2">
                  {DOC_TYPES.map(dt => (
                    <DocRow key={dt.id} docType={dt} match={orderData.docs[dt.id]} />
                  ))}
                </div>
              </div>

              {/* Conversations */}
              {orderData.conversations.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono text-terminal-muted uppercase tracking-wide mb-3">
                    Conversations ({orderData.conversations.length})
                  </h3>
                  <div className="space-y-2">
                    {orderData.conversations
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map(r => <ConversationBubble key={r.id} result={r} />)
                    }
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && !orderData && (
        <div className="py-16 text-center">
          <div className="h-12 w-12 border-2 border-terminal-border rounded-lg flex items-center justify-center font-mono font-bold text-terminal-muted text-lg mx-auto mb-4">#</div>
          <p className="text-terminal-muted font-mono text-sm mb-2">Enter a PSE order number</p>
          <p className="text-terminal-muted/50 font-mono text-xs">
            See all documents, emails, and WhatsApp messages for that order
          </p>
        </div>
      )}
    </div>
  )
}
