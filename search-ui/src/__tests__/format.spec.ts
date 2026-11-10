import { describe, expect, it } from 'vitest'
import type { BuildingPage } from '@/api/buildings'
import { emptyResultsTitle, formatCoordinates, gradeSpoken, resultsSummary } from '@/utils/format'
import { parseSearchQuery, toSearchQuery } from '@/utils/searchQuery'

const page = (count: number, pageNo = 1): BuildingPage => ({
  count,
  page: pageNo,
  page_size: 20,
  total_pages: Math.ceil(count / 20),
  results: [],
})

describe('format', () => {
  it('formats coordinates with hemispheres', () => {
    expect(formatCoordinates({ lat: 52.63094, lon: 1.29741 })).toBe('52.6309° N, 1.2974° E')
    expect(formatCoordinates({ lat: 50.7184, lon: -3.5339 })).toBe('50.7184° N, 3.5339° W')
    expect(formatCoordinates(null)).toBeNull()
  })

  it('writes the results summary for each filter combination', () => {
    expect(resultsSummary(page(501), { q: '', grade: '' })).toBe('Showing 1–20 of 501 buildings')
    expect(resultsSummary(page(3), { q: 'church', grade: 'II*' })).toBe(
      'Showing 1–3 of 3 buildings matching “church”, Grade II*',
    )
    expect(resultsSummary(page(45, 3), { q: '', grade: 'I' })).toBe(
      'Showing 41–45 of 45 buildings in Grade I',
    )
    expect(resultsSummary(page(1), { q: 'mill', grade: '' })).toBe(
      'Showing 1–1 of 1 building matching “mill”',
    )
    expect(resultsSummary(page(0), { q: 'x', grade: '' })).toBe('No buildings found')
  })

  it('repeats the search in the empty-results title', () => {
    expect(emptyResultsTitle({ q: 'mill', grade: 'I' })).toBe(
      'No buildings match “mill” in Grade I',
    )
    expect(emptyResultsTitle({ q: '', grade: 'II*' })).toBe('No Grade II* buildings found')
  })

  it('gives grades a spoken form', () => {
    expect(gradeSpoken('II*')).toBe('Grade two star')
  })
})

describe('searchQuery', () => {
  it('parses the URL and ignores invalid values', () => {
    expect(parseSearchQuery({ q: ' church ', grade: 'II*', page: '2' })).toEqual({
      q: 'church',
      grade: 'II*',
      page: 2,
    })
    expect(parseSearchQuery({ grade: 'III', page: '-4' })).toEqual({ q: '', grade: '', page: 1 })
  })

  it('leaves defaults out of the URL', () => {
    expect(toSearchQuery({ q: '', grade: '', page: 1 })).toEqual({})
    expect(toSearchQuery({ q: 'mill', grade: 'I', page: 3 })).toEqual({
      q: 'mill',
      grade: 'I',
      page: '3',
    })
  })
})
