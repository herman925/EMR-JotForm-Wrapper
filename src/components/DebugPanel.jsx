import { useState, useEffect, useRef } from 'react'

/** Extensions tried by ImagePicker — must stay in sync */
const EXTENSIONS = ['jpg', 'JPG', 'jpeg', 'JPEG', 'png', 'PNG', 'webp']

const BATCH_LABELS = {
  batch1: 'B1 Scene (a–d)',
  batch2: 'B2 Staff  (e–h)',
  batch3: 'B3       (i–l)',
  batch4: 'B4       (m–p)',
}

/**
 * Try every extension and resolve with the first that loads.
 * Returns { stem, loaded, ext, url } — ext/url are null when all fail.
 */
function probeImage(stem) {
  return new Promise((resolve) => {
    let i = 0
    const tryNext = () => {
      if (i >= EXTENSIONS.length) {
        resolve({ stem, loaded: false, ext: null, url: null })
        return
      }
      const ext = EXTENSIONS[i++]
      const img = new Image()
      img.onload  = () => resolve({ stem, loaded: true, ext, url: img.src })
      img.onerror = tryNext
      img.src     = `${stem}.${ext}`
    }
    tryNext()
  })
}

/**
 * Debug panel — shown when ?debug=1 is in the URL.
 *
 * Props:
 *   config   { classId, sessionId, blocks: [{index, batch1…batch4}] } | null
 */
export default function DebugPanel({ config }) {
  const [open, setOpen]       = useState(true)
  const [results, setResults] = useState(null)   // null = not run | [] = probed
  const [probing, setProbing] = useState(false)
  const lastConfigRef         = useRef(null)

  // Reset results whenever config changes (new class loaded)
  useEffect(() => {
    if (config !== lastConfigRef.current) {
      lastConfigRef.current = config
      setResults(null)
    }
  }, [config])

  async function runProbe() {
    if (!config) return
    setProbing(true)
    setResults(null)

    // Flatten all image stems from all blocks/batches
    const stems = []
    for (const block of config.blocks) {
      for (const batchKey of ['batch1', 'batch2', 'batch3', 'batch4']) {
        for (const img of block[batchKey]) {
          if (img.src) {
            stems.push({
              stem:      img.src,
              blockIdx:  block.index,
              batchKey,
              isCorrect: img.isCorrect,
            })
          }
        }
      }
    }

    const probed = await Promise.all(
      stems.map(async ({ stem, blockIdx, batchKey, isCorrect }) => {
        const r = await probeImage(stem)
        return { ...r, blockIdx, batchKey, isCorrect }
      })
    )

    setResults(probed)
    setProbing(false)
  }

  if (!config) return null

  const loaded = results?.filter(r =>  r.loaded).length ?? 0
  const failed = results?.filter(r => !r.loaded).length ?? 0
  const total  = results?.length ?? 0

  // Group results by block index for display
  const byBlock = {}
  if (results) {
    for (const r of results) {
      if (!byBlock[r.blockIdx]) byBlock[r.blockIdx] = {}
      if (!byBlock[r.blockIdx][r.batchKey]) byBlock[r.blockIdx][r.batchKey] = []
      byBlock[r.blockIdx][r.batchKey].push(r)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-h-[80vh] flex flex-col font-mono text-xs shadow-2xl rounded-2xl overflow-hidden border border-navy/20">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 bg-navy text-white shrink-0">
        <span className="font-bold tracking-wide">🐞 Image Debug</span>
        <div className="flex items-center gap-2">
          <span className="opacity-60">{config.sessionId} · {config.classId}</span>
          <button
            onClick={() => setOpen(o => !o)}
            className="ml-1 opacity-70 hover:opacity-100 text-base leading-none"
          >
            {open ? '▾' : '▸'}
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col overflow-hidden bg-white">

          {/* ── Probe button + summary ─────────────────────────────────── */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
            <button
              onClick={runProbe}
              disabled={probing}
              className="px-3 py-1 rounded-lg bg-navy text-white text-xs font-bold disabled:opacity-50 hover:bg-navy/80 transition-colors"
            >
              {probing ? '⏳ Probing…' : '▶ Probe images'}
            </button>
            {results && (
              <span className={`font-bold ${failed > 0 ? 'text-pink-600' : 'text-green-600'}`}>
                ✓ {loaded} / {total}
                {failed > 0 && <span className="text-pink-600"> · ✗ {failed} missing</span>}
              </span>
            )}
          </div>

          {/* ── Results list ───────────────────────────────────────────── */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {!results && !probing && (
              <p className="px-3 py-4 text-slate-400 text-center">
                Click "Probe images" to check all {config.blocks.length} question set(s).
              </p>
            )}

            {Object.entries(byBlock).map(([blockIdx, batches]) => (
              <div key={blockIdx}>
                {/* Block header */}
                <div className="px-3 py-1 bg-navy/5 text-navy font-bold sticky top-0">
                  Q{blockIdx} — {config.sessionId}
                </div>

                {Object.entries(batches).map(([batchKey, imgs]) => (
                  <div key={batchKey} className="px-3 pb-1">
                    <div className="text-slate-400 pt-1 pb-0.5">{BATCH_LABELS[batchKey]}</div>
                    {imgs.map((r, i) => {
                      const stem = r.stem.split('/').pop()
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-1.5 py-0.5 ${r.loaded ? 'text-green-700' : 'text-red-600'}`}
                        >
                          <span>{r.loaded ? '✓' : '✗'}</span>
                          <span className="truncate flex-1" title={r.url ?? r.stem}>
                            {stem}
                            {r.loaded && <span className="text-slate-400 ml-1">.{r.ext}</span>}
                          </span>
                          {r.isCorrect && (
                            <span className="shrink-0 text-orange-400 font-bold">★</span>
                          )}
                          {r.loaded && (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="shrink-0 text-blue-500 hover:underline"
                            >
                              ↗
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* ── Footer — copy JSON ─────────────────────────────────────── */}
          {results && (
            <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 shrink-0">
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(results, null, 2))}
                className="text-slate-500 hover:text-navy transition-colors"
              >
                📋 Copy results as JSON
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
