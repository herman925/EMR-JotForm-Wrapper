import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const WRAPPER_QIDS = {
  'interviewerName': '204',
  'phase': '212',
  'interviewDate': '207',
  'studentId': '100',
  'studentName': '58',
  'schoolName': '186',
  'studentClass': '201',
  'district': '213',

  'q1a': '16', 'q1b': '144', 'q1c': '105',
  'q2a': '24', 'q2b': '148', 'q2c': '106',
  'q3a': '25', 'q3b': '149', 'q3c': '112',
  'q4a': '26', 'q4b': '150', 'q4c': '116',
  'q5a': '211', 'q5b': '151', 'q5c': '120',
  'q6a': '209', 'q6b': '152', 'q6c': '124',
  'q7': '187',
  'q8': '127',

  'q9.1a': '226', 'q9.1b': '153', 'q9.1c': '157',
  'q9.2a': '225', 'q9.2b': '155', 'q9.2c': '158',
  'q9.3a': '227', 'q9.3b': '159',
  'q9.4a': '228', 'q9.4b': '218',

  'q10.1a': '229', 'q10.1b': '202', 'q10.1c': '163',
  'q10.2a': '230', 'q10.2b': '165', 'q10.2c': '166',
  'q10.3a': '231', 'q10.3b': '169',
  'q10.4a': '232', 'q10.4b': '221',

  'q11a': '160',
  'q11b': '43',
}

const WRAPPER_IMAGE_PICKER_STORAGE_QIDS = new Set([
  '225', '226', '227', '228',
  '229', '230', '231', '232',
])

const STRUCTURAL_TYPES = new Set(['control_head', 'control_pagebreak', 'control_button'])
const __filename = fileURLToPath(import.meta.url)

export function loadSchema(schemaPath = 'docs/jotform-schema.json') {
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'))
}

function shortText(value) {
  return (value || '').replace(/\r?\n/g, ' ').trim()
}

function typeLabel(q) {
  return (q?.type || 'missing').replace('control_', '')
}

function wrapperFieldLabel(qid, q) {
  if (WRAPPER_IMAGE_PICKER_STORAGE_QIDS.has(String(qid))) {
    return `${typeLabel(q)} <- wrapper-image-picker`
  }
  return typeLabel(q)
}

function printCoverage(qs, label, qid) {
  const q = qs[qid]
  if (!q) {
    console.log('MISSING  ' + qid.padEnd(6) + ' ' + label)
    return false
  }

  console.log('OK       ' + qid.padEnd(6) + ' [' + wrapperFieldLabel(qid, q).padEnd(32) + '] ' + shortText(q.text).slice(0, 90))
  return true
}

export function auditSchema(schema, { verbose = true } = {}) {
  const qs = schema.content || {}
  const wrapperQids = new Set(Object.values(WRAPPER_QIDS))
  const qFields = Object.values(qs)
    .filter(q => /^Q\d+/i.test(shortText(q.text)))
    .sort((a, b) => Number(a.order) - Number(b.order))

  const uncoveredQFields = qFields.filter(q => !wrapperQids.has(String(q.qid)))
  const unusedNonStructural = Object.values(qs)
    .filter(q => !wrapperQids.has(String(q.qid)) && !STRUCTURAL_TYPES.has(q.type))
    .sort((a, b) => Number(a.order) - Number(b.order))

  let ok = 0
  let fail = 0

  if (verbose) console.log('=== WRAPPER COVERAGE CHECK ===\n')
  for (const [label, qid] of Object.entries(WRAPPER_QIDS)) {
    if (verbose) {
      if (printCoverage(qs, label, qid)) ok++
      else fail++
    } else if (qs[qid]) {
      ok++
    } else {
      fail++
    }
  }

  if (verbose) {
    console.log('\n=== ALL Qxxx FIELDS IN SCHEMA ===')
    qFields.forEach(q => {
      console.log('  qid=' + String(q.qid).padEnd(6) + ' order=' + String(q.order).padEnd(4) + ' [' + wrapperFieldLabel(q.qid, q).padEnd(32) + '] ' + shortText(q.text))
    })

    console.log('\n=== Qxxx FIELDS IN SCHEMA BUT NOT COVERED BY WRAPPER ===')
    uncoveredQFields.forEach(q => {
      console.log('  qid=' + String(q.qid).padEnd(6) + ' [' + wrapperFieldLabel(q.qid, q).padEnd(32) + '] ' + shortText(q.text))
    })

    console.log('\n=== SUSPECTED Q9/Q10 FIELDS ===')
    ;[
      ['q9.1a', '226'],
      ['q9.1b', '153'],
      ['q9.1c', '157'],
      ['q9.3a', '227'],
      ['q9.3b', '159'],
      ['q9.4a', '228'],
      ['q9.4b', '218'],
      ['q10.1a', '229'],
      ['q10.1b', '202'],
      ['q10.1c', '163'],
      ['q10.2a', '230'],
      ['q10.2b', '165'],
      ['q10.2c', '166'],
    ].forEach(([label, qid]) => {
      const q = qs[qid]
      console.log('  ' + label.padEnd(7) + ' qid=' + qid.padEnd(6) + ' status=' + (q ? 'present' : 'missing') + (q ? ' kind=' + wrapperFieldLabel(qid, q) + ' text=' + shortText(q.text) : ''))
    })

    console.log('\n=== NON-STRUCTURAL FIELDS IN SCHEMA NOT USED BY WRAPPER ===')
    unusedNonStructural.forEach(q => {
      console.log('  qid=' + String(q.qid).padEnd(6) + ' [' + wrapperFieldLabel(q.qid, q).padEnd(32) + '] ' + shortText(q.text))
    })

    console.log('\nResult: ' + ok + ' matched, ' + fail + ' missing from schema')
  }

  return {
    ok,
    fail,
    totalQFields: qFields.length,
    uncoveredQFields: uncoveredQFields.map(q => ({ qid: String(q.qid), type: q.type, text: shortText(q.text) })),
    unusedNonStructural: unusedNonStructural.map(q => ({ qid: String(q.qid), type: q.type, text: shortText(q.text) })),
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const schemaPath = process.argv[2] || 'docs/jotform-schema.json'
  const schema = loadSchema(schemaPath)
  auditSchema(schema)
}
