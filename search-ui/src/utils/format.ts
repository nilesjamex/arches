// Pure display helpers. No Vue imports, so they are trivial to unit test.

import type { BuildingPage, Coordinates, Grade } from '@/api/buildings'

const GRADE_SPOKEN: Record<Grade, string> = {
  I: 'Grade one',
  'II*': 'Grade two star',
  II: 'Grade two',
}

export function gradeLabel(grade: Grade): string {
  return `Grade ${grade}`
}

/** How a screen reader should say the grade; "II*" is otherwise read as "I I star". */
export function gradeSpoken(grade: Grade): string {
  return GRADE_SPOKEN[grade]
}

/** e.g. "52.6309° N, 1.2974° E". */
export function formatCoordinates(location: Coordinates | null): string | null {
  if (!location) return null
  const lat = `${Math.abs(location.lat).toFixed(4)}° ${location.lat >= 0 ? 'N' : 'S'}`
  const lon = `${Math.abs(location.lon).toFixed(4)}° ${location.lon >= 0 ? 'E' : 'W'}`
  return `${lat}, ${lon}`
}

export function nhleUrl(listEntry: string): string {
  return `https://historicengland.org.uk/listing/the-list/list-entry/${encodeURIComponent(listEntry)}`
}

export interface Filters {
  q: string
  grade: Grade | ''
}

/** "Showing 1–3 of 3 buildings matching “church”, Grade II*". */
export function resultsSummary(page: BuildingPage, filters: Filters): string {
  if (page.count === 0) return 'No buildings found'
  const first = (page.page - 1) * page.page_size + 1
  const last = Math.min(page.page * page.page_size, page.count)
  const noun = page.count === 1 ? 'building' : 'buildings'
  let text = `Showing ${first}–${last} of ${page.count} ${noun}`
  if (filters.q) text += ` matching “${filters.q}”`
  if (filters.grade) text += `${filters.q ? ',' : ' in'} ${gradeLabel(filters.grade)}`
  return text
}

/** Title of the "no results" alert, repeating what was searched for. */
export function emptyResultsTitle(filters: Filters): string {
  const grade = filters.grade ? gradeLabel(filters.grade) : ''
  if (filters.q && grade) return `No buildings match “${filters.q}” in ${grade}`
  if (filters.q) return `No buildings match “${filters.q}”`
  if (grade) return `No ${grade} buildings found`
  return 'No buildings found'
}
