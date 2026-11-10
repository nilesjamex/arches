import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import axe from 'axe-core'
import { building, lastUrl, mockFetch, mountApp, page, respond } from './helpers'

afterEach(() => {
  document.body.innerHTML = ''
})

const detail = {
  ...building(),
  period: null,
  nhle_url: 'https://historicengland.org.uk/listing/the-list/list-entry/1175242',
}

describe('Building detail page', () => {
  it('shows the building as its own page with an H1 and a facts list', async () => {
    const fetchMock = mockFetch(detail)
    const { wrapper } = await mountApp('/building/a')
    expect(lastUrl(fetchMock)).toBe('/api/buildings/a/')
    expect(wrapper.find('h1').text()).toBe('Church of St Peter')
    const facts = wrapper.findAll('dd').map((d) => d.text())
    expect(facts).toEqual([
      'Grade I',
      '1175242 (opens in new tab)',
      'Not recorded',
      '52.6309° N, 1.2974° E',
    ])
    expect(wrapper.find('[role=img]').exists()).toBe(true)
  })

  it('hides the map when there is no location', async () => {
    mockFetch({ ...detail, location: null })
    const { wrapper } = await mountApp('/building/a')
    expect(wrapper.find('[role=img]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Location not recorded')
  })

  it('says when a building does not exist', async () => {
    mockFetch().mockImplementation(() => respond({ error: 'Building not found' }, 404))
    const { wrapper } = await mountApp('/building/zzz')
    expect(wrapper.find('h1').text()).toBe('Building not found')
  })

  it('"Back to results" returns to the same search and focuses the building', async () => {
    const fetchMock = mockFetch(page())
    const { wrapper, router } = await mountApp('/?q=church')

    fetchMock.mockImplementation(() => respond(detail))
    await wrapper.find('#building-link-a').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('building')

    fetchMock.mockImplementation(() => respond(page()))
    await wrapper.find('.detail__back').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ q: 'church' })
    expect(document.activeElement?.id).toBe('building-link-a')
  })

  it('has no axe violations', async () => {
    mockFetch(detail)
    await mountApp('/building/a')
    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
  })
})
