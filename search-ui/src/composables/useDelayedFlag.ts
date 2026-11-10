import { onScopeDispose, ref, watch, type Ref } from 'vue'

/**
 * Becomes true only once `source` has stayed true for `delay` ms, and false as soon as it
 * goes false. Used so "Loading results…" is announced only for slow requests.
 */
export function useDelayedFlag(source: Ref<boolean>, delay = 500): Ref<boolean> {
  const flag = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(
    source,
    (on) => {
      clearTimeout(timer)
      if (on) timer = setTimeout(() => (flag.value = true), delay)
      else flag.value = false
    },
    { immediate: true },
  )

  onScopeDispose(() => clearTimeout(timer))
  return flag
}
