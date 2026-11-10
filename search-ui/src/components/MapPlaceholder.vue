<script setup lang="ts">
import mapPinIcon from '@/assets/icons/map-pin.svg'
import AppIcon from './AppIcon.vue'
</script>

<template>
  <!-- Static preview only; the coordinates are always given as text next to it. -->
  <div class="map" role="img" aria-label="Map showing the building location">
    <span class="map__road" />
    <AppIcon class="map__pin" :src="mapPinIcon" :size="40" />
  </div>
</template>

<style scoped lang="scss" src="../styles/components/map-placeholder.scss"></style>
