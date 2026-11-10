<script setup lang="ts">
import arrowLeftIcon from '@/assets/icons/arrow-left.svg'
import arrowRightIcon from '@/assets/icons/arrow-right.svg'
import AppIcon from './AppIcon.vue'

defineProps<{ page: number; totalPages: number; disabled?: boolean }>()
defineEmits<{ change: [page: number] }>()
</script>

<template>
  <nav aria-label="Pagination" class="pager">
    <button
      type="button"
      class="btn btn--secondary pager__button"
      :disabled="disabled || page <= 1"
      @click="$emit('change', page - 1)"
    >
      <AppIcon class="pager__arrow" :src="arrowLeftIcon" :size="20" />
      Previous<span class="visually-hidden"> page</span>
    </button>
    <p class="pager__status">Page {{ page }} of {{ Math.max(totalPages, 1) }}</p>
    <button
      type="button"
      class="btn btn--secondary pager__button"
      :disabled="disabled || page >= totalPages"
      @click="$emit('change', page + 1)"
    >
      Next<span class="visually-hidden"> page</span>
      <AppIcon class="pager__arrow" :src="arrowRightIcon" :size="20" />
    </button>
  </nav>
</template>

<style scoped lang="scss" src="../styles/components/pagination-nav.scss"></style>
