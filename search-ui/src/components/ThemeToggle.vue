<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    class="theme-toggle"
    role="switch"
    :aria-checked="isDark"
    @click="toggleTheme"
  >
    <span class="theme-toggle__label">Dark mode</span>
    <span class="theme-toggle__track" aria-hidden="true">
      <span class="theme-toggle__thumb" />
    </span>
  </button>
</template>

<style scoped lang="scss" src="../styles/components/theme-toggle.scss"></style>
