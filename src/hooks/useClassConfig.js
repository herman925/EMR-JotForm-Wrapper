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

        const toImgPath = (filename) =>
          filename ? `${BASE}assets/images/${filename}` : null

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

      return {
        classId:   row['ClassID'],
        sessionId: row['SessionID'],
        blocks,
      }
    } catch (err) {
      setError('載入班別設定時出錯：' + err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { getConfig, loading, error }
}
