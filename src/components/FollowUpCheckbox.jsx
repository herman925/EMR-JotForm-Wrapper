/** Checkbox list for follow-up prompts */
export default function FollowUpCheckbox({ label, options, values = [], onChange }) {
  function toggle(opt) {
    const next = values.includes(opt)
      ? values.filter(v => v !== opt)
      : [...values, opt]
    onChange(next)
  }

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <div className="space-y-2">
        {options.map((opt, i) => (
          <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
            <span className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors
              ${values.includes(opt)
                ? 'bg-orange border-orange'
                : 'border-slate-300 group-hover:border-orange/50'}`}
              onClick={() => toggle(opt)}
            >
              {values.includes(opt) && (
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M10.28 2.28L4 8.56 1.72 6.28a1 1 0 00-1.44 1.44l3 3a1 1 0 001.44 0l7-7a1 1 0 00-1.44-1.44z" />
                </svg>
              )}
            </span>
            <span className="text-sm text-slate-600 leading-relaxed" onClick={() => toggle(opt)}>
              {opt}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
