import { useState, useEffect } from 'react'
import ProgressBar from './components/ProgressBar'
import StudentLookup from './components/StudentLookup'
import AdminFields from './components/AdminFields'
import EmojiRating from './components/EmojiRating'
import FollowUpCheckbox from './components/FollowUpCheckbox'
import ObservationBox from './components/ObservationBox'
import ImageBlock from './components/ImageBlock'
import { FEELINGS_QUESTIONS, MEMORY_QUESTIONS, CLOSING_QUESTIONS, SECTION_LABELS, ADMIN_QIDS, IMAGE_BLOCK_QIDS } from './constants/questions'
import { useClassConfig } from './hooks/useClassConfig'
import { submitToJotform } from './lib/jotform'
import { saveToSupabase } from './lib/supabase'

// Section indices: 0=student  1=admin(page)  2=feelings  3=memory  4=images  5=done
const DONE = 5
// DOM ids for the three scrollable survey sections (admin is a separate page now)
const SECTION_IDS = ['section-2', 'section-3', 'section-4']

export default function App() {
  const [section, setSection]               = useState(0)
  const [student, setStudent]               = useState(null)
  const [config, setConfig]                 = useState(null)
  const [schoolClasses, setSchoolClasses]   = useState([])
  const [surveyReady, setSurveyReady]       = useState(false)  // false | 'loading' | true
  const [adminTouched, setAdminTouched]     = useState(false)  // triggers red highlights
  const [adminValues, setAdminValues]       = useState({})
  const [feelingsValues, setFeelingsValues] = useState({})
  const [memoryValues, setMemoryValues]     = useState({})
  const [imageValues, setImageValues]       = useState({})
  const [closingValues, setClosingValues]   = useState({ asked: [], observation: '' })
  const [submitState, setSubmitState]       = useState(null) // null | 'loading' | 'success' | 'error'
  const [submitError, setSubmitError]       = useState(null)

  const { getConfig } = useClassConfig()

  // ── Scroll-based progress detection ──────────────────────────────────────
  // Only active once the survey is revealed (surveyReady === true).
  // Starts counting from section 2 to match the new section numbering.
  useEffect(() => {
    if (!student || surveyReady !== true) return

    const onScroll = () => {
      const threshold = window.innerHeight * 0.4
      let active = 2
      for (let i = 0; i < SECTION_IDS.length; i++) {
        const el = document.getElementById(SECTION_IDS[i])
        if (el && el.getBoundingClientRect().top <= threshold) active = i + 2
      }
      setSection(s => s === DONE ? s : active)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [!!student, surveyReady]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleStudentResolved({ student, config, schoolClasses }) {
    setStudent(student)
    setConfig(config)
    setSchoolClasses(schoolClasses ?? [])
    setAdminValues({ studentNameOverride: student.studentName ?? '' })
    setSurveyReady(false)
    setAdminTouched(false)
    setSection(1)
  }

  async function handleClassChange(newClassId) {
    const newConfig = await getConfig(newClassId)
    setConfig(newConfig)
  }

  async function handleContinue() {
    if (!adminReady) {
      setAdminTouched(true)
      return
    }

    setSurveyReady('loading')

    // Re-fetch config for the active class (handles dropdown override)
    const activeClassId = adminValues.classIdOverride || student.classId
    const freshConfig = await getConfig(activeClassId)
    if (freshConfig) setConfig(freshConfig)

    // Minimum 1-second loading screen so the transition feels intentional
    await new Promise(r => setTimeout(r, 1000))

    setSurveyReady(true)
    setSection(2)
    // Scroll to top after the survey renders
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
  }

  function setImageBlockValue(blockIndex, key, value) {
    setImageValues(prev => ({
      ...prev,
      [blockIndex]: { ...(prev[blockIndex] ?? {}), [key]: value },
    }))
  }

  async function handleSubmit() {
    setSubmitState('loading')
    setSubmitError(null)

    const answers = {}

    answers[ADMIN_QIDS.interviewerName] = adminValues.interviewerName ?? ''
    answers[ADMIN_QIDS.phase]           = adminValues.phase ?? ''
    answers[ADMIN_QIDS.interviewDate]   = adminValues.interviewDate ?? ''
    answers[ADMIN_QIDS.studentId]       = student.studentId
    answers[ADMIN_QIDS.studentName]     = adminValues.studentNameOverride || student.studentName
    answers[ADMIN_QIDS.schoolName]      = student.schoolName
    answers[ADMIN_QIDS.studentClass]    = adminValues.classIdOverride || student.classId
    answers[ADMIN_QIDS.district]        = student.district

    for (const q of FEELINGS_QUESTIONS) {
      if (feelingsValues[q.key])                 answers[q.qid]           = feelingsValues[q.key]
      if (feelingsValues[q.followUpKey]?.length) answers[q.followUpQid]   = feelingsValues[q.followUpKey].join(', ')
      if (feelingsValues[q.observationKey])      answers[q.observationQid] = feelingsValues[q.observationKey]
    }

    if (memoryValues.q7) answers[MEMORY_QUESTIONS.q7.qid] = memoryValues.q7
    if (memoryValues.q8) answers[MEMORY_QUESTIONS.q8.qid] = memoryValues.q8

    for (const block of config?.blocks ?? []) {
      const v = imageValues[block.index] ?? {}
      const sceneQid = IMAGE_BLOCK_QIDS.scene[block.index]
      const staffQid = IMAGE_BLOCK_QIDS.staff[block.index]
      if (sceneQid && v.sceneSelected) answers[sceneQid] = v.sceneSelected
      if (staffQid && v.staffSelected) answers[staffQid] = v.staffSelected
    }

    const payload = {
      student, config: { classId: config?.classId, sessionId: config?.sessionId },
      admin: adminValues, feelings: feelingsValues, memory: memoryValues,
      images: imageValues, closing: closingValues,
      submittedAt: new Date().toISOString(),
    }

    let jotformId = null
    let jotformError = null

    try {
      const result = await submitToJotform(answers)
      jotformId = result.submissionId
    } catch (err) {
      jotformError = err.message
    }

    try {
      await saveToSupabase({
        studentId: student.studentId,
        classId:   adminValues.classIdOverride || student.classId,
        sessionId: config?.sessionId,
        jotformId,
        payload,
      })
    } catch (err) {
      if (jotformError) {
        setSubmitState('error')
        setSubmitError(`JotForm: ${jotformError}\nSupabase: ${err.message}`)
        return
      }
      console.warn('Supabase backup failed:', err.message)
    }

    if (jotformError && !jotformId) {
      setSubmitState('error')
      setSubmitError(jotformError)
      return
    }

    setSubmitState('success')
    setSection(DONE)
  }

  const adminReady = adminValues.interviewerName && adminValues.interviewDate && adminValues.phase

  // ── Progress bar mapping ──────────────────────────────────────────────────
  // section 1 (admin page) → current 0 → '基本資料'
  // section 2 (feelings)   → current 1 → '感受'
  // section 3 (memory)     → current 2 → '記憶'
  // section 4 (images)     → current 3 → '圖片'
  // DONE                   → bar hidden, show done card
  const progressCurrent = section - 1

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-100 px-4 pt-safe-top pb-2 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-2">

          <img
            src={import.meta.env.BASE_URL + 'assets/logos/KS.png'}
            alt="KeySteps"
            className="h-12 w-12 object-contain shrink-0"
          />

          {/* Title — hides subtitle on small screens to reclaim space */}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-xs sm:text-sm leading-tight text-navy">聽孩子說「童亮館」故事：幼兒活動回憶與學習發展探究 第二輪</h1>
            <p className="hidden sm:block text-slate-400 text-xs">Event-Based Memory Test · Round II</p>
          </div>

          {/* Student info pill — compact: name / classId·sessionId / district */}
          {student && (
            <div className="text-right shrink-0 max-w-[140px]">
              <p className="text-xs font-bold text-navy leading-tight truncate">
                {student.studentName || student.studentId}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight truncate">
                {adminValues.classIdOverride || student.classId}
                {config?.sessionId && (
                  <span className="text-orange"> · {config.sessionId}</span>
                )}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight truncate">{student.district}</p>
            </div>
          )}
        </div>

        {/* Progress bar — shown during admin page and scroll survey, not on done */}
        {section > 0 && section < DONE && (
          <div className="max-w-3xl mx-auto mt-1">
            <ProgressBar current={progressCurrent} total={SECTION_LABELS.length} labels={SECTION_LABELS} />
          </div>
        )}
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-4 py-4 pb-24 space-y-4">

        {/* Section 0: Student lookup */}
        {section === 0 && (
          <StudentLookup onResolved={handleStudentResolved} />
        )}

        {/* Section 1: Admin — shown alone as its own "page" */}
        {section === 1 && student && surveyReady !== true && (
          <>
            {surveyReady === 'loading' ? (
              /* ── Loading screen ── */
              <div className="section-card text-center py-16">
                <div className="text-4xl mb-4 animate-spin inline-block">⏳</div>
                <p className="text-navy font-semibold text-sm">載入班別資料中…</p>
                <p className="text-slate-400 text-xs mt-1">正在讀取 {adminValues.classIdOverride || student.classId} 的圖片題設定</p>
              </div>
            ) : (
              <>
                <AdminFields
                  student={student}
                  values={adminValues}
                  onChange={(k, v) => setAdminValues(p => ({ ...p, [k]: v }))}
                  schoolClasses={schoolClasses}
                  onClassChange={handleClassChange}
                  touched={adminTouched}
                />
                <button
                  onClick={handleContinue}
                  className="btn-primary w-full mt-3"
                >
                  繼續填寫 ↓
                </button>
                {adminTouched && !adminReady && (
                  <p className="text-center text-xs text-pink mt-2">請填妥所有標示 * 的必填欄位</p>
                )}
              </>
            )}
          </>
        )}

        {/* Sections 2–4: scroll-driven survey — revealed after 繼續填寫 */}
        {surveyReady === true && section >= 2 && section < DONE && student && (
          <>
            {/* ── Section 2: Feelings Q1–Q6 ── */}
            <div id="section-2">
              <div className="section-card">
                <div className="section-title">
                  <span className="badge bg-pink/10 text-pink">第一部分</span>
                  幼兒對童亮館的感受
                </div>
                <div className="space-y-8">
                  {FEELINGS_QUESTIONS.map(q => (
                    <div key={q.key} className="pb-6 border-b border-slate-100 last:border-0 last:pb-0">
                      {q.type === 'checkbox' ? (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-3">{q.text} <span className="text-pink">*</span></p>
                          <FollowUpCheckbox
                            label=""
                            options={q.checkboxOptions}
                            values={feelingsValues[q.key] ? [feelingsValues[q.key]] : []}
                            onChange={v => setFeelingsValues(p => ({ ...p, [q.key]: v[v.length - 1] ?? '' }))}
                          />
                        </div>
                      ) : (
                        <EmojiRating
                          question={q.text}
                          value={feelingsValues[q.key]}
                          onChange={v => setFeelingsValues(p => ({ ...p, [q.key]: v }))}
                          required
                        />
                      )}
                      <FollowUpCheckbox
                        label="跟進問題"
                        options={q.followUpOptions}
                        values={feelingsValues[q.followUpKey] ?? []}
                        onChange={v => setFeelingsValues(p => ({ ...p, [q.followUpKey]: v }))}
                      />
                      <ObservationBox
                        value={feelingsValues[q.observationKey]}
                        onChange={v => setFeelingsValues(p => ({ ...p, [q.observationKey]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Section 3: Memory Q7–Q8 ── */}
            <div id="section-3">
              <div className="section-card">
                <div className="section-title">
                  <span className="badge bg-yellow/20 text-slate-700">第二部分</span>
                  記憶問題
                </div>
                <div className="space-y-5">
                  <div>
                    <label className="form-label">{MEMORY_QUESTIONS.q7.text}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={memoryValues.q7 ?? ''}
                      onChange={e => setMemoryValues(p => ({ ...p, q7: e.target.value }))}
                      placeholder="例：3次"
                    />
                  </div>
                  <div>
                    <label className="form-label">{MEMORY_QUESTIONS.q8.text}</label>
                    <textarea
                      rows={4}
                      className="form-input resize-none"
                      value={memoryValues.q8 ?? ''}
                      onChange={e => setMemoryValues(p => ({ ...p, q8: e.target.value }))}
                      placeholder="自由描述"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 4: Image question sets + closing + submit ── */}
            <div id="section-4">
              <div className="section-card">
                <div className="section-title">
                  <span className="badge bg-green/10 text-green">第三部分</span>
                  圖片記憶
                </div>

                {config?.blocks?.length ? (
                  <>
                    <p className="text-xs text-slate-400 mb-5">共 {config.blocks.length} 組圖片</p>
                    <div className="space-y-10">
                      {config.blocks.map(block => (
                        <div key={block.index} className="pb-8 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="w-7 h-7 rounded-full bg-navy text-white text-sm flex items-center justify-center font-bold shrink-0">
                              {block.index}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">第 {block.index} 組</span>
                          </div>
                          <ImageBlock
                            block={block}
                            values={imageValues[block.index] ?? {}}
                            onChange={(k, v) => setImageBlockValue(block.index, k, v)}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 py-4">
                    班別設定未完成，圖片題暫不顯示。
                  </p>
                )}

                {/* Closing questions */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="section-title">
                    <span className="badge bg-navy/10 text-navy">第四部分</span>
                    完結問題 Q12
                  </div>
                  <FollowUpCheckbox
                    label="請向幼兒提問以下問題"
                    options={CLOSING_QUESTIONS}
                    values={closingValues.asked}
                    onChange={v => setClosingValues(p => ({ ...p, asked: v }))}
                  />
                  <ObservationBox
                    value={closingValues.observation}
                    onChange={v => setClosingValues(p => ({ ...p, observation: v }))}
                    placeholder="Q12 觀察／補充記錄（選填）"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="mt-4">
                {submitState === 'error' && (
                  <div className="mb-4 p-4 rounded-xl bg-pink/10 border border-pink/20 text-sm text-pink whitespace-pre-wrap">
                    ⚠️ 提交時發生錯誤：{'\n'}{submitError}
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitState === 'loading'}
                  className="btn-primary w-full text-base py-4 disabled:opacity-50"
                >
                  {submitState === 'loading' ? '提交中…' : '提交記錄'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Section 5: Done ── */}
        {section === DONE && (
          <div className="section-card text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-navy mb-2">提交成功！</h2>
            <p className="text-slate-500 text-sm mb-6">
              {student?.studentId} 的記錄已儲存。
            </p>
            <button
              onClick={() => {
                setSection(0); setStudent(null); setConfig(null)
                setSchoolClasses([]); setSurveyReady(false); setAdminTouched(false)
                setAdminValues({}); setFeelingsValues({}); setMemoryValues({})
                setImageValues({}); setClosingValues({ asked: [], observation: '' })
                setSubmitState(null)
              }}
              className="btn-secondary"
            >
              開始下一位學生
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
