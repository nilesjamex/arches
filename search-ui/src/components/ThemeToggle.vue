<script setup lang="ts">
import { computed, onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { gsap } from 'gsap'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'
import sunSvg from '@/assets/icons/sun.svg?raw'
import moonSvg from '@/assets/icons/moon.svg?raw'
import { useTheme } from '@/composables/useTheme'

gsap.registerPlugin(MorphSVGPlugin)

/** Pull the path data out of an icon file, so the .svg files stay the single source. */
function pathData(svg: string): string {
  return svg.match(/\sd="([^"]+)"/)?.[1] ?? ''
}

const SUN = pathData(sunSvg)
const MOON = pathData(moonSvg)

const { isDark, toggleTheme } = useTheme()

// The icon shows the theme you can switch TO: moon in light mode, sun in dark mode.
const iconFor = (dark: boolean) => (dark ? SUN : MOON)

// Set once and never re-bound, so Vue doesn't overwrite the path GSAP is animating.
const initialPath = iconFor(isDark.value)

const label = computed(() => (isDark.value ? 'Switch to light theme' : 'Switch to dark theme'))

const iconPath = useTemplateRef<SVGPathElement>('iconPath')
const iconSvg = useTemplateRef<SVGSVGElement>('iconSvg')

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// Watching the theme (not the click) also covers changes that follow the OS setting.
watch(isDark, (dark) => {
  const path = iconPath.value
  if (!path) return
  const target = iconFor(dark)

  gsap.killTweensOf([path, iconSvg.value])

  if (prefersReducedMotion()) {
    path.setAttribute('d', target)
    return
  }

  gsap.to(path, { morphSVG: target, duration: 0.5, ease: 'power2.inOut' })
  gsap.fromTo(
    iconSvg.value,
    { rotate: dark ? -90 : 90 },
    { rotate: 0, duration: 0.5, ease: 'power2.out', transformOrigin: '50% 50%' },
  )
})

onBeforeUnmount(() => {
  gsap.killTweensOf([iconPath.value, iconSvg.value])
})
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    :aria-label="label"
    :title="label"
    @click="toggleTheme"
  >
    <svg
      ref="iconSvg"
      class="theme-toggle__icon"
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path ref="iconPath" :d="initialPath" />
    </svg>
  </button>
</template>

<style scoped lang="scss" src="../styles/components/theme-toggle.scss"></style>
