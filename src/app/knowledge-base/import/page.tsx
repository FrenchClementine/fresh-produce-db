'use client'

import * as React from 'react'
import {
  Upload, FileText, CheckCircle, AlertCircle, Loader2,
  Image, Video, Music, FileIcon, Sticker, Info, ArrowLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'parsing' | 'uploading' | 'done' | 'error'

interface ImportResult {
  parsed: number
  skipped_duplicates: number
  has_media: number
  media_in_zip: number
  media_uploaded_to_storage: number
  storage_enabled: boolean
  media_breakdown: Record<string, number>
  embedded: number
  inserted: number
  errors: number
  message: string
}

// ── Media icon map ────────────────────────────────────────────────────────────

const MEDIA_ICONS: Record<string, React.ReactNode> = {
  image:    <Image   className="h-4 w-4 text-blue-400"   />,
  video:    <Video   className="h-4 w-4 text-purple-400" />,
  audio:    <Music   className="h-4 w-4 text-green-400"  />,
  document: <FileIcon className="h-4 w-4 text-orange-400" />,
  sticker:  <Sticker className="h-4 w-4 text-yellow-400" />,
  gif:      <Image   className="h-4 w-4 text-pink-400"   />,
  file:     <FileIcon className="h-4 w-4 text-terminal-muted" />,
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [file, setFile]           = React.useState<File | null>(null)
  const [groupName, setGroupName] = React.useState('')
  const [limit, setLimit]         = React.useState('')
  const [status, setStatus]       = React.useState<Status>('idle')
  const [result, setResult]       = React.useState<ImportResult | null>(null)
  const [errorMsg, setErrorMsg]   = React.useState('')
  const [isDragging, setIsDragging] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped && (dropped.name.endsWith('.txt') || dropped.name.endsWith('.zip'))) {
      setFile(dropped)
      // Auto-detect group name from filename: "_chat.txt" or "WhatsApp Chat with PSE Office.txt"
      const name = dropped.name
        .replace(/\.txt$/, '')
        .replace(/\.zip$/, '')
        .replace(/^WhatsApp Chat with\s*/i, '')
        .replace(/^WhatsApp Chat -\s*/i, '')
        .replace(/_chat$/, '')
        .trim()
      if (name && !groupName) setGroupName(name)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    const name = selected.name
      .replace(/\.txt$/, '')
      .replace(/\.zip$/, '')
      .replace(/^WhatsApp Chat with\s*/i, '')
      .replace(/^WhatsApp Chat -\s*/i, '')
      .replace(/_chat$/, '')
      .trim()
    if (name && !groupName) setGroupName(name)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !groupName.trim()) return

    setStatus('uploading')
    setResult(null)
    setErrorMsg('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('group_name', groupName.trim())
    if (limit) formData.append('limit', limit)

    try {
      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error || 'Import failed')
        return
      }

      setResult(data)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setErrorMsg(String(err))
    }
  }

  function reset() {
    setFile(null)
    setGroupName('')
    setLimit('')
    setStatus('idle')
    setResult(null)
    setErrorMsg('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isLoading = status === 'uploading' || status === 'parsing'

  return (
    <div className="min-h-screen bg-terminal-dark text-terminal-text">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Back link */}
        <Link
          href="/knowledge-base"
          className="inline-flex items-center gap-2 text-sm font-mono text-terminal-muted hover:text-terminal-accent mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Knowledge Base
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-mono font-bold text-terminal-text mb-1">
            Import WhatsApp Chat
          </h1>
          <p className="text-sm font-mono text-terminal-muted">
            Upload an exported chat to test the knowledge base before connecting the live scraper.
          </p>
        </div>

        {/* How to export — instructions */}
        <div className="mb-6 p-4 border border-terminal-border rounded-lg bg-terminal-panel">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-terminal-accent shrink-0" />
            <span className="text-sm font-mono font-semibold text-terminal-text">
              How to export from WhatsApp
            </span>
          </div>
          <ol className="text-xs font-mono text-terminal-muted space-y-1 ml-6 list-decimal">
            <li>Open WhatsApp on your phone → open the group chat</li>
            <li>Tap the group name at the top → scroll down → <strong className="text-terminal-text">Export Chat</strong></li>
            <li>
              Choose your export type:
              <ul className="mt-1 ml-4 space-y-1 list-disc">
                <li><strong className="text-terminal-text">Without Media</strong> — fast, text only. Media is recorded as <code className="text-terminal-accent">[image omitted]</code> etc.</li>
                <li><strong className="text-terminal-text">Include Media</strong> — creates a <code className="text-terminal-accent">.zip</code> with actual photos/videos/docs. Upload the zip and they get stored in Supabase Storage (requires <code>whatsapp-media</code> bucket).</li>
              </ul>
            </li>
            <li>Send the file to yourself (AirDrop, email, etc.) and upload it here</li>
          </ol>
          <p className="text-xs font-mono text-terminal-muted/60 mt-3">
            Both iOS and Android export formats are supported. Re-uploading the same file is safe — duplicates are skipped.
          </p>
        </div>

        {/* Upload form */}
        {status !== 'done' && (
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Drop zone */}
            <div>
              <Label className="text-sm font-mono text-terminal-muted mb-2 block">
                Chat export file <span className="text-terminal-alert">*</span>
              </Label>
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
                  isDragging
                    ? 'border-terminal-accent bg-terminal-accent/5'
                    : file
                      ? 'border-terminal-accent/50 bg-terminal-accent/5'
                      : 'border-terminal-border hover:border-terminal-accent/40'
                )}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.zip"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-8 w-8 text-terminal-accent" />
                    <div className="text-left">
                      <p className="font-mono text-sm text-terminal-text">{file.name}</p>
                      <p className="font-mono text-xs text-terminal-muted">
                        {(file.size / 1024).toFixed(0)} KB · click to change
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-terminal-muted mx-auto mb-3" />
                    <p className="font-mono text-sm text-terminal-text mb-1">
                      Drop your .txt file here, or click to browse
                    </p>
                    <p className="font-mono text-xs text-terminal-muted">
                      WhatsApp exported chat (.txt or .zip)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Group name */}
            <div>
              <Label htmlFor="group_name" className="text-sm font-mono text-terminal-muted mb-2 block">
                Group / Chat name <span className="text-terminal-alert">*</span>
              </Label>
              <Input
                id="group_name"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. PSE Office, PSE Greece Trade"
                className="font-mono bg-terminal-panel border-terminal-border text-terminal-text placeholder:text-terminal-muted/50"
              />
              <p className="text-xs font-mono text-terminal-muted/60 mt-1">
                This appears in search results to identify which group messages came from.
              </p>
            </div>

            {/* Limit (optional) */}
            <div>
              <Label htmlFor="limit" className="text-sm font-mono text-terminal-muted mb-2 block">
                Message limit <span className="text-terminal-muted/50">(optional)</span>
              </Label>
              <Input
                id="limit"
                type="number"
                min="100"
                max="50000"
                value={limit}
                onChange={e => setLimit(e.target.value)}
                placeholder="Leave empty to import all (most recent N if set)"
                className="font-mono bg-terminal-panel border-terminal-border text-terminal-text placeholder:text-terminal-muted/50"
              />
              <p className="text-xs font-mono text-terminal-muted/60 mt-1">
                For very large chats, set this to e.g. 5000 to import the most recent messages first.
              </p>
            </div>

            {/* Error */}
            {status === 'error' && (
              <div className="flex items-start gap-2 p-3 border border-terminal-alert/50 bg-terminal-alert/10 rounded">
                <AlertCircle className="h-4 w-4 text-terminal-alert shrink-0 mt-0.5" />
                <p className="text-sm font-mono text-terminal-alert">{errorMsg}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={!file || !groupName.trim() || isLoading}
              className="w-full h-11 bg-terminal-accent text-terminal-dark font-mono font-semibold hover:bg-terminal-accent/80 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing — this may take a minute for large chats...
                </span>
              ) : (
                'Import chat'
              )}
            </Button>
          </form>
        )}

        {/* Success result */}
        {status === 'done' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 border border-green-500/30 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-400 shrink-0" />
              <div>
                <p className="font-mono font-semibold text-green-400">Import complete</p>
                <p className="font-mono text-sm text-terminal-muted">{result.message}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="border border-terminal-border rounded-lg bg-terminal-panel divide-y divide-terminal-border">
              <div className="grid grid-cols-3 divide-x divide-terminal-border">
                {[
                  { label: 'Parsed',    value: result.parsed },
                  { label: 'Imported',  value: result.inserted },
                  { label: 'Duplicates skipped', value: result.skipped_duplicates },
                ].map(({ label, value }) => (
                  <div key={label} className="p-4 text-center">
                    <p className="text-2xl font-mono font-bold text-terminal-accent">{value.toLocaleString()}</p>
                    <p className="text-xs font-mono text-terminal-muted mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {result.has_media > 0 && (
                <div className="p-4 space-y-3">
                  <p className="text-xs font-mono text-terminal-muted uppercase tracking-wide">
                    Media detected ({result.has_media} messages)
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(result.media_breakdown).map(([type, count]) => (
                      <div key={type} className="flex items-center gap-2 bg-terminal-dark px-3 py-1.5 rounded border border-terminal-border">
                        {MEDIA_ICONS[type] || <FileIcon className="h-4 w-4 text-terminal-muted" />}
                        <span className="text-sm font-mono text-terminal-text">{count}</span>
                        <span className="text-xs font-mono text-terminal-muted">{type}</span>
                      </div>
                    ))}
                  </div>

                  {/* Storage upload status */}
                  {result.media_in_zip > 0 ? (
                    result.storage_enabled ? (
                      <div className="flex items-center gap-2 text-xs font-mono text-green-400">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        {result.media_uploaded_to_storage} media files uploaded to Supabase Storage
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-xs font-mono text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/20 rounded p-2">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>
                          Media files were in the zip but could not be uploaded.
                          Run <code className="text-terminal-accent">knowledge-base-storage.sql</code> in Supabase to create the <code>whatsapp-media</code> storage bucket, then re-import.
                        </span>
                      </div>
                    )
                  ) : (
                    <p className="text-xs font-mono text-terminal-muted/60">
                      Exported without media — types are detected from the chat text. Upload a zip with media for actual file storage.
                    </p>
                  )}
                </div>
              )}

              {result.errors > 0 && (
                <div className="p-4 flex items-center gap-2 text-terminal-alert">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p className="text-sm font-mono">{result.errors} messages failed to insert</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link href="/knowledge-base" className="flex-1">
                <Button className="w-full bg-terminal-accent text-terminal-dark font-mono hover:bg-terminal-accent/80">
                  Search the knowledge base
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={reset}
                className="font-mono border-terminal-border text-terminal-muted hover:text-terminal-text"
              >
                Import another
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
