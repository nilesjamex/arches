<script setup lang="ts">
import { computed } from 'vue'
import type { Building } from '@/api/buildings'
import externalIcon from '@/assets/icons/external.svg'
import pinIcon from '@/assets/icons/pin.svg'
import { formatCoordinates, nhleUrl } from '@/utils/format'
import AppIcon from './AppIcon.vue'
import GradeBadge from './GradeBadge.vue'

const props = defineProps<{ building: Building }>()

const coordinates = computed(() => formatCoordinates(props.building.location))
</script>

<template>
  <article class="card">
    <GradeBadge v-if="building.grade" :grade="building.grade" />

    <!-- The name link is stretched over the whole card (see ::after in the styles). -->
    <h3 class="card__name">
      <RouterLink
        :id="`building-link-${building.id}`"
        :to="{ name: 'building', params: { id: building.id } }"
        class="card__link"
        :class="{ 'card__link--unnamed': !building.name }"
      >
        {{ building.name ?? 'Unnamed building' }}
      </RouterLink>
    </h3>

    <div class="card__meta">
      <p class="card__row card__row--entry">
        <span>List entry</span>
        <a
          v-if="building.list_entry"
          :href="nhleUrl(building.list_entry)"
          class="card__entry-link"
          target="_blank"
          rel="noopener"
        >
          {{ building.list_entry }}
          <AppIcon :src="externalIcon" :size="18" />
          <span class="visually-hidden">(opens in new tab)</span>
        </a>
        <span v-else>Not available</span>
      </p>
      <p class="card__row card__row--location">
        <AppIcon :src="pinIcon" :size="18" />
        <span>{{ coordinates ?? 'Location not recorded' }}</span>
      </p>
    </div>
  </article>
</template>

<style scoped lang="scss" src="../styles/components/building-card.scss"></style>
