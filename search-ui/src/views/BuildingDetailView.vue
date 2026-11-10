<script setup lang="ts">
import { computed, onMounted } from 'vue'
import AppAlert from '@/components/AppAlert.vue'
import AppIcon from '@/components/AppIcon.vue'
import GradeBadge from '@/components/GradeBadge.vue'
import BuildingMap from '@/components/BuildingMap.vue'
import arrowLeftIcon from '@/assets/icons/arrow-left-link.svg'
import externalIcon from '@/assets/icons/external.svg'
import externalOnButtonIcon from '@/assets/icons/external-on-button.svg'
import { useBuilding } from '@/composables/useBuilding'
import { lastSearchQuery, lastViewedBuildingId } from '@/composables/useBuildingSearch'
import { useDocumentTitle } from '@/composables/useDocumentTitle'
import { formatCoordinates, gradeLabel } from '@/utils/format'

const props = defineProps<{ id: string }>()

const { building, loading, error, reload } = useBuilding(() => props.id)

const name = computed(() => building.value?.name ?? 'Unnamed building')
const coordinates = computed(() => formatCoordinates(building.value?.location ?? null))
const notFound = computed(() => error.value?.status === 404)

useDocumentTitle(() => (building.value ? name.value : null))

// "Back to results" returns focus to this building's card.
onMounted(() => (lastViewedBuildingId.value = props.id))
</script>

<template>
  <div class="detail">
    <RouterLink :to="{ name: 'search', query: lastSearchQuery }" class="detail__back">
      <AppIcon :src="arrowLeftIcon" :size="20" />
      Back to results
    </RouterLink>

    <p v-if="loading" role="status" class="detail__loading">Loading building…</p>

    <template v-else-if="error">
      <h1 class="detail__title">{{ notFound ? 'Building not found' : 'Something went wrong' }}</h1>
      <AppAlert
        :type="notFound ? 'empty' : 'error'"
        :title="notFound ? 'We could not find that building' : 'Could not reach the server'"
        :action-label="notFound ? undefined : 'Try again'"
        @action="reload"
      >
        {{
          notFound
            ? 'The link may be out of date. Go back to the results to find it again.'
            : 'Please try again.'
        }}
      </AppAlert>
    </template>

    <template v-else-if="building">
      <div class="detail__heading">
        <GradeBadge v-if="building.grade" :grade="building.grade" />
        <h1 class="detail__title" :class="{ 'detail__title--unnamed': !building.name }">
          {{ name }}
        </h1>
      </div>

      <div class="detail__body">
        <dl class="facts">
          <div class="facts__row">
            <dt>Grade</dt>
            <dd>{{ building.grade ? gradeLabel(building.grade) : 'Not recorded' }}</dd>
          </div>
          <div class="facts__row">
            <dt>List entry</dt>
            <dd>
              <a
                v-if="building.list_entry && building.nhle_url"
                :href="building.nhle_url"
                class="facts__link"
                target="_blank"
                rel="noopener"
              >
                {{ building.list_entry }}
                <AppIcon :src="externalIcon" :size="18" />
                <span class="visually-hidden">(opens in new tab)</span>
              </a>
              <template v-else>Not available</template>
            </dd>
          </div>
          <div class="facts__row">
            <dt>Period</dt>
            <dd>{{ building.period ?? 'Not recorded' }}</dd>
          </div>
          <div class="facts__row">
            <dt>Location</dt>
            <dd>{{ coordinates ?? 'Location not recorded' }}</dd>
          </div>
        </dl>

        <div v-if="coordinates || building.nhle_url" class="detail__aside">
          <BuildingMap v-if="building.location" :location="building.location" :name="name" />
          <template v-if="building.nhle_url">
            <a
              :href="building.nhle_url"
              class="btn btn--primary detail__official"
              target="_blank"
              rel="noopener"
            >
              View official list entry
              <AppIcon :src="externalOnButtonIcon" :size="18" />
              <span class="visually-hidden">(opens in new tab)</span>
            </a>
            <p class="detail__note">Opens the Historic England website in a new tab.</p>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss" src="../styles/views/building-detail-view.scss"></style>
