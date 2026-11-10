<script setup lang="ts">
import alertIcon from '@/assets/icons/alert.svg'
import searchIcon from '@/assets/icons/search.svg'
import AppIcon from './AppIcon.vue'

// "error" is announced at once (role="alert"). "empty" is announced by the results
// status line instead, so it has no live role of its own.
const props = defineProps<{
  type: 'error' | 'empty'
  title: string
  actionLabel?: string
}>()
defineEmits<{ action: [] }>()
</script>

<template>
  <div class="alert" :class="`alert--${type}`" :role="type === 'error' ? 'alert' : undefined">
    <span class="alert__accent" />
    <div class="alert__inner">
      <AppIcon class="alert__icon" :src="type === 'error' ? alertIcon : searchIcon" :size="24" />
      <div class="alert__content">
        <p class="alert__title">{{ props.title }}</p>
        <p class="alert__body"><slot /></p>
        <div v-if="actionLabel" class="alert__action">
          <button type="button" class="btn btn--secondary" @click="$emit('action')">
            {{ actionLabel }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss" src="../styles/components/app-alert.scss"></style>
