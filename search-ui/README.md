# search-ui

Vue 3 search page for the Listed Buildings API in `../historic`. The design comes from the
Figma file "Listed Buildings Search" (Desktop 1280, Tablet 768, Mobile 375; light and dark).

## Run

```sh
# 1. API (from ../historic, with the virtualenv active)
python manage.py runserver

# 2. This app
npm install
npm run dev          # http://localhost:5173, /api is proxied to Django on :8000
npm run test:unit    # Vitest + axe
npm run build        # type-check and production build
```

### Map on the building page (Mapbox)

Copy `.env.example` to `.env.local` and set `VITE_MAPBOX_TOKEN` to a public Mapbox token
(starts with `pk.`), then restart `npm run dev`. `.env.local` is git-ignored. Without a token,
or if Mapbox fails to load, the page shows the static map placeholder instead; the
coordinates are always listed as text either way.

## Where things live

```
src/
  api/buildings.ts          HTTP calls and API types only
  utils/                    Pure helpers, no Vue (easy to unit test)
    format.ts               Grade labels, coordinates, result summaries
    searchQuery.ts          Search state <-> URL query (?q=&grade=&page=)
  composables/              Reusable hooks
    useRequest.ts           One request at a time: cancels stale ones, tracks loading/error
    useBuildingSearch.ts    Search results kept in sync with the URL
    useBuilding.ts          One building for the detail page
    useTheme.ts             Light/dark theme, remembered per browser
    useDelayedFlag.ts       "true after N ms", for the slow-loading announcement
    useDocumentTitle.ts     Browser tab title per page
  components/               Presentational pieces (template + props only)
  views/                    Pages: SearchView (/) and BuildingDetailView (/building/:id)
  router/                   Routes
  assets/icons/             SVGs exported from Figma, used unedited
  styles/
    abstracts/              Breakpoints, type styles, mixins (no CSS output)
    base/                   Tokens (light + dark), resets, buttons
    components/, views/     One .scss per component/page, loaded with <style scoped src>
    main.scss               Global entry
```

Colours are CSS custom properties defined once in `styles/base/_tokens.scss`, with the same
names as the Figma variables. To change a colour, edit it there. Icons are drawn with
CSS masks in the current text colour, so they follow the theme automatically.
