import { toValue, watch, type MaybeRefOrGetter } from 'vue'
import { fetchBuilding, type BuildingDetail } from '@/api/buildings'
import { useRequest } from './useRequest'

/** Loads one building by ID and reloads whenever the ID changes. */
export function useBuilding(id: MaybeRefOrGetter<string>) {
  const { data, loading, error, run } = useRequest<BuildingDetail>()
  const load = () => run((signal) => fetchBuilding(toValue(id), signal))

  watch(() => toValue(id), load, { immediate: true })

  return { building: data, loading, error, reload: load }
}
