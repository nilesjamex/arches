import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import axe from 'axe-core'
import { lastUrl, mockFetch, mountApp, page, respond } from './helpers'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Search page', () => {
  it('loads every building on first view', async () => {
    const fetchMock = mockFetch()
    const { wrapper } = await mountApp()
    expect(lastUrl(fetchMock)).toBe('/api/buildings/')
    expect(wrapper.findAll('.card__name').map((h) => h.text())).toEqual([
      'Church of St Peter',
      'Unnamed building',
    ])
  })

  it('shows readable text for missing data, never blanks', async () => {
    mockFetch()
    const { wrapper } = await mountApp()
    const unnamed = wrapper.findAll('.card')[1]!
    expect(unnamed.text()).toContain('Not available')
    expect(unnamed.text()).toContain('Location not recorded')
  })

  it('puts the search in the URL and sends it to the API', async () => {
    const fetchMock = mockFetch()
    const { wrapper, router } = await mountApp()
    await wrapper.find('input[type=search]').setValue('  church ')
    await wrapper.find('select').setValue('II*')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ q: 'church', grade: 'II*' })
    expect(lastUrl(fetchMock)).toBe('/api/buildings/?q=church&grade=II*')
  })

  it('announces the result count in a polite live region', async () => {
    mockFetch(page({ count: 3 }))
    const { wrapper } = await mountApp('/?q=church&grade=II*')
    const status = wrapper.find('[role=status]')
    expect(status.attributes('aria-live')).toBe('polite')
    expect(status.text()).toBe('Showing 1–3 of 3 buildings matching “church”, Grade II*')
  })

  it('shows the empty state, and "Show all buildings" clears the search and focuses the name field', async () => {
    const fetchMock = mockFetch(page({ count: 0, total_pages: 0, results: [] }))
    const { wrapper, router } = await mountApp('/?q=mill&grade=I')
    expect(wrapper.find('[role=status]').text()).toBe('No buildings found')
    expect(wrapper.find('.alert__title').text()).toBe('No buildings match “mill” in Grade I')
    expect(wrapper.find('nav[aria-label=Pagination]').exists()).toBe(false)

    fetchMock.mockImplementation(() => respond(page()))
    await wrapper.find('.alert button').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({})
    expect(document.activeElement).toBe(wrapper.find('input[type=search]').element)
  })

  it('shows a network error as an alert, and Try again repeats the request', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))
    const { wrapper } = await mountApp('/?q=mill')
    expect(wrapper.find('[role=alert]').text()).toContain('Could not reach the server')

    await wrapper.find('[role=alert] button').trigger('click')
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(lastUrl(fetchMock)).toBe('/api/buildings/?q=mill')
    expect(wrapper.find('[role=alert]').exists()).toBe(false)
  })

  it('pages with the submitted filters and moves focus to the Results heading', async () => {
    const fetchMock = mockFetch(page({ count: 45, total_pages: 3 }))
    const { wrapper } = await mountApp('/?q=mill')
    await wrapper.find('input[type=search]').setValue('edited but not submitted')

    fetchMock.mockImplementation(() => respond(page({ count: 45, page: 2, total_pages: 3 })))
    await wrapper.findAll('nav button')[1]!.trigger('click')
    await flushPromises()

    expect(lastUrl(fetchMock)).toBe('/api/buildings/?q=mill&page=2')
    expect(document.activeElement?.id).toBe('results-heading')
    expect(wrapper.find('.pager__status').text()).toBe('Page 2 of 3')
  })

  it('disables Previous on the first page and Next on the last', async () => {
    mockFetch(page({ count: 3, total_pages: 1 }))
    const { wrapper } = await mountApp()
    const [prev, next] = wrapper.findAll('nav button')
    expect(prev!.attributes('disabled')).toBeDefined()
    expect(next!.attributes('disabled')).toBeDefined()
  })

  it('has no axe violations', async () => {
    mockFetch(page({ count: 45, total_pages: 3 }))
    await mountApp()
    const results = await axe.run(document.body, {
      // jsdom does no layout, so contrast must be checked in a real browser.
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })
})

describe('Theme toggle', () => {
  it('switches between light and dark and remembers the choice', async () => {
    mockFetch()
    localStorage.removeItem('theme')
    const { wrapper } = await mountApp()
    const toggle = wrapper.find('button[role=switch]')
    const start = toggle.attributes('aria-checked')

    await toggle.trigger('click')
    const now = start === 'true' ? 'light' : 'dark'
    expect(document.documentElement.dataset.theme).toBe(now)
    expect(localStorage.getItem('theme')).toBe(now)
    expect(toggle.attributes('aria-checked')).toBe(String(now === 'dark'))
  })
})
