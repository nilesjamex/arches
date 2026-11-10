<script setup lang="ts">
import SiteFooter from '@/components/SiteFooter.vue'
import SiteHeader from '@/components/SiteHeader.vue'
</script>

<template>
  <a class="skip-link" href="#main">Skip to main content</a>
  <SiteHeader />
  <main id="main" class="page" tabindex="-1">
    <RouterView />
  </main>
  <SiteFooter />
</template>

<style scoped lang="scss" src="./styles/views/app.scss"></style>
