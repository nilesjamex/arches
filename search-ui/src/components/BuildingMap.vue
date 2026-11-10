<script setup lang="ts">
import { ref } from 'vue'
import type { Coordinates } from '@/api/buildings'
import { useMapbox } from '@/composables/useMapbox'
import MapPlaceholder from './MapPlaceholder.vue'

const props = defineProps<{ location: Coordinates; name: string }>()

const container = ref<HTMLElement | null>(null)
const { status } = useMapbox(
  container,
  () => props.location,
  () => `Map of ${props.name}. Use the arrow keys to pan and plus or minus to zoom.`,
)
</script>

<template>
  <!-- The placeholder shows while Mapbox loads, and stays if it cannot load. -->
  <div class="building-map" :class="`building-map--${status}`">
    <div v-show="status !== 'unavailable'" ref="container" class="building-map__canvas" />
    <MapPlaceholder v-if="status !== 'ready'" class="building-map__placeholder" />
  </div>
</template>

<style scoped lang="scss" src="../styles/components/building-map.scss"></style>
