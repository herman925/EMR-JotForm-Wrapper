import { useMemo, useState } from 'react'

/** Extensions tried in order before giving up and showing a placeholder */
const EXTENSIONS = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG', 'webp']

/** Fisher-Yates shuffle — stable per mount via useMemo */
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Four distinct placeholder colours, one per slot
const SLOT_COLORS = [
  { bg: 'bg-navy/10',   text: 'text-navy'       },
  { bg: 'bg-orange/10', text: 'text-orange'      },
  { bg: 'bg-green/10',  text: 'text-green'       },
  { bg: 'bg-yellow/20', text: 'text-slate-600'   },
]

/**
 * Single image tile — shows the image, or a coloured placeholder if
 * the src is missing / fails to load.
 */
function Tile({ img, index, isSelected, onClick }) {
  // extIdx: which extension we're currently trying (-1 = use src as-is / already has ext)
  const [extIdx, setExtIdx] = useState(0)
  const [allBroken, setAllBroken] = useState(false)

  const slot = SLOT_COLORS[index % 4]
  const label = img.src ? img.src.split('/').pop() : '圖片'

  // Build the URL to actually request: append the current candidate extension
  const resolvedSrc = img.src ? `${img.src}.${EXTENSIONS[extIdx]}` : null
  const showPlaceholder = !img.src || allBroken

  function handleLoad(e) {
    console.log(`%c[Image ✓] ${e.target.src}`, 'color:#8dbe50')
  }

  function handleError() {
    const next = extIdx + 1
    if (next < EXTENSIONS.length) {
      setExtIdx(next)   // try the next extension
    } else {
      setAllBroken(true)
      console.warn(`[Image ✗] all extensions failed for stem: ${img.src}`)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-square rounded-2xl overflow-hidden border-4 transition-all active:scale-95 touch-manipulation
        ${isSelected
          ? 'border-orange shadow-lg shadow-orange/20'
          : 'border-transparent hover:border-orange/30'}`}
    >
      {/* Real image — src cycles through EXTENSIONS until one loads */}
      {resolvedSrc && !allBroken && (
        <img
          src={resolvedSrc}
          alt=""
          className="w-full h-full object-cover object-top"
          draggable="false"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* Placeholder shown when no src or image fails to load */}
      {showPlaceholder && (
        <div className={`w-full h-full flex flex-col items-center justify-center gap-1.5 ${slot.bg}`}>
          <span className="text-3xl">🖼️</span>
          <span className={`text-[9px] font-medium text-center px-1 leading-tight ${slot.text} opacity-70`}>
            {label}
          </span>
        </div>
      )}

      {/* Selection checkmark */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-orange flex items-center justify-center shadow">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 12 12">
            <path d="M10.28 2.28L4 8.56 1.72 6.28a1 1 0 00-1.44 1.44l3 3a1 1 0 001.44 0l7-7a1 1 0 00-1.44-1.44z" />
          </svg>
        </div>
      )}
    </button>
  )
}

/**
 * 2×2 image picker.
 *
 * Props:
 *   images   [{src, isCorrect}] — exactly 4 items, shuffled on mount
 *   selected string|null        — currently selected src
 *   onSelect (src, isCorrect) => void
 *   question string             — question text shown above the grid
 */
export default function ImagePicker({ images, selected, onSelect, question }) {
  const shuffled = useMemo(() => shuffle(images), [images])

  return (
    <div>
      {question && (
        <p className="text-sm font-bold text-navy mb-3 leading-relaxed">
          {question} <span className="text-pink">*</span>
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {shuffled.map((img, i) => (
          <Tile
            key={i}
            img={img}
            index={i}
            isSelected={selected === img.src}
            onClick={() => onSelect(img.src, img.isCorrect)}
          />
        ))}
      </div>

      {/* N/A — respondent doesn't know / cannot identify any image */}
      <button
        type="button"
        onClick={() => onSelect('N/A', false)}
        className={`w-full mt-3 py-2.5 rounded-2xl border-2 text-sm font-medium transition-all active:scale-95 touch-manipulation
          ${selected === 'N/A'
            ? 'border-orange text-orange bg-orange/5 shadow shadow-orange/20'
            : 'border-slate-200 text-slate-400 hover:border-orange/30 hover:text-slate-500'}`}
      >
        唔知道 / N/A
      </button>
    </div>
  )
}
