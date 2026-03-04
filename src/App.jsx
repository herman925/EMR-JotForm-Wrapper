import { useState } from 'react'
import ProgressBar from './components/ProgressBar'
import StudentLookup from './components/StudentLookup'
import AdminFields from './components/AdminFields'
import EmojiRating from './components/EmojiRating'
import FollowUpCheckbox from './components/FollowUpCheckbox'
import ObservationBox from './components/ObservationBox'
import ImageBlock from './components/ImageBlock'
import { FEELINGS_QUESTIONS, MEMORY_QUESTIONS, CLOSING_QUESTIONS, SECTION_LABELS, ADMIN_QIDS, IMAGE_BLOCK_QIDS } from './constants/questions'
import { submitToJotform } from './lib/jotform'
import { saveToSupabase } from './lib/supabase'

const SECTIONS = ['student', 'admin', 'feelings', 'memory', 'images', 'done']

export default function App() {
  const [section, setSection]       = useState(0)
  const [student, setStudent]       = useState(null)
  const [config, setConfig]         = useState(null)
  const [adminValues, setAdminValues]   = useState({})
  const [feelingsValues, setFeelingsValues] = useState({})
  const [memoryValues, setMemoryValues]   = useState({})
  const [imageValues, setImageValues]     = useState({}) // { 1: { sceneSelected, staffSelected, ... }, ... }
  const [closingValues, setClosingValues] = useState({ asked: [], observation: '' })
  const [submitState, setSubmitState]     = useState(null) // null | 'loading' | 'success' | 'error'
  const [submitError, setSubmitError]     = useState(null)

  function handleStudentResolved({ student, config }) {
    setStudent(student)
    setConfig(config)
    setSection(1)
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

    // Build JotForm answers map
    const answers = {}

    // Admin fields
    answers[ADMIN_QIDS.interviewerName] = adminValues.interviewerName ?? ''
    answers[ADMIN_QIDS.phase]           = adminValues.phase ?? ''
    answers[ADMIN_QIDS.interviewDate]   = adminValues.interviewDate ?? ''
    answers[ADMIN_QIDS.studentId]       = student.studentId
    answers[ADMIN_QIDS.studentName]     = adminValues.studentNameOverride || student.studentName
    answers[ADMIN_QIDS.schoolName]      = student.schoolName
    answers[ADMIN_QIDS.studentClass]    = student.classId
    answers[ADMIN_QIDS.district]        = student.district

    // Feelings
    for (const q of FEELINGS_QUESTIONS) {
      if (feelingsValues[q.key]) answers[q.qid] = feelingsValues[q.key]
      if (feelingsValues[q.followUpKey]?.length) {
        answers[q.followUpQid] = feelingsValues[q.followUpKey].join(', ')
      }
      if (feelingsValues[q.observationKey]) {
        answers[q.observationQid] = feelingsValues[q.observationKey]
      }
    }

    // Memory
    if (memoryValues.q7) answers[MEMORY_QUESTIONS.q7.qid] = memoryValues.q7
    if (memoryValues.q8) answers[MEMORY_QUESTIONS.q8.qid] = memoryValues.q8

    // Image blocks (qids TBD — store as text for now)
    for (const block of config?.blocks ?? []) {
      const v = imageValues[block.index] ?? {}
      const sceneQid = IMAGE_BLOCK_QIDS.scene[block.index]
      const staffQid = IMAGE_BLOCK_QIDS.staff[block.index]
      if (sceneQid && v.sceneSelected) answers[sceneQid] = v.sceneSelected
      if (staffQid && v.staffSelected) answers[staffQid] = v.staffSelected
    }

    // Full payload for Supabase backup
    const payload = {
      student, config: { classId: config?.classId, sessionId: config?.sessionId },
      admin: adminValues,
      feelings: feelingsValues,
      memory: memoryValues,
      images: imageValues,
      closing: closingValues,
      submittedAt: new Date().toISOString(),
    }

    let jotformId = null
    let jotformError = null

    // 1. Submit to JotForm
    try {
      const result = await submitToJotform(answers)
      jotformId = result.submissionId
    } catch (err) {
      jotformError = err.message
    }

    // 2. Always back up to Supabase
    try {
      await saveToSupabase({
        studentId: student.studentId,
        classId: student.classId,
        sessionId: config?.sessionId,
        jotformId,
        payload,
      })
    } catch (err) {
      // Supabase failure is non-blocking but we surface it
      if (jotformError) {
        setSubmitState('error')
        setSubmitError(`JotForm: ${jotformError}\nSupabase: ${err.message}`)
        return
      }
      // JotForm OK but Supabase failed — warn but mark success
      console.warn('Supabase backup failed:', err.message)
    }

    if (jotformError && !jotformId) {
      setSubmitState('error')
      setSubmitError(jotformError)
      return
    }

    setSubmitState('success')
    setSection(SECTIONS.indexOf('done'))
  }

  const sectionIndex = SECTIONS.indexOf(SECTIONS[section])

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-navy text-white px-4 pt-safe-top pb-3 sticky top-0 z-10 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src={import.meta.env.BASE_URL + 'assets/logos/KS.png'} alt="KeySteps" className="h-8 w-8 object-contain" />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm leading-tight">童亮館 – 事件記憶測試</h1>
            <p className="text-white/60 text-xs">Event-Based Memory Test · Round II</p>
          </div>
          {student && (
            <span className="badge bg-orange/20 text-orange text-xs shrink-0">
              {student.studentId}
            </span>
          )}
        </div>

        {section > 0 && section < SECTIONS.indexOf('done') && (
          <div className="max-w-lg mx-auto mt-2">
            <ProgressBar current={section - 1} total={SECTION_LABELS.length} labels={SECTION_LABELS} />
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-24">

        {/* SECTION 0: Student lookup */}
        {section === 0 && (
          <StudentLookup onResolved={handleStudentResolved} />
        )}

        {/* SECTION 1: Admin */}
        {section === 1 && student && (
          <>
            <AdminFields
              student={student}
              values={adminValues}
              onChange={(k, v) => setAdminValues(p => ({ ...p, [k]: v }))}
            />
            <NavButtons
              onNext={() => setSection(2)}
              nextDisabled={!adminValues.interviewerName || !adminValues.interviewDate || !adminValues.phase}
            />
          </>
        )}

        {/* SECTION 2: Feelings Q1–Q6 */}
        {section === 2 && (
          <>
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
            <NavButtons onBack={() => setSection(1)} onNext={() => setSection(3)} />
          </>
        )}

        {/* SECTION 3: Memory Q7–Q8 */}
        {section === 3 && (
          <>
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
                    placeholder="���：3次"
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
            <NavButtons onBack={() => setSection(2)} onNext={() => setSection(4)} />
          </>
        )}

        {/* SECTION 4: Image blocks */}
        {section === 4 && config && (
          <>
            <div className="section-card">
              <div className="section-title">
                <span className="badge bg-green/10 text-green">第三部分</span>
                圖片記憶
              </div>
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
              <button onClick={() => setSection(3)} className="w-full mt-2 text-sm text-slate-400 py-2">
                ← 返回上一頁
              </button>
            </div>
          </>
        )}

        {/* SECTION 5: Done */}
        {section === SECTIONS.indexOf('done') && (
          <div className="section-card text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-navy mb-2">提交成功！</h2>
            <p className="text-slate-500 text-sm mb-6">
              {student?.studentId} 的記錄已儲存。
            </p>
            <button
              onClick={() => {
                setSection(0); setStudent(null); setConfig(null)
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

function NavButtons({ onBack, onNext, nextDisabled }) {
  return (
    <div className="flex gap-3 mt-4">
      {onBack && (
        <button onClick={onBack} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-500 font-semibold text-sm hover:border-navy/30 transition-colors">
          ← 返回
        </button>
      )}
      {onNext && (
        <button onClick={onNext} disabled={nextDisabled} className="flex-1 btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          繼續 →
        </button>
      )}
    </div>
  )
}
