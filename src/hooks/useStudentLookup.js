import { useState, useCallback } from 'react'
import { fetchCSV } from '../lib/csvParser'

let _cache = null // module-level cache so CSV is only fetched once per session

/**
 * Look up a student's class details from students_raw.csv.
 *
 * Source column: "Class ID 25/26"
 * Also reads: Full Name, School ID, School Name, District Cleaned
 */
export function useStudentLookup() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const lookup = useCallback(async (studentId) => {
    if (!studentId?.trim()) return null
    setLoading(true)
    setError(null)

    try {
      if (!_cache) {
        _cache = await fetchCSV(import.meta.env.BASE_URL + 'config/students_raw.csv')
      }

      const row = _cache.find(
        r => r['Student ID']?.trim().toLowerCase() === studentId.trim().toLowerCase()
      )

      if (!row) {
        setError('找不到學生編號，請確認後重試。')
        return null
      }

      return {
        studentId:   row['Student ID'],
        studentName: row['Full Name'],
        classId:     row['Class ID 25/26'],
        schoolId:    row['School ID'],
        schoolName:  row['School Name'],
        district:    row['District Cleaned'],
      }
    } catch (err) {
      setError('載入學生資料時出錯：' + err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /** Return sorted unique Class ID 25/26 values for a given School ID (requires prior lookup call) */
  const getSchoolClasses = useCallback((schoolId) => {
    if (!_cache || !schoolId) return []
    const seen = new Set()
    for (const row of _cache) {
      if (row['School ID']?.trim() === schoolId.trim()) {
        const cid = row['Class ID 25/26']?.trim()
        if (cid) seen.add(cid)
      }
    }
    return [...seen].sort()
  }, [])

  return { lookup, loading, error, getSchoolClasses }
}
