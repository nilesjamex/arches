import { toValue, watchEffect, type MaybeRefOrGetter } from 'vue'

const SITE = 'Listed Buildings Search'

/** Keeps the browser tab title in sync; screen readers announce it on route changes. */
export function useDocumentTitle(title: MaybeRefOrGetter<string | null | undefined>) {
  watchEffect(() => {
    const page = toValue(title)
    document.title = page ? `${page} – ${SITE}` : SITE
  })
}
