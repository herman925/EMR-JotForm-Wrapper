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
// imageChar helper (same logic as App.jsx) — extracts the filename letter (a–p) or '9999'
// Extension is optional: stems like 'KC-01_Q1a' and paths like 'KC-01_Q1a.jpg' both work.
const imageChar = (filename) => {
  if (!filename || filename === 'N/A') return '9999'
  const m = filename.match(/_Q\d+([a-p])(?:\.[^./]*)?$/i)
  return m ? m[1] : '9999'
}
const val        = (v)            => (v && v !== 'N/A')      ? v       : '9999'
const arr        = (a)            => a?.length               ? [...a]  : []
// NOTE: arr() returns an Array — buildPayload handles it with submission[qid][i] notation
// Empty arrays are skipped by buildPayload (no field sent = leave blank in JotForm)

// Simulate a completely filled-in form for student St10001 / class C-001-01
// Every field has a real, non-empty answer to verify full-house qid coverage.
const answers = {
  // ── Admin ────────────────────────────────────────────────────────────────
  '204': 'Test Interviewer',
  '212': 'Round II',
  '207': '2026-03-04',
  '100': 'St10001',
  '58':  'Test Student',
  '186': 'Test School',
  '201': 'C-001-01',
  '213': '九龍城',

  // ── Feelings Q1–Q6 ───────────────────────────────────────────────────────
  // Q1a–Q4a: control_radio; Q5a/Q6a: control_checkbox (single-select)
  // QXb: control_checkbox (multi-select); QXc: textarea
  '16':  val('🙂'),
  '144': arr(['係乜嘢令到你開心/唔開心？（根據幼兒上一題的回答提問）']),
  '105': val('Child smiled throughout Q1'),

  '24':  val('😃'),
  '148': arr(['同朋友喺呢度玩嘅時候，邊樣嘢最好玩？', '你仲想喺呢度同朋友玩啲咩新遊戲？']),
  '106': val('Very enthusiastic about peer play'),

  '25':  val('🙂'),
  '149': arr(['點解你鐘意/唔鐘意玩嗰個玩具/設施？', '你希望童亮館有啲咩玩？']),
  '112': val('Pointed to the climbing frame'),

  '26':  val('😃'),
  '150': arr(['點解你鐘意/唔鐘意嗰啲活動？', '你覺得最好玩嘅活動係咩？']),
  '116': val('Mentioned the group singing activity'),

  '211': [val('安全')],
  '151': arr(['（若幼兒回答安全）有冇啲乜嘢令你感到安全？']),
  '120': val('Child said the teachers make her feel safe'),

  '209': [val('有')],
  '152': arr(['（若幼兒回答係肯定）佢哋係點樣幫助你架？']),
  '124': val('Child described a staff member helping with a puzzle'),

  // ── Memory Q7–Q8 ─────────────────────────────────────────────────────────
  '187': val('3'),
  '127': val('玩過積木、扮演遊戲同唱歌'),

  // ── Image blocks — Set 1 (Q9) ─────────────────────────────────────────────
  '226': imageChar('KC-01_Q1a.jpg'),    // Q9.1a batch1 → 'a' (correct scene)
  '225': imageChar('KC-01_Q1f.jpg'),    // Q9.2a batch2 → 'f' (wrong staff)
  '227': imageChar('KC-01_Q1i.jpg'),    // Q9.3a batch3 → 'i' (correct)
  '228': imageChar('KC-01_Q1m.jpg'),    // Q9.4a batch4 → 'm' (correct)
  '153': arr(['可唔可以講下你喺呢個場景度做過啲咩？']),
  '157': val('Child recalled climbing the wall confidently'),
  '155': arr(['你記得你哋一起做咗啲咩嗎？', '嗰陣你覺得點呀？']),
  '158': val('Child pointed at teacher and smiled'),
  '159': val('Brief hesitation before selecting'),
  '218': val('Child was decisive on batch 4'),

  // ── Image blocks — Set 2 (Q10) ────────────────────────────────────────────
  '229': imageChar('KC-01_Q2a.jpg'),    // Q10.1a batch1 → 'a' (correct scene)
  '230': imageChar('KC-01_Q2e.jpg'),    // Q10.2a batch2 → 'e' (correct staff)
  '231': imageChar('KC-01_Q2j.jpg'),    // Q10.3a batch3 → 'j' (wrong)
  '232': imageChar('KC-01_Q2n.jpg'),    // Q10.4a batch4 → 'n' (wrong)
  '202': arr(['可唔可以講下你喺呢個場景度做過啲咩？']),
  '163': val('Child recognised the art room immediately'),
  '165': arr(['你記得你哋一起做咗啲咩嗎？', '嗰陣你覺得點呀？']),
  '166': val('Child named the teacher correctly'),
  '169': val('Took a moment then chose the wrong one'),
  '221': val('Child seemed unsure on batch 4'),

  // ── Closing ──────────────────────────────────────────────────────────────
  '160': arr(['你仲想唔想再嚟童亮館？', '點解你想再嚟？']),
  '43':  val('Child was engaged throughout; seemed comfortable and eager'),
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
  '211','151','120','209','152','124','187','127',
  // Image set 1 (Q9) pickers + per-batch follow-up/observation
  '226','225','227','228','153','157','155','158','159','218',
  // Image set 2 (Q10) pickers + per-batch follow-up/observation
  '229','230','231','232','202','163','165','166','169','221',
  // Closing
  '160','43']
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
