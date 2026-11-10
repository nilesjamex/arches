import { computed, readonly, ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null // storage blocked (private mode, sandboxed iframe)
  }
}

function systemQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
}

function apply(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

// One shared theme for the whole app, so every component sees the same value.
const theme = ref<Theme>(storedTheme() ?? (systemQuery()?.matches ? 'dark' : 'light'))
apply(theme.value)

// Until the user picks a theme, follow the operating system as it changes.
systemQuery()?.addEventListener('change', (event) => {
  if (storedTheme()) return
  theme.value = event.matches ? 'dark' : 'light'
  apply(theme.value)
})

/** Light/dark theme. The choice is remembered per browser; the default follows the OS. */
export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')

  function setTheme(next: Theme) {
    theme.value = next
    apply(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not remembered, but still applied for this visit.
    }
  }

  function toggleTheme() {
    setTheme(isDark.value ? 'light' : 'dark')
  }

  return { theme: readonly(theme), isDark, setTheme, toggleTheme }
}
