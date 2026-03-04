import { useState } from 'react'
import { useStudentLookup } from '../hooks/useStudentLookup'
import { useClassConfig } from '../hooks/useClassConfig'

export default function StudentLookup({ onResolved }) {
  const [input, setInput]           = useState('')
  const [foundStudent, setFoundStudent] = useState(null)
  const [foundConfig, setFoundConfig]   = useState(null)
  const [configMissing, setConfigMissing] = useState(false)

  const { lookup, loading: lookupLoading, error: lookupError, getSchoolClasses } = useStudentLookup()
  const { getConfig, loading: configLoading }                  = useClassConfig()

  const loading = lookupLoading || configLoading

  async function handleLookup() {
    setFoundStudent(null)
    setFoundConfig(null)
    setConfigMissing(false)

    const student = await lookup(input)
    if (!student) return

    setFoundStudent(student)

    const config = await getConfig(student.classId)
    if (config) {
      setFoundConfig(config)
    } else {
      setConfigMissing(true)
    }
  }

  function handleConfirm() {
    const schoolClasses = getSchoolClasses(foundStudent.schoolId)
    onResolved({ student: foundStudent, config: foundConfig, schoolClasses })
  }

  return (
    <div className="section-card">
      <div className="section-title">
        <span className="w-7 h-7 rounded-full bg-navy text-white text-sm flex items-center justify-center font-bold shrink-0">1</span>
        學生資料
      </div>

      <label className="form-label">學生編號</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value.trim())}
          onKeyDown={e => e.key === 'Enter' && !loading && input && handleLookup()}
          placeholder="例：St10001"
          className="form-input flex-1"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
        />
        <button
          onClick={handleLookup}
          disabled={loading || !input}
          className="btn-primary min-w-[80px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '⏳' : '查詢'}
        </button>
      </div>

      {lookupError && (
        <p className="mt-2 text-sm text-pink font-medium flex items-center gap-1">
          <span>⚠️</span> {lookupError}
        </p>
      )}

      {foundStudent && (
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex flex-wrap gap-2 mb-4">
            <InfoChip label="學生" value={foundStudent.studentName} color="navy" />
            <InfoChip label="學校" value={foundStudent.schoolName}  color="orange" />
            <InfoChip label="班別" value={foundStudent.className ? `${foundStudent.className} (${foundStudent.classId})` : foundStudent.classId} color="yellow" />
            <InfoChip label="地區" value={foundStudent.district}    color="green" />
          </div>

          {configMissing && (
            <p className="text-xs text-pink mb-3 flex items-center gap-1">
              ⚠️ 找不到 {foundStudent.classId} 的班別設定，圖片題將暫時顯示為空白。
            </p>
          )}

          <button
            onClick={handleConfirm}
            className="btn-primary w-full"
          >
            確認學生，開始訪問 →
          </button>
        </div>
      )}
    </div>
  )
}

function InfoChip({ label, value, color }) {
  const colors = {
    navy:   'bg-navy/10 text-navy',
    orange: 'bg-orange/10 text-orange',
    yellow: 'bg-yellow/20 text-slate-700',
    green:  'bg-green/10 text-green',
  }
  return (
    <span className={`badge ${colors[color]} gap-1`}>
      <span className="opacity-60 text-[10px]">{label}</span>
      <span className="font-semibold">{value || '—'}</span>
    </span>
  )
}
