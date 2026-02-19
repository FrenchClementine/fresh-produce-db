// Shared email body parsing utilities

const SIG_STRIP = [
  /^\[logo\]/i, /^\[banner\]/i, /^\[instagram\]/i, /^\[linkedin\]/i,
  /^\[twitter\]/i, /^\[facebook\]/i,
  /^www\./i, /^https?:\/\//i,
  /^T \+/i, /^M \+/i, /^F \+/i, /^Tel:/i, /^Mob:/i,
  /^─+/,
]

export function getEmailPreview(body: string) {
  const lines = body.split('\n')
  const subject = lines[0]?.replace(/^Subject:\s*/i, '').trim() ?? ''

  const attachmentNames: string[] = []
  for (const l of lines) {
    const m = l.match(/^── Attachment:\s*(.+?)\s*──$/)
    if (m) attachmentNames.push(m[1].trim())
  }

  let inAttachBlock = false
  const cleanLines: string[] = []
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i]
    if (/^── Attachment:/.test(l)) { inAttachBlock = true; continue }
    if (inAttachBlock) { if (!l.trim()) inAttachBlock = false; continue }
    if (SIG_STRIP.some(p => p.test(l.trim()))) continue
    cleanLines.push(l)
  }

  const quoteIdx = cleanLines.findIndex((l, i) =>
    i > 1 && /^(From:|-----Original|On .+ wrote:|_{10,}|________________________________)/.test(l.trim())
  )
  const mainLines = quoteIdx > 1 ? cleanLines.slice(0, quoteIdx) : cleanLines
  const trimmed = mainLines.join('\n').trim().split('\n')

  return { subject, previewLines: trimmed.slice(0, 6), fullLines: trimmed, attachmentNames }
}
