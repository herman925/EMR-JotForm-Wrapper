/**
 * Admin + student info fields.
 *
 * Props:
 *   student       — from CSV lookup (studentName, schoolName, classId, district, schoolId)
 *   values        — controlled form state
 *   onChange      — (key, value) => void
 *   schoolClasses — string[] of Class ID 25/26 values for the student's school
 *   onClassChange — (newClassId) => void  — triggers config reload in parent
 *   touched       — boolean — when true, highlights empty required fields in pink
 */
export default function AdminFields({ student, values, onChange, schoolClasses = [], onClassChange, touched = false }) {
  const field = (key) => ({
    value: values[key] ?? '',
    onChange: e => onChange(key, e.target.value),
  })

  // Returns extra className when a required field is empty after a submit attempt
  const err = (key) => touched && !values[key] ? 'ring-2 ring-pink border-pink' : ''

  const activeClassId = values.classIdOverride || student.classId

  function handleClassChange(e) {
    const newId = e.target.value
    onChange('classIdOverride', newId)
    onClassChange?.(newId)
  }

  return (
    <div className="section-card">
      <div className="section-title">
        <span className="w-7 h-7 rounded-full bg-navy text-white text-sm flex items-center justify-center font-bold shrink-0">2</span>
        基本資料
      </div>

      {/* Read-only student info chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        <InfoChip label="學生" value={student.studentName} color="navy" />
        <InfoChip label="學校" value={student.schoolName}  color="orange" />
        <InfoChip label="地區" value={student.district}    color="green" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Class ID — dropdown filtered to student's school */}
        <div className="sm:col-span-2">
          <label className="form-label">
            班別編號 *
            {schoolClasses.length > 0 && (
              <span className="text-slate-400 font-normal ml-1">（{schoolClasses.length} 個班別）</span>
            )}
          </label>
          {schoolClasses.length > 1 ? (
            <select
              className="form-input"
              value={activeClassId}
              onChange={handleClassChange}
            >
              {schoolClasses.map(cid => (
                <option key={cid} value={cid}>{cid}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="form-input bg-slate-50 text-slate-500"
              value={activeClassId}
              readOnly
            />
          )}
        </div>

        <div>
          <label className="form-label">訪問老師姓名 *</label>
          <input
            type="text"
            className={`form-input ${err('interviewerName')}`}
            placeholder="請輸入姓名"
            {...field('interviewerName')}
          />
        </div>

        <div>
          <label className="form-label">訪問日期 *</label>
          <input
            type="date"
            className={`form-input ${err('interviewDate')}`}
            {...field('interviewDate')}
          />
        </div>

        <div>
          <label className="form-label">計劃階段 *</label>
          <select className={`form-input ${err('phase')}`} {...field('phase')}>
            <option value="">請選擇</option>
            <option>Trial</option>
            <option>Pilot</option>
            <option>Round I</option>
            <option>Round II</option>
          </select>
        </div>

        <div>
          <label className="form-label">學生姓名 <span className="text-slate-400 font-normal">（可修改）</span></label>
          <input type="text" className="form-input" placeholder="自動填入" {...field('studentNameOverride')} />
        </div>

      </div>
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
