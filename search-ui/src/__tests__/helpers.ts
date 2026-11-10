import { flushPromises, mount } from '@vue/test-utils'
import { vi } from 'vitest'
import { createMemoryHistory } from 'vue-router'
import type { Building, BuildingPage } from '@/api/buildings'
import App from '@/App.vue'
import { createAppRouter } from '@/router'

export function building(overrides: Partial<Building> = {}): Building {
  return {
    id: 'a',
    list_entry: '1175242',
    name: 'Church of St Peter',
    grade: 'I',
    location: { lat: 52.6309, lon: 1.2974 },
    ...overrides,
  }
}

export function page(overrides: Partial<BuildingPage> = {}): BuildingPage {
  return {
    count: 2,
    page: 1,
    page_size: 20,
    total_pages: 1,
    results: [
      building(),
      building({ id: 'b', name: null, list_entry: null, grade: 'II', location: null }),
    ],
    ...overrides,
  }
}

export function respond(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }))
}

/** Replaces fetch; returns the mock so tests can change responses and read the URLs. */
export function mockFetch(body: unknown = page()) {
  const fetchMock = vi.fn((_url: string) => respond(body))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export function lastUrl(fetchMock: ReturnType<typeof mockFetch>): string {
  const calls = fetchMock.mock.calls
  return calls[calls.length - 1]![0]
}

/** Mounts the whole app at `path`, with an in-memory router. */
export async function mountApp(path = '/') {
  const router = createAppRouter(createMemoryHistory())
  router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router }
}
