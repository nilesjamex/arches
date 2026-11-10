// The search lives in the URL (?q=&grade=&page=), so results can be bookmarked, shared,
// and restored by the browser Back button or the detail page's "Back to results" link.

import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import { GRADES, type Grade } from '@/api/buildings'
import type { Filters } from './format'

export interface SearchState extends Filters {
  page: number
}

function first(value: LocationQuery[string] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value
  return typeof v === 'string' ? v : ''
}

export function parseSearchQuery(query: LocationQuery): SearchState {
  const grade = first(query.grade)
  const page = Number.parseInt(first(query.page), 10)
  return {
    q: first(query.q).trim(),
    grade: (GRADES as readonly string[]).includes(grade) ? (grade as Grade) : '',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  }
}

/** Only non-default values go in the URL, so the plain search page stays at "/". */
export function toSearchQuery(state: SearchState): LocationQueryRaw {
  const query: LocationQueryRaw = {}
  if (state.q) query.q = state.q
  if (state.grade) query.grade = state.grade
  if (state.page > 1) query.page = String(state.page)
  return query
}

export function sameSearch(a: SearchState, b: SearchState): boolean {
  return a.q === b.q && a.grade === b.grade && a.page === b.page
}
