import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import SearchView from '@/views/SearchView.vue'

export const routes = [
  { path: '/', name: 'search', component: SearchView },
  {
    path: '/building/:id',
    name: 'building',
    component: () => import('@/views/BuildingDetailView.vue'),
    props: true,
  },
]

export function createAppRouter(history: RouterHistory = createWebHistory()) {
  return createRouter({
    history,
    routes,
    // Back/forward restores the scroll position; new pages start at the top.
    scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
  })
}
