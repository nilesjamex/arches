/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public Mapbox access token (starts with "pk."). Set it in .env.local. */
  readonly VITE_MAPBOX_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
