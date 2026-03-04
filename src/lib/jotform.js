/**
 * Submit a form response to JotForm.
 *
 * JotForm API docs: https://api.jotform.com/docs
 * Authentication: apiKey query param
 * Endpoint: POST /form/{formId}/submissions
 *
 * Each field is submitted as submission[qid] = value
 */

const BASE_URL = import.meta.env.VITE_JOTFORM_BASE_URL || 'https://api.jotform.com'
const FORM_ID  = import.meta.env.VITE_JOTFORM_FORM_ID
const API_KEY  = import.meta.env.VITE_JOTFORM_API_KEY

/**
 * Build URLSearchParams from a flat { qid: value } map.
 *
 * JotForm field types:
 *   control_radio / textbox / textarea → submission[qid] = value  (string)
 *   control_checkbox                   → submission[qid][0] = v0, [1] = v1, …  (Array)
 *   control_widget (image picker)      → submission[qid] = label  (string: A/B/9999)
 *
 * Pass an Array for any checkbox field; strings for everything else.
 *
 * @param {Object} answers - { '204': 'Teacher Name', '211': ['安全'], '144': ['q1'] }
 */
function buildPayload(answers) {
  const params = new URLSearchParams()
  for (const [qid, value] of Object.entries(answers)) {
    if (Array.isArray(value)) {
      // control_checkbox: each selected option gets its own indexed key
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

/**
 * Submit answers to JotForm.
 * @param {Object} answers - flat map of { qid: value }
 * @returns {Promise<{ submissionId: string }>}
 */
export async function submitToJotform(answers) {
  if (!FORM_ID || !API_KEY) {
    throw new Error('JotForm credentials not configured (VITE_JOTFORM_FORM_ID / VITE_JOTFORM_API_KEY)')
  }

  const url = `${BASE_URL}/form/${FORM_ID}/submissions?apiKey=${API_KEY}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: buildPayload(answers).toString(),
  })

  const data = await res.json()
  if (data.responseCode !== 200) {
    throw new Error(`JotForm error ${data.responseCode}: ${data.message}`)
  }

  return { submissionId: data.content?.submissionID }
}
