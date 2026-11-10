<script setup lang="ts">
import buildingIcon from '@/assets/icons/building.svg'
import AppIcon from './AppIcon.vue'
import ThemeToggle from './ThemeToggle.vue'
</script>

<template>
  <!-- The wordmark is not a heading; each page's H1 lives in <main>. -->
  <header class="site-header">
    <div class="site-header__inner">
      <RouterLink to="/" class="wordmark">
        <AppIcon :src="buildingIcon" :size="26" />
        <span class="wordmark__name">Listed Buildings Search</span>
        <!-- <span class="wordmark__note">Independent project</span> -->
      </RouterLink>

      <div class="site-header__actions">
        <!-- <a href="#about" class="site-header__about">
          <span>About<span class="site-header__about-long"> the data</span></span>
        </a> -->
        <ThemeToggle />
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss" src="../styles/components/site-header.scss"></style>
