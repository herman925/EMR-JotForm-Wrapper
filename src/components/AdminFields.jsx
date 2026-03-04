/** Admin + student info fields (after successful student lookup) */
export default function AdminFields({ student, values, onChange }) {
  const field = (key) => ({
    value: values[key] ?? '',
    onChange: e => onChange(key, e.target.value),
  })

  return (
    <div className="section-card">
      <div className="section-title">
        <span className="w-7 h-7 rounded-full bg-navy text-white text-sm flex items-center justify-center font-bold">2</span>
        基本資料
      </div>

      {/* Read-only student info chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        <InfoChip label="學生" value={student.studentName} color="navy" />
        <InfoChip label="學校" value={student.schoolName}  color="orange" />
        <InfoChip label="班別" value={student.classId}     color="yellow" />
        <InfoChip label="地區" value={student.district}    color="green" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">訪問老師姓名 *</label>
          <input type="text" className="form-input" placeholder="請輸入姓名" {...field('interviewerName')} />
        </div>

        <div>
          <label className="form-label">訪問日期 *</label>
          <input type="date" className="form-input" {...field('interviewDate')} />
        </div>

        <div>
          <label className="form-label">計劃階段 *</label>
          <select className="form-input" {...field('phase')}>
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
