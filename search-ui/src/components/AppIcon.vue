<script setup lang="ts">
// Decorative icon. The SVG file from Figma is used as a mask and filled with the current
// text colour, so icons follow the light/dark tokens without editing the asset.
import { computed } from 'vue'

const props = defineProps<{
  /** URL of an SVG from src/assets/icons. */
  src: string
  /** The SVG's own width/height in px. */
  size: number
}>()

// Double quotes: Vite inlines small SVGs as data: URIs that contain single quotes.
const style = computed(() => ({
  '--icon-url': `url("${props.src}")`,
  width: `${props.size}px`,
  height: `${props.size}px`,
}))
</script>

<template>
  <span class="icon" aria-hidden="true" :style="style" />
</template>

<style scoped lang="scss" src="../styles/components/app-icon.scss"></style>
