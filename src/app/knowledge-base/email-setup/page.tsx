'use client'

import * as React from 'react'
import { Mail, CheckCircle, Copy, ExternalLink, ArrowLeft, Info } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = React.useState(false)

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative mt-2 mb-4">
      {label && (
        <div className="text-[10px] font-mono text-terminal-muted/60 uppercase tracking-wide mb-1">{label}</div>
      )}
      <div className="bg-terminal-dark border border-terminal-border rounded-lg p-3 pr-10 font-mono text-xs text-terminal-text whitespace-pre-wrap break-all">
        {code}
      </div>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded text-terminal-muted hover:text-terminal-accent transition-colors"
        title="Copy"
      >
        {copied
          ? <CheckCircle className="h-3.5 w-3.5 text-green-400" />
          : <Copy className="h-3.5 w-3.5" />
        }
      </button>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 mb-8">
      <div className="shrink-0 w-7 h-7 rounded-full bg-terminal-accent/20 border border-terminal-accent/40 flex items-center justify-center font-mono text-xs font-bold text-terminal-accent mt-0.5">
        {n}
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-mono font-semibold text-terminal-text mb-2">{title}</h3>
        <div className="text-sm font-mono text-terminal-muted leading-relaxed space-y-2">
          {children}
        </div>
      </div>
    </div>
  )
}

const appsScriptUrl = 'https://script.google.com/home'

export default function EmailSetupPage() {
  const [appUrl, setAppUrl] = React.useState('')
  const [secret, setSecret] = React.useState('')

  const scriptWithConfig = `// ── CONFIG ────────────────────────────────────────────────────────────────────
const CONFIG = {
  appUrl: '${appUrl || 'https://YOUR_APP_URL_HERE'}',
  ingestSecret: '${secret || 'your-ingest-secret-from-env'}',
  processedLabel: 'kb-processed',
  lookbackDays: 30,
  maxAttachmentMb: 10,
}
// ─────────────────────────────────────────────────────────────────────────────
// Paste the rest of the script from email-ingest.gs in your project`

  return (
    <div className="min-h-screen bg-terminal-dark text-terminal-text">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/knowledge-base"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-terminal-muted hover:text-terminal-accent mb-4"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Knowledge Base
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 bg-sky-400/20 rounded flex items-center justify-center">
              <Mail className="h-4 w-4 text-sky-400" />
            </div>
            <h1 className="text-xl font-mono font-bold text-terminal-text">Email Inbox Setup</h1>
          </div>
          <p className="text-sm font-mono text-terminal-muted ml-11">
            CC a Gmail address to log emails into your knowledge base — fully searchable with AI.
          </p>
        </div>

        {/* How it works */}
        <div className="mb-8 p-4 border border-terminal-border/50 rounded-lg bg-terminal-panel">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-3.5 w-3.5 text-terminal-accent shrink-0" />
            <span className="text-xs font-mono font-semibold text-terminal-accent uppercase tracking-wide">How it works</span>
          </div>
          <ol className="text-xs font-mono text-terminal-muted space-y-1.5 list-decimal ml-4">
            <li>You create a free Gmail address (e.g. <span className="text-terminal-text">pse.knowledge@gmail.com</span>)</li>
            <li>You CC that address on emails you want to log</li>
            <li>A free Google Apps Script checks the inbox every 5 minutes</li>
            <li>New emails (+ PDF/file attachments) are sent to your app and stored in Supabase</li>
            <li>Emails appear in search results with a <span className="text-sky-400">blue Email badge</span>, and the AI chat can answer questions about them</li>
          </ol>
        </div>

        {/* Config helper */}
        <div className="mb-8 p-4 border border-terminal-border/50 rounded-lg bg-terminal-panel">
          <p className="text-xs font-mono text-terminal-accent font-semibold uppercase tracking-wide mb-3">
            Enter your values (optional — helps generate the script config)
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono text-terminal-muted block mb-1">Your app URL</label>
              <input
                value={appUrl}
                onChange={e => setAppUrl(e.target.value)}
                placeholder="https://your-app.vercel.app"
                className="w-full bg-terminal-dark border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text placeholder:text-terminal-muted/40 focus:outline-none focus:border-terminal-accent"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-terminal-muted block mb-1">
                INGEST_SECRET <span className="text-terminal-muted/50">(from your .env.local)</span>
              </label>
              <input
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder="change-me-generate-a-random-secret"
                className="w-full bg-terminal-dark border border-terminal-border rounded px-3 py-2 text-sm font-mono text-terminal-text placeholder:text-terminal-muted/40 focus:outline-none focus:border-terminal-accent"
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <Step n={1} title="Create a dedicated Gmail account">
          <p>Go to <a href="https://accounts.google.com/signup" target="_blank" rel="noreferrer" className="text-terminal-accent hover:underline">accounts.google.com/signup</a> and create a new Gmail address.</p>
          <p className="text-terminal-muted/70">Suggestion: <span className="text-terminal-text">pse.knowledge@gmail.com</span> or similar.</p>
          <p>You'll use this address as a CC on office emails. It won't send any replies.</p>
        </Step>

        <Step n={2} title="Open Google Apps Script">
          <p>
            Sign in to that Gmail account, then go to{' '}
            <a href={appsScriptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-terminal-accent hover:underline">
              script.google.com <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <p>Click <span className="text-terminal-text font-semibold">+ New project</span>.</p>
        </Step>

        <Step n={3} title="Paste the script">
          <p>Delete all existing code, then paste the full contents of <span className="text-terminal-accent">email-ingest.gs</span> from your project.</p>
          <p>Update the CONFIG section at the top:</p>
          <CodeBlock code={scriptWithConfig} label="CONFIG preview" />
          <p className="text-terminal-muted/70">The full script is in <span className="text-terminal-text">email-ingest.gs</span> at the root of your project.</p>
        </Step>

        <Step n={4} title="Run once to grant permissions">
          <p>In the script editor, select the function <span className="text-terminal-text">checkNewEmails</span> from the dropdown, then click <span className="text-terminal-text font-semibold">▶ Run</span>.</p>
          <p>Google will ask you to authorise the script to access Gmail. Click <span className="text-terminal-text">Allow</span>.</p>
          <div className="p-2 bg-yellow-400/5 border border-yellow-400/20 rounded text-yellow-400/80 text-xs">
            If you see "This app isn't verified" — click <strong>Advanced</strong> → <strong>Go to [project name] (unsafe)</strong>. This is your own script on your own account.
          </div>
        </Step>

        <Step n={5} title="Set up the automatic trigger">
          <p>In the left sidebar, click the <span className="text-terminal-text">⏱ Triggers</span> icon (clock), then <span className="text-terminal-text font-semibold">+ Add Trigger</span>.</p>
          <div className="text-xs font-mono text-terminal-text bg-terminal-dark border border-terminal-border rounded p-3 space-y-1">
            <div><span className="text-terminal-muted">Function:</span> checkNewEmails</div>
            <div><span className="text-terminal-muted">Event source:</span> Time-driven</div>
            <div><span className="text-terminal-muted">Type:</span> Minutes timer</div>
            <div><span className="text-terminal-muted">Interval:</span> Every 5 minutes</div>
          </div>
          <p>Click <span className="text-terminal-text">Save</span>. The script will now run automatically.</p>
        </Step>

        <Step n={6} title="Start CC'ing emails">
          <p>On any email you want to log, add <span className="text-terminal-text">pse.knowledge@gmail.com</span> (your Gmail address) as a CC.</p>
          <p>Within 5 minutes it will appear in your knowledge base, searchable alongside WhatsApp messages.</p>
          <div className="p-2 bg-terminal-accent/5 border border-terminal-accent/20 rounded text-xs text-terminal-muted">
            <strong className="text-terminal-accent">Tip:</strong> You can also forward existing emails to the address. Or set up an auto-forward rule in your main inbox to automatically log all emails from certain senders.
          </div>
        </Step>

        {/* Test */}
        <div className="border border-terminal-border rounded-lg p-4 bg-terminal-panel">
          <p className="text-xs font-mono text-terminal-accent font-semibold uppercase tracking-wide mb-2">Test it manually</p>
          <p className="text-xs font-mono text-terminal-muted mb-2">
            In the Apps Script editor, run the <span className="text-terminal-text">testIngestLatest</span> function — it will ingest the most recent email in the inbox immediately.
          </p>
          <p className="text-xs font-mono text-terminal-muted">
            Then search for something from that email on the{' '}
            <Link href="/knowledge-base" className="text-terminal-accent hover:underline">Knowledge Base</Link> page.
            Email results appear with a blue <span className="text-sky-400">Email</span> badge.
          </p>
        </div>

      </div>
    </div>
  )
}
