import { useState, useCallback } from 'react'
import { fetchCSV } from '../lib/csvParser'

let _cache = null

const BASE = import.meta.env.BASE_URL // Vite injects the base path

/**
 * Look up the image sets for a given ClassID from classes.csv.
 *
 * Returns an array of image blocks (up to 8), each with:
 *   { index: 1, scene: [{src, isCorrect}×4], staff: [{src, isCorrect}×4] }
 *
 * Columns a-d = scene images (correct = a)
 * Columns e-h = staff images (correct = e)
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

        const scene = [
          { src: toImgPath(row[`Q${n}a`]), isCorrect: true  },
          { src: toImgPath(row[`Q${n}b`]), isCorrect: false },
          { src: toImgPath(row[`Q${n}c`]), isCorrect: false },
          { src: toImgPath(row[`Q${n}d`]), isCorrect: false },
        ]

        const staff = [
          { src: toImgPath(row[`Q${n}e`]), isCorrect: true  },
          { src: toImgPath(row[`Q${n}f`]), isCorrect: false },
          { src: toImgPath(row[`Q${n}g`]), isCorrect: false },
          { src: toImgPath(row[`Q${n}h`]), isCorrect: false },
        ]

        blocks.push({
          index: n,
          sessionId: row['SessionID'],
          scene,
          staff,
        })
      }

      return {
        classId:   row['ClassID'],
        schoolId:  row['SchoolID'],
        district:  row['District'],
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
