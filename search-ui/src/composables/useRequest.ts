import { onScopeDispose, ref, shallowRef } from 'vue'
import { ApiError } from '@/api/buildings'

export interface RequestError {
  /** "network": the server could not be reached. "api": it answered with an error. */
  kind: 'network' | 'api'
  status?: number
  message: string
}

function toRequestError(e: unknown): RequestError {
  if (e instanceof ApiError) return { kind: 'api', status: e.status, message: e.message }
  return { kind: 'network', message: 'Could not reach the server. Please try again.' }
}

/**
 * Runs one async request at a time: starting a new one cancels the previous one, so a slow
 * old response can never overwrite a newer one. Tracks data, loading and error state.
 */
export function useRequest<T>() {
  const data = shallowRef<T | null>(null)
  const loading = ref(false)
  const error = ref<RequestError | null>(null)
  let controller: AbortController | null = null

  async function run(request: (signal: AbortSignal) => Promise<T>): Promise<void> {
    controller?.abort()
    const current = new AbortController()
    controller = current
    loading.value = true
    error.value = null
    try {
      data.value = await request(current.signal)
    } catch (e) {
      if (current.signal.aborted) return
      data.value = null
      error.value = toRequestError(e)
    } finally {
      if (controller === current) loading.value = false
    }
  }

  onScopeDispose(() => controller?.abort())
  return { data, loading, error, run }
}
