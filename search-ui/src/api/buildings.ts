// HTTP client for the Django buildings API (historic/historic/views/buildings.py).
// Requests use relative URLs; in development Vite proxies /api to Django (see vite.config.ts).

export const GRADES = ['I', 'II*', 'II'] as const
export type Grade = (typeof GRADES)[number]

export interface Coordinates {
  lon: number
  lat: number
}

export interface Building {
  id: string
  list_entry: string | null
  name: string | null
  grade: Grade | null
  location: Coordinates | null
}

export interface BuildingDetail extends Building {
  period: string | null
  nhle_url: string | null
}

export interface BuildingPage {
  count: number
  page: number
  page_size: number
  total_pages: number
  results: Building[]
}

export interface SearchParams {
  q?: string
  grade?: Grade | ''
  page?: number
}

/** The server answered, but with an error status. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(
      body?.error ?? `The server returned an error (${response.status}).`,
      response.status,
    )
  }
  return response.json()
}

export function searchBuildings(params: SearchParams, signal?: AbortSignal): Promise<BuildingPage> {
  const query = new URLSearchParams()
  if (params.q?.trim()) query.set('q', params.q.trim())
  if (params.grade) query.set('grade', params.grade)
  if (params.page && params.page > 1) query.set('page', String(params.page))

  const qs = query.toString()
  return getJson(`/api/buildings/${qs ? `?${qs}` : ''}`, signal)
}

export function fetchBuilding(id: string, signal?: AbortSignal): Promise<BuildingDetail> {
  return getJson(`/api/buildings/${encodeURIComponent(id)}/`, signal)
}
