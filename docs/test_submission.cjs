/**
 * JotForm submission test script
 *
 * Validates that the app's submission payload is well-formed and optionally
 * posts a real test submission to JotForm.
 *
 * Usage:
 *   node docs/test_submission.cjs            # dry-run (no network call)
 *   node docs/test_submission.cjs --submit   # actually POST to JotForm
 *   node docs/test_submission.cjs --delete <submissionId>  # delete a test submission
 *
 * Run from repo root so that the .env file is resolved correctly.
 */

const fs   = require('fs')
const path = require('path')
const http = require('https')

// ── Load .env ─────────────────────────────────────────────────────────────────
// Try repo root relative to this script, then relative to cwd
const envPath = [
  path.join(__dirname, '..', '.env'),
  path.join(process.cwd(), '.env'),
].find(p => fs.existsSync(p))
const env = {}
if (envPath) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  })
  console.log('Loaded .env from:', envPath)
} else {
  console.warn('Warning: no .env file found')
}
const BASE_URL = env.VITE_JOTFORM_BASE_URL || 'https://api.jotform.com'
const FORM_ID  = env.VITE_JOTFORM_FORM_ID
const API_KEY  = env.VITE_JOTFORM_API_KEY

// ── Sample payload — mirrors exactly what App.jsx builds ──────────────────────
// imageLabel helper (same logic as App.jsx)
const imageLabel = (sel, correct) => (!sel || sel === 'N/A') ? '9999' : (correct ? 'A' : 'B')
const val        = (v)            => (v && v !== 'N/A')      ? v       : '9999'
const arr        = (a)            => a?.length               ? [...a]  : ['9999']
// NOTE: arr() returns an Array — buildPayload handles it with submission[qid][i] notation

// Simulate a completely filled-in form for student St10001 / class C-001-01
const answers = {
  // ── Admin (qids from ADMIN_QIDS) ─────────────────────────────────────────
  '204': 'Test Interviewer',           // interviewerName
  '212': 'Round II',                   // phase
  '207': '2026-03-04',                 // interviewDate
  '100': 'St10001',                    // studentId
  '58':  'Test Student',               // studentName
  '186': 'Test School',                // schoolName
  '201': 'C-001-01',                   // studentClass
  '213': 'Kowloon City',               // district

  // ── Feelings Q1–Q6 (qids from FEELINGS_QUESTIONS) ────────────────────────
  // Q1a–Q4a: control_radio  → plain string
  // Q5a, Q6a: control_checkbox (single-select) → Array with one element
  // QXb follow-ups: control_checkbox (multi-select) → Array
  '16':  val('🙂'),                               // Q1a radio
  '144': arr(['係乜嘢令到你開心？']),               // Q1b checkbox  → [option]
  '105': val('No observation'),                   // Q1c textarea

  '24':  val('😃'),  '148': arr([]),    '106': val(''),
  '25':  val('🙂'),  '149': arr([]),    '112': val(''),
  '26':  val('😐'),  '150': arr([]),    '116': val(''),

  // Q5a: control_checkbox, options: 安全|不安全
  '211': [val('安全')],   '151': arr([]),  '120': val(''),
  // Q6a: control_checkbox, options: 有|沒有
  '209': [val('有')],     '152': arr([]),  '124': val(''),

  // ── Memory Q7–Q8 ──────────────────────────────────────────────────────────
  '187': val('2'),                     // Q7 textbox
  '127': val('玩過積木同扮演遊戲'),     // Q8 textarea

  // ── Image blocks (set 1 only — sets 2–8 have null qids, skipped) ──────────
  // Correct image selected for batch1 and batch4; wrong for batch2; N/A for batch3
  '35':  imageLabel('KC-01_Q1a.jpg', true),   // batch1 → 'A' (correct)
  '38':  imageLabel('KC-01_Q1f.jpg', false),  // batch2 → 'B' (wrong)
  '36':  imageLabel('N/A', false),             // batch3 → '9999' (N/A)
  '217': imageLabel('KC-01_Q1m.jpg', true),   // batch4 → 'A' (correct)

  // ── Closing ───────────────────────────────────────────────────────────────
  // Q11a (160): control_checkbox → Array
  '160': arr(['你仲想唔想再嚟童亮館？', '點解你想再嚟？']),  // Q11a follow-up
  '43':  val('Child seemed tired but cooperative'),          // Q11b observation
}

// ── Build URLSearchParams (mirrors jotform.js buildPayload) ─────────────────
function buildPayload(answers) {
  const params = new URLSearchParams()
  for (const [qid, value] of Object.entries(answers)) {
    if (Array.isArray(value)) {
      // control_checkbox: indexed notation submission[qid][0], [1], ...
      value.forEach((v, i) => {
        if (v !== null && v !== undefined && v !== '') {
          params.append(`submission[${qid}][${i}]`, v)
        }
      })
    } else if (value !== null && value !== undefined && value !== '') {
      params.append(`submission[${qid}]`, value)
    }
  }
  return params
}

// ── Validation checks ─────────────────────────────────────────────────────────
const issues = []

// 1. All image picker values must be A, B, C, D, N/A, or 9999 — never a URL
for (const [qid, v] of Object.entries(answers)) {
  if (['35','38','36','217','161','164','167','220'].includes(qid)) {
    if (v && !['A','B','C','D','N/A','9999'].test?.(v) && /https?:\/\/|\/assets\//.test(v)) {
      issues.push(`qid ${qid}: image picker contains raw URL instead of label: ${v}`)
    }
  }
}

// 2. All expected qids present
const REQUIRED = ['204','212','207','100','58','186','201','213',
  '16','144','105','24','148','106','25','149','112','26','150','116',
  '211','151','120','209','152','124','187','127','160','43']
for (const qid of REQUIRED) {
  if (!(qid in answers)) issues.push(`qid ${qid}: MISSING from answers`)
}

// 3. No undefined values
for (const [qid, v] of Object.entries(answers)) {
  if (v === undefined || v === null) issues.push(`qid ${qid}: value is ${v}`)
}

// ── Print dry-run summary ─────────────────────────────────────────────────────
console.log('\n=== SUBMISSION DRY-RUN ===\n')
console.log(`Endpoint : POST ${BASE_URL}/form/${FORM_ID}/submissions`)
console.log(`Auth     : apiKey=${API_KEY ? API_KEY.slice(0,6) + '...' : 'NOT SET'}\n`)
console.log('\nPayload fields (as sent to API):')
const builtParams = buildPayload(answers)
for (const [k, v] of builtParams.entries()) {
  const display = v.length > 60 ? v.slice(0, 57) + '...' : v
  console.log(`  ${k.padEnd(28)} = ${display}`)
}
console.log(`\nTotal URLSearchParams entries: ${[...builtParams.entries()].length}`)

if (issues.length) {
  console.log('\n⚠ ISSUES FOUND:')
  issues.forEach(i => console.log(' ', i))
} else {
  console.log('\n✓ Payload validation passed')
}

// ── DELETE mode ───────────────────────────────────────────────────────────────
const deleteIdx = process.argv.indexOf('--delete')
if (deleteIdx !== -1) {
  const submissionId = process.argv[deleteIdx + 1]
  if (!submissionId) { console.error('Usage: --delete <submissionId>'); process.exit(1) }
  const url = new URL(`${BASE_URL}/submission/${submissionId}`)
  url.searchParams.set('apiKey', API_KEY)
  console.log(`\nDeleting submission ${submissionId}...`)
  const req = http.request(url, { method: 'DELETE' }, res => {
    let body = ''
    res.on('data', d => body += d)
    res.on('end', () => {
      const j = JSON.parse(body)
      if (j.responseCode === 200) console.log('✓ Deleted:', j.message)
      else console.error('✗ Error:', j.responseCode, j.message)
    })
  })
  req.on('error', e => console.error('Request failed:', e.message))
  req.end()
  return
}

// ── SUBMIT mode ───────────────────────────────────────────────────────────────
if (!process.argv.includes('--submit')) {
  console.log('\nDry-run only. Pass --submit to POST to JotForm.')
  process.exit(0)
}

if (!FORM_ID || !API_KEY) {
  console.error('\n✗ Missing VITE_JOTFORM_FORM_ID or VITE_JOTFORM_API_KEY in .env')
  process.exit(1)
}

const body    = buildPayload(answers).toString()
const url     = new URL(`${BASE_URL}/form/${FORM_ID}/submissions`)
url.searchParams.set('apiKey', API_KEY)

console.log('\nPOSTing to JotForm...')
const req = http.request(url, {
  method: 'POST',
  headers: {
    'Content-Type':   'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(body),
  },
}, res => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => {
    try {
      const j = JSON.parse(data)
      if (j.responseCode === 200) {
        const sid = j.content?.submissionID
        console.log(`\n✓ Submission created! submissionID: ${sid}`)
        console.log(`  View: https://www.jotform.com/edit/${sid}`)
        console.log(`\nTo delete this test submission:`)
        console.log(`  node docs/test_submission.cjs --delete ${sid}`)
      } else {
        console.error(`\n✗ JotForm error ${j.responseCode}: ${j.message}`)
        if (j.content) console.error('  Detail:', JSON.stringify(j.content, null, 2))
      }
    } catch (e) {
      console.error('\n✗ Failed to parse response:', data)
    }
  })
})
req.on('error', e => console.error('Request failed:', e.message))
req.write(body)
req.end()
