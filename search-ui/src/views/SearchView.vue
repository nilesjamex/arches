<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppAlert from '@/components/AppAlert.vue'
import BuildingCard from '@/components/BuildingCard.vue'
import PaginationNav from '@/components/PaginationNav.vue'
import SearchForm from '@/components/SearchForm.vue'
import SkeletonCard from '@/components/SkeletonCard.vue'
import { lastViewedBuildingId, useBuildingSearch } from '@/composables/useBuildingSearch'
import { useDelayedFlag } from '@/composables/useDelayedFlag'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { emptyResultsTitle, resultsSummary, type Filters } from '@/utils/format'

const SKELETON_COUNT = 6

const { applied, page, data, loading, error, search, goToPage, clear, retry } = useBuildingSearch()
const slowLoading = useDelayedFlag(loading, 500)

const form = ref<InstanceType<typeof SearchForm> | null>(null)
const resultsHeading = ref<HTMLHeadingElement | null>(null)

const hasFilters = computed(() => Boolean(applied.value.q || applied.value.grade))
const showResults = computed(() => !loading.value && !error.value && data.value)

// The live status line. Kept in the DOM at all times so screen readers hear changes.
const status = computed(() => {
  if (loading.value) return slowLoading.value ? 'Loading results…' : ''
  if (error.value || !data.value) return ''
  return resultsSummary(data.value, applied.value)
})

useDocumentTitle(() => (applied.value.q ? `Results for “${applied.value.q}”` : null))

// Where keyboard focus should go once the next results have loaded.
let focusAfterLoad: 'results' | 'name' | null = null

function onSubmit(filters: Filters) {
  search(filters) // focus stays on the Search button
}

function onPageChange(next: number) {
  focusAfterLoad = 'results'
  goToPage(next)
}

function showAll() {
  focusAfterLoad = 'name'
  clear()
}

watch(loading, async (isLoading) => {
  if (isLoading) return
  await nextTick()
  if (focusAfterLoad === 'results') resultsHeading.value?.focus()
  if (focusAfterLoad === 'name') form.value?.focusName()
  focusAfterLoad = null

  // Coming back from a building page: return focus to that building's link.
  if (lastViewedBuildingId.value) {
    document.getElementById(`building-link-${lastViewedBuildingId.value}`)?.focus()
    lastViewedBuildingId.value = null
  }
})
</script>

<template>
  <div class="search-page">
    <div class="intro">
      <p class="intro__eyebrow">National Heritage List for England · Sample</p>
      <h1 class="intro__title">Listed Buildings</h1>
      <p class="intro__lead">
        Search a sample of 501 listed buildings from the National Heritage List for England, held in
        an Arches heritage database.<span class="intro__lead-extra">
          Search by building name and filter by grade.</span
        >
      </p>
    </div>

    <SearchForm ref="form" :filters="applied" @submit="onSubmit" />

    <section class="results" aria-labelledby="results-heading">
      <div class="results__header">
        <h2 id="results-heading" ref="resultsHeading" class="results__title" tabindex="-1">
          Results
        </h2>
        <div class="results__summary">
          <p role="status" aria-live="polite" aria-atomic="true">{{ status }}</p>
          <button
            v-if="hasFilters && showResults && data!.count > 0"
            type="button"
            class="btn-link"
            @click="showAll"
          >
            Clear search
          </button>
        </div>
      </div>

      <ul v-if="loading" class="results__list" aria-busy="true">
        <li v-for="n in SKELETON_COUNT" :key="n"><SkeletonCard /></li>
      </ul>

      <AppAlert
        v-else-if="error"
        type="error"
        :title="
          error.kind === 'network'
            ? 'Could not reach the server'
            : 'The search could not be completed'
        "
        action-label="Try again"
        @action="retry"
      >
        {{
          error.kind === 'network' ? 'Please try again. Your search has been kept.' : error.message
        }}
      </AppAlert>

      <template v-else-if="data">
        <AppAlert
          v-if="data.count === 0"
          type="empty"
          :title="emptyResultsTitle(applied)"
          action-label="Show all buildings"
          @action="showAll"
        >
          Try a shorter or different word, check the spelling, or set Grade to “Any grade”.
        </AppAlert>

        <template v-else>
          <ul class="results__list">
            <li v-for="building in data.results" :key="building.id">
              <BuildingCard :building="building" />
            </li>
          </ul>
          <PaginationNav :page="page" :total-pages="data.total_pages" @change="onPageChange" />
        </template>
      </template>
    </section>
  </div>
</template>

<style scoped lang="scss" src="../styles/views/search-view.scss"></style>
