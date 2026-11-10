<template>
  <!-- Placeholder with the same size as a card, so nothing jumps when results arrive. -->
  <div class="skeleton" aria-hidden="true">
    <span class="skeleton__bar skeleton__bar--badge" />
    <span class="skeleton__bar skeleton__bar--title" />
    <span class="skeleton__bar skeleton__bar--title-short" />
    <span class="skeleton__meta">
      <span class="skeleton__bar skeleton__bar--meta" />
      <span class="skeleton__bar skeleton__bar--meta-long" />
    </span>
  </div>
</template>

<style scoped lang="scss" src="../styles/components/skeleton-card.scss"></style>
