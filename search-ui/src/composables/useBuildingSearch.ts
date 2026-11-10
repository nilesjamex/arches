import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { searchBuildings, type BuildingPage } from '@/api/buildings'
import type { Filters } from '@/utils/format'
import { parseSearchQuery, sameSearch, toSearchQuery, type SearchState } from '@/utils/searchQuery'
import { useRequest } from './useRequest'

// Remembered across route changes so the detail page can link back to the same results
// and the search page can return focus to the building the user opened.
export const lastSearchQuery = ref<LocationQueryRaw>({})
export const lastViewedBuildingId = ref<string | null>(null)

/** Search state is read from and written to the URL; this hook keeps the results in sync. */
export function useBuildingSearch() {
  const route = useRoute()
  const router = useRouter()
  const { data, loading, error, run } = useRequest<BuildingPage>()

  const state = computed<SearchState>(() => parseSearchQuery(route.query))
  // The filters behind the results on screen (not what is currently typed in the form).
  const applied = computed<Filters>(() => ({ q: state.value.q, grade: state.value.grade }))

  function load() {
    lastSearchQuery.value = toSearchQuery(state.value)
    return run((signal) => searchBuildings(state.value, signal))
  }

  watch(() => JSON.stringify(state.value), load, { immediate: true })

  function navigate(next: SearchState) {
    // Re-submitting the same search does not change the URL, so fetch again directly.
    if (sameSearch(next, state.value)) return load()
    return router.push({ query: toSearchQuery(next) })
  }

  return {
    applied,
    page: computed(() => state.value.page),
    data,
    loading,
    error,
    search: (filters: Filters) => navigate({ ...filters, page: 1 }),
    goToPage: (page: number) => navigate({ ...state.value, page }),
    clear: () => navigate({ q: '', grade: '', page: 1 }),
    retry: load,
  }
}
