<script setup lang="ts">
import { ref, useId, watch } from 'vue'
import { GRADES, type Grade } from '@/api/buildings'
import chevronIcon from '@/assets/icons/chevron-down.svg'
import type { Filters } from '@/utils/format'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  /** The filters behind the current results; the fields follow them (e.g. on Back). */
  filters: Filters
}>()
const emit = defineEmits<{ submit: [filters: Filters] }>()

const id = useId()
const q = ref(props.filters.q)
const grade = ref<Grade | ''>(props.filters.grade)
const nameInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.filters,
  (f) => {
    q.value = f.q
    grade.value = f.grade
  },
)

// Submit only (button or Enter); no search-as-you-type. Focus stays on the button.
function submit() {
  emit('submit', { q: q.value.trim(), grade: grade.value })
}

defineExpose({ focusName: () => nameInput.value?.focus() })
</script>

<template>
  <form
    role="search"
    aria-label="Search listed buildings"
    class="search-form"
    @submit.prevent="submit"
  >
    <div class="field field--name">
      <label :for="`${id}-q`" class="field__label">Building name</label>
      <p :id="`${id}-q-hint`" class="field__hint">For example: church, mill, farmhouse</p>
      <input
        :id="`${id}-q`"
        ref="nameInput"
        v-model="q"
        class="field__control"
        type="search"
        autocomplete="off"
        :aria-describedby="`${id}-q-hint`"
      />
    </div>

    <div class="field field--grade">
      <label :for="`${id}-grade`" class="field__label">Grade</label>
      <p :id="`${id}-grade-hint`" class="field__hint">I is highest, II most common</p>
      <div class="select">
        <select
          :id="`${id}-grade`"
          v-model="grade"
          class="field__control select__control"
          :aria-describedby="`${id}-grade-hint`"
        >
          <option value="">Any grade</option>
          <option v-for="g in GRADES" :key="g" :value="g">Grade {{ g }}</option>
        </select>
        <AppIcon class="select__chevron" :src="chevronIcon" :size="24" />
      </div>
    </div>

    <button type="submit" class="btn btn--primary search-form__submit">Search</button>
  </form>
</template>

<style scoped lang="scss" src="../styles/components/search-form.scss"></style>
