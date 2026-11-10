import {
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import type { Map as MapboxMap, Marker } from 'mapbox-gl'
import type { Coordinates } from '@/api/buildings'
import { useTheme, type Theme } from './useTheme'

const STYLES: Record<Theme, string> = {
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
}
const ZOOM = 15

export type MapStatus = 'loading' | 'ready' | 'unavailable'

export function mapboxToken(): string {
  return import.meta.env.VITE_MAPBOX_TOKEN?.trim() ?? ''
}

/**
 * Shows an interactive Mapbox map in `container`, centred on `location` with a pin.
 * Mapbox is downloaded only when a map is actually shown. The map follows the light/dark
 * theme. Status is "unavailable" with no token, no WebGL, or a Mapbox error before load.
 */
export function useMapbox(
  container: Ref<HTMLElement | null>,
  location: MaybeRefOrGetter<Coordinates>,
  label: MaybeRefOrGetter<string>,
) {
  const status = ref<MapStatus>(mapboxToken() ? 'loading' : 'unavailable')
  const { theme } = useTheme()
  let map: MapboxMap | null = null
  let marker: Marker | null = null
  let unmounted = false

  function fail() {
    status.value = 'unavailable'
    map?.remove()
    map = null
  }

  onMounted(async () => {
    if (status.value === 'unavailable' || !container.value) return
    try {
      const [{ default: mapboxgl }] = await Promise.all([
        import('mapbox-gl'),
        import('mapbox-gl/dist/mapbox-gl.css'),
      ])
      if (unmounted || !container.value) return

      const { lon, lat } = toValue(location)
      mapboxgl.accessToken = mapboxToken()
      map = new mapboxgl.Map({
        container: container.value,
        style: STYLES[theme.value],
        center: [lon, lat],
        zoom: ZOOM,
        // Page scrolling is not hijacked: zoom with Ctrl + scroll, pan with two fingers.
        cooperativeGestures: true,
      })
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }))

      const pin = document.createElement('div')
      pin.className = 'map-marker'
      pin.setAttribute('aria-hidden', 'true')
      marker = new mapboxgl.Marker({ element: pin, anchor: 'bottom' })
        .setLngLat([lon, lat])
        .addTo(map)

      // The canvas takes keyboard focus (arrows pan, +/- zoom); give it a useful name.
      map.getCanvas().setAttribute('aria-label', toValue(label))

      map.on('load', () => (status.value = 'ready'))
      // e.g. an invalid token. Errors after load (a missing tile) leave the map usable.
      map.on('error', () => {
        if (status.value === 'loading') fail()
      })
    } catch {
      fail() // the library failed to download, or the browser has no WebGL
    }
  })

  watch(theme, (next) => map?.setStyle(STYLES[next]))

  watch(
    () => toValue(location),
    ({ lon, lat }) => {
      map?.jumpTo({ center: [lon, lat] })
      marker?.setLngLat([lon, lat])
    },
  )

  onBeforeUnmount(() => {
    unmounted = true
    map?.remove()
    map = null
  })

  return { status }
}
