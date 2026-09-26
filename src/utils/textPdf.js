/** Premium text PDF (Helvetica / WinAnsi) — no extra deps. */

function pdfEscape(str) {
  return String(str ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function toWinAnsi(str) {
  return String(str ?? '')
    .replace(/₹/g, 'INR ')
    .replace(/[·•]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/&amp;/g, '&')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '?')
}

function wrapLine(text, maxChars) {
  const words = toWinAnsi(text).split(/\s+/).filter(Boolean)
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > maxChars && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = next
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['']
}

/**
 * @param {{
 *   brand?: string,
 *   title: string,
 *   subtitle?: string,
 *   meta?: string[],
 *   sections?: { heading: string, rows: [string, string][] }[],
 *   rows?: [string, string][],
 *   footer?: string,
 * }} opts
 * @returns {Blob}
 */
export function buildTextPdf({
  brand = 'SENATE SPACE',
  title,
  subtitle = '',
  meta = [],
  sections = [],
  rows = [],
  footer = '',
}) {
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 48
  const contentWidth = pageWidth - margin * 2
  const labelWidth = 168
  const enc = new TextEncoder()

  /** @type {{ kind: string, text?: string, size?: number, bold?: boolean, label?: string, value?: string, h?: number }[]} */
  const items = []

  const pushSpacer = (h = 10) => items.push({ kind: 'spacer', h })
  const pushRule = () => items.push({ kind: 'rule', h: 14 })
  const pushText = (text, size = 11, bold = false, h) => {
    for (const line of wrapLine(text, 78)) {
      items.push({ kind: 'text', text: line, size, bold, h: h || size + 5 })
    }
  }
  const pushKv = (label, value) => {
    const labelLines = wrapLine(String(label || ''), 28)
    const valueLines = wrapLine(value == null || value === '' ? '-' : String(value), 52)
    const count = Math.max(labelLines.length, valueLines.length)
    for (let i = 0; i < count; i += 1) {
      items.push({
        kind: 'kv',
        label: labelLines[i] || '',
        value: valueLines[i] || '',
        h: 15,
      })
    }
  }

  items.push({ kind: 'banner', h: 52 })
  pushSpacer(18)
  pushText(title, 18, true)
  if (subtitle) {
    pushSpacer(4)
    pushText(subtitle, 11, false)
  }
  pushSpacer(6)
  for (const m of meta) {
    if (m) pushText(m, 10, false)
  }
  pushRule()

  const allSections =
    sections.length > 0
      ? sections
      : rows.length
        ? [{ heading: 'Details', rows }]
        : []

  for (const section of allSections) {
    pushSpacer(6)
    items.push({ kind: 'section', text: toWinAnsi(section.heading || 'Section'), h: 22 })
    pushSpacer(4)
    for (const [label, value] of section.rows || []) {
      pushKv(label, value)
    }
    pushSpacer(4)
  }

  if (footer) {
    pushRule()
    pushText(footer, 9, false)
  }

  // Paginate
  const pages = []
  let pageItems = []
  let y = pageHeight - margin

  const flush = () => {
    pages.push(pageItems)
    pageItems = []
    y = pageHeight - margin
  }

  for (const item of items) {
    const need = item.h || 14
    if (y - need < margin + 24) flush()
    pageItems.push({ ...item, y })
    y -= need
  }
  if (pageItems.length) flush()
  if (!pages.length) pages.push([])

  const objects = []
  const add = (body) => {
    objects.push(body)
    return objects.length
  }

  const fontRegular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  const pageIds = []
  const contentIds = []

  for (let p = 0; p < pages.length; p += 1) {
    const lines = pages[p]
    const ops = []

    for (const item of lines) {
      if (item.kind === 'banner') {
        // Charcoal header bar
        ops.push('0.07 0.07 0.09 rg')
        ops.push(`${margin} ${(item.y - 36).toFixed(2)} ${contentWidth.toFixed(2)} 42 re f`)
        // Gold accent line
        ops.push('0.78 0.65 0.38 rg')
        ops.push(`${margin} ${(item.y - 36).toFixed(2)} ${contentWidth.toFixed(2)} 2.5 re f`)
        ops.push('BT')
        ops.push('/F2 11 Tf')
        ops.push('1 1 1 rg')
        ops.push(`${(margin + 14).toFixed(2)} ${(item.y - 18).toFixed(2)} Td`)
        ops.push(`(${pdfEscape(toWinAnsi(brand))}) Tj`)
        ops.push('ET')
        continue
      }

      if (item.kind === 'rule') {
        ops.push('0.85 0.85 0.86 RG')
        ops.push('0.6 w')
        ops.push(`${margin} ${(item.y - 4).toFixed(2)} m ${(margin + contentWidth).toFixed(2)} ${(item.y - 4).toFixed(2)} l S`)
        continue
      }

      if (item.kind === 'spacer') continue

      if (item.kind === 'section') {
        ops.push('0.96 0.94 0.90 rg')
        ops.push(`${margin} ${(item.y - 14).toFixed(2)} ${contentWidth.toFixed(2)} 18 re f`)
        ops.push('BT')
        ops.push('/F2 10 Tf')
        ops.push('0.22 0.18 0.12 rg')
        ops.push(`${(margin + 10).toFixed(2)} ${(item.y - 9).toFixed(2)} Td`)
        ops.push(`(${pdfEscape(item.text)}) Tj`)
        ops.push('ET')
        continue
      }

      if (item.kind === 'kv') {
        ops.push('BT')
        ops.push('/F2 9 Tf')
        ops.push('0.35 0.35 0.38 rg')
        ops.push(`${margin.toFixed(2)} ${(item.y - 2).toFixed(2)} Td`)
        ops.push(`(${pdfEscape(item.label)}) Tj`)
        ops.push('/F1 10 Tf')
        ops.push('0.08 0.08 0.1 rg')
        ops.push(`${labelWidth.toFixed(2)} 0 Td`)
        ops.push(`(${pdfEscape(item.value)}) Tj`)
        ops.push('ET')
        // subtle separator
        ops.push('0.92 0.92 0.93 RG')
        ops.push('0.4 w')
        ops.push(`${margin} ${(item.y - 6).toFixed(2)} m ${(margin + contentWidth).toFixed(2)} ${(item.y - 6).toFixed(2)} l S`)
        continue
      }

      if (item.kind === 'text') {
        ops.push('BT')
        ops.push(`/${item.bold ? 'F2' : 'F1'} ${item.size || 11} Tf`)
        ops.push('0.08 0.08 0.1 rg')
        ops.push(`${margin.toFixed(2)} ${(item.y - 2).toFixed(2)} Td`)
        ops.push(`(${pdfEscape(item.text || '')}) Tj`)
        ops.push('ET')
      }
    }

    // Footer page number
    ops.push('BT')
    ops.push('/F1 8 Tf')
    ops.push('0.55 0.55 0.58 rg')
    ops.push(`${margin.toFixed(2)} 28 Td`)
    ops.push(`(${pdfEscape(`Senate Space · Confidential · Page ${p + 1} of ${pages.length}`)}) Tj`)
    ops.push('ET')

    const stream = ops.join('\n')
    contentIds.push(add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`))
  }

  const kids = []
  for (let i = 0; i < pages.length; i += 1) {
    const id = add(null)
    pageIds.push(id)
    kids.push(id)
  }

  const pagesId = add(null)

  for (let i = 0; i < pages.length; i += 1) {
    objects[pageIds[i] - 1] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> ` +
      `/Contents ${contentIds[i]} 0 R >>`
  }

  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${kids.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`

  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)

  const parts = ['%PDF-1.4\n']
  const xrefOffsets = [0]
  let offset = enc.encode(parts[0]).length

  for (let i = 0; i < objects.length; i += 1) {
    const chunk = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
    xrefOffsets.push(offset)
    parts.push(chunk)
    offset += enc.encode(chunk).length
  }

  const xrefStart = offset
  let xref = `xref\n0 ${objects.length + 1}\n`
  xref += '0000000000 65535 f \n'
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(xrefOffsets[i]).padStart(10, '0')} 00000 n \n`
  }
  parts.push(xref)
  parts.push(
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`,
  )

  return new Blob(parts, { type: 'application/pdf' })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
