import fs from 'node:fs/promises'
import path from 'node:path'
import { auditSchema } from './check_schema.js'

function parseDotEnv(text) {
  const values = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')
    values[key] = value
  }
  return values
}

async function loadCredentials(envPath = '.env') {
  const envText = await fs.readFile(envPath, 'utf8')
  const env = parseDotEnv(envText)
  const baseUrl = env.VITE_JOTFORM_BASE_URL || 'https://api.jotform.com'
  const formId = env.VITE_JOTFORM_FORM_ID
  const apiKey = env.VITE_JOTFORM_API_KEY

  if (!formId || !apiKey) {
    throw new Error('Missing VITE_JOTFORM_FORM_ID or VITE_JOTFORM_API_KEY in .env')
  }

  return { baseUrl, formId, apiKey }
}

async function fetchQuestions({ baseUrl, formId, apiKey }) {
  const url = new URL(`/form/${formId}/questions`, baseUrl)
  url.searchParams.set('apiKey', apiKey)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`JotForm request failed: ${response.status} ${response.statusText}`)
  }

  const json = await response.json()
  if (json.responseCode !== 200) {
    throw new Error(`JotForm error ${json.responseCode}: ${json.message}`)
  }

  return json
}

async function main() {
  const outputPath = process.argv[2] || path.join('docs', 'jotform-schema.json')
  const credentials = await loadCredentials()
  const schema = await fetchQuestions(credentials)

  await fs.writeFile(outputPath, JSON.stringify(schema, null, 2) + '\n', 'utf8')
  console.log(`Updated ${outputPath} from live JotForm form ${credentials.formId}`)

  const report = auditSchema(schema)
  if (report.fail > 0 || report.uncoveredQFields.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})