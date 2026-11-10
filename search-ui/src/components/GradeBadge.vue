<script setup lang="ts">
import type { Grade } from '@/api/buildings'
import { gradeLabel, gradeSpoken } from '@/utils/format'

defineProps<{ grade: Grade }>()

const modifier: Record<Grade, string> = { I: 'i', 'II*': 'ii-star', II: 'ii' }
</script>

<template>
  <!-- The text is always visible; colour is only a secondary cue. -->
  <span class="grade" :class="`grade--${modifier[grade]}`">
    <span aria-hidden="true">{{ gradeLabel(grade) }}</span>
    <span class="visually-hidden">{{ gradeSpoken(grade) }}</span>
  </span>
</template>

<style scoped lang="scss" src="../styles/components/grade-badge.scss"></style>
