import { useState, useCallback } from 'react'
import { fetchCSV } from '../lib/csvParser'

let _cache = null

const BASE = import.meta.env.BASE_URL // Vite injects the base path

/**
 * Look up the image sets for a given ClassID from classes.csv.
 *
 * Returns an array of image blocks (up to 8), each with:
 *   { index: 1,
 *     batch1: [{src, isCorrect}×4],   // columns a–d, correct = a
 *     batch2: [{src, isCorrect}×4],   // columns e–h, correct = e (staff)
 *     batch3: [{src, isCorrect}×4],   // columns i–l, correct = i
 *     batch4: [{src, isCorrect}×4] }  // columns m–p, correct = m
 */
export function useClassConfig() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const getConfig = useCallback(async (classId) => {
    if (!classId?.trim()) return null
    setLoading(true)
    setError(null)

    try {
      if (!_cache) {
        _cache = await fetchCSV(BASE + 'config/classes.csv')
      }

      const row = _cache.find(
        r => r['ClassID']?.trim() === classId.trim()
      )

      if (!row) {
        setError(`找不到班別設定：${classId}`)
        return null
      }

      const blocks = []
      for (let n = 1; n <= 8; n++) {
        const sceneA = row[`Q${n}a`]
        if (!sceneA) break // no more blocks for this class

        // Strip any extension the CSV might still carry (e.g. .jpg, .JPG, .png)
        // so the stored path is always a bare stem — ImagePicker tries extensions.
        const toImgPath = (filename) => {
          if (!filename) return null
          const stem = filename.replace(/\.[^.]+$/, '')
          return `${BASE}assets/images/${stem}`
        }

        const batch1 = [
          { src: toImgPath(row[`Q${n}a`]), isCorrect: true  },
          { src: toImgPath(row[`Q${n}b`]), isCorrect: false },
          { src: toImgPath(row[`Q${n}c`]), isCorrect: false },
          { src: toImgPath(row[`Q${n}d`]), isCorrect: false },
        ]

        const batch2 = [
          { src: toImgPath(row[`Q${n}e`]), isCorrect: true  },
          { src: toImgPath(row[`Q${n}f`]), isCorrect: false },
          { src: toImgPath(row[`Q${n}g`]), isCorrect: false },
          { src: toImgPath(row[`Q${n}h`]), isCorrect: false },
        ]

        const batch3 = [
          { src: toImgPath(row[`Q${n}i`]), isCorrect: true  },
          { src: toImgPath(row[`Q${n}j`]), isCorrect: false },
          { src: toImgPath(row[`Q${n}k`]), isCorrect: false },
          { src: toImgPath(row[`Q${n}l`]), isCorrect: false },
        ]

        const batch4 = [
          { src: toImgPath(row[`Q${n}m`]), isCorrect: true  },
          { src: toImgPath(row[`Q${n}n`]), isCorrect: false },
          { src: toImgPath(row[`Q${n}o`]), isCorrect: false },
          { src: toImgPath(row[`Q${n}p`]), isCorrect: false },
        ]

        blocks.push({
          index: n,
          sessionId: row['SessionID'],
          batch1,
          batch2,
          batch3,
          batch4,
        })
      }

      const result = {
        classId:   row['ClassID'],
        sessionId: row['SessionID'],
        blocks,
      }

      // ── Dev console: print image list as a table ──────────────────────
      const rows = []
      for (const block of blocks) {
        const batches = { batch1: 'a–d (scene)', batch2: 'e–h (staff)', batch3: 'i–l', batch4: 'm–p' }
        for (const [bk, label] of Object.entries(batches)) {
          block[bk].forEach((img, i) => {
            rows.push({
              'Q-set':    `Q${block.index}`,
              Batch:      label,
              Slot:       i,
              Correct:    img.isCorrect ? '★' : '',
              'Stem (no ext)': img.src ?? '(null)',
            })
          })
        }
      }
      console.groupCollapsed(
        `%c[ClassConfig] ${result.classId} · ${result.sessionId} — ${blocks.length} set(s), ${rows.length} images`,
        'color:#2b3990;font-weight:bold'
      )
      console.table(rows)
      console.groupEnd()

      return result
    } catch (err) {
      setError('載入班別設定時出錯：' + err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { getConfig, loading, error }
}
