import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import BuildingMap from '@/components/BuildingMap.vue'
import { useTheme } from '@/composables/useTheme'

// jsdom has no WebGL, so mapbox-gl is replaced with a small fake that records calls.
const fake = vi.hoisted(() => ({ maps: [] as FakeMap[] }))

interface FakeMap {
  options: Record<string, unknown>
  handlers: Record<string, () => void>
  canvas: HTMLCanvasElement
  setStyle: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
}

vi.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}))
vi.mock('mapbox-gl', () => {
  class Map {
    options: Record<string, unknown>
    handlers: Record<string, () => void> = {}
    canvas = document.createElement('canvas')
    setStyle = vi.fn()
    jumpTo = vi.fn()
    remove = vi.fn()
    constructor(options: Record<string, unknown>) {
      this.options = options
      fake.maps.push(this as unknown as FakeMap)
    }
    addControl() {}
    on(event: string, handler: () => void) {
      this.handlers[event] = handler
    }
    getCanvas() {
      return this.canvas
    }
  }
  class Marker {
    setLngLat() {
      return this
    }
    addTo() {
      return this
    }
  }
  class NavigationControl {}
  return { default: { Map, Marker, NavigationControl, accessToken: '' } }
})

const props = { location: { lat: 52.6309, lon: 1.2974 }, name: 'Church of St Peter' }

afterEach(() => {
  fake.maps.length = 0
  vi.unstubAllEnvs()
})

describe('BuildingMap', () => {
  it('shows the placeholder and never loads Mapbox when there is no token', async () => {
    vi.stubEnv('VITE_MAPBOX_TOKEN', '')
    const wrapper = mount(BuildingMap, { props })
    await flushPromises()
    expect(fake.maps).toHaveLength(0)
    expect(wrapper.find('[role=img]').exists()).toBe(true)
  })

  it('creates a map centred on the building, then replaces the placeholder', async () => {
    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.test')
    const wrapper = mount(BuildingMap, { props, attachTo: document.body })
    await flushPromises()

    const map = fake.maps[0]!
    expect(map.options).toMatchObject({
      center: [1.2974, 52.6309],
      zoom: 15,
      cooperativeGestures: true,
    })
    expect(map.canvas.getAttribute('aria-label')).toContain('Map of Church of St Peter')
    expect(wrapper.find('[role=img]').exists()).toBe(true) // still loading

    map.handlers.load!()
    await flushPromises()
    expect(wrapper.find('[role=img]').exists()).toBe(false)
    wrapper.unmount()
    expect(map.remove).toHaveBeenCalled()
  })

  it('falls back to the placeholder if Mapbox reports an error before loading', async () => {
    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.bad')
    const wrapper = mount(BuildingMap, { props })
    await flushPromises()
    fake.maps[0]!.handlers.error!()
    await flushPromises()
    expect(wrapper.find('[role=img]').exists()).toBe(true)
    expect(wrapper.find('.building-map__canvas').isVisible()).toBe(false)
  })

  it('switches the map style with the theme', async () => {
    vi.stubEnv('VITE_MAPBOX_TOKEN', 'pk.test')
    const { setTheme } = useTheme()
    setTheme('light')
    mount(BuildingMap, { props })
    await flushPromises()
    expect(fake.maps[0]!.options.style).toBe('mapbox://styles/mapbox/light-v11')

    setTheme('dark')
    await flushPromises()
    expect(fake.maps[0]!.setStyle).toHaveBeenCalledWith('mapbox://styles/mapbox/dark-v11')
  })
})
