<template>
  <UiCard>
    <UiCardTitle>
      {{ t('network-throughput') }}
      <template #description>{{ t('last-week') }}</template>
    </UiCardTitle>
    <VtsLoadingHero v-if="loading" type="card" />
    <VtsErrorNoDataHero v-else-if="error" type="card" />
    <VtsNoDataHero v-else-if="networkUsage.length === 0" type="card" />
    <VtsLinearChart v-else :data="networkUsage" :max-value :value-formatter="byteFormatter" />
  </UiCard>
</template>

<script lang="ts" setup>
import { RRD_STEP_FROM_STRING } from '@/libs/xapi-stats.ts'
import type { LinearChartData } from '@core/types/chart.ts'
import VtsErrorNoDataHero from '@core/components/state-hero/VtsErrorNoDataHero.vue'
import VtsLoadingHero from '@core/components/state-hero/VtsLoadingHero.vue'
import VtsNoDataHero from '@core/components/state-hero/VtsNoDataHero.vue'
import UiCard from '@core/components/ui/card/UiCard.vue'
import UiCardTitle from '@core/components/ui/card-title/UiCardTitle.vue'
import { formatSizeRaw } from '@core/utils/size.util.ts'
import type { XapiVmStatsRaw } from '@vates/types/common'
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'

const { data } = defineProps<{
  data: {
    stats: XapiVmStatsRaw | undefined
    timestampStart: number
  }
  loading: boolean
  error?: string
}>()

const VtsLinearChart = defineAsyncComponent(() => import('@core/components/linear-chart/VtsLinearChart.vue'))

const { t } = useI18n()

const networkUsage = computed<LinearChartData>(() => {
  const { stats, timestampStart } = data

  const vifs = stats?.vifs

  if (!vifs) {
    return []
  }

  const addNetworkData = (type: 'rx' | 'tx') => {
    const vifArrays = Object.values(vifs[type])

    if (vifArrays.length === 0) {
      return { label: '', data: [] }
    }

    const data = Array.from({ length: vifArrays[0].length }, (_, hourIndex) => {
      const timestamp = (timestampStart + hourIndex * RRD_STEP_FROM_STRING.hours) * 1000
      const value = vifArrays.reduce((sum, arr) => sum + (arr[hourIndex] ?? NaN), 0)

      return {
        timestamp,
        // Sometimes we got infinity values in the result, we need to replace it with null
        value: Number.isFinite(value) ? value : null,
      }
    })

    return {
      label: type === 'rx' ? t('network-download') : t('network-upload'),
      data,
    }
  }

  return [addNetworkData('tx'), addNetworkData('rx')]
})

const maxValue = computed(() => {
  const values = networkUsage.value.reduce(
    (acc, series) => [...acc, ...series.data.map(item => item.value || 0)],
    [] as number[]
  )

  if (values.length === 0) {
    return 100
  }

  const maxUsage = Math.max(...values) * 1.2

  return Math.ceil(maxUsage / 100) * 100
})

const byteFormatter = (value: number | null) => {
  if (value === null) {
    return ''
  }

  const size = formatSizeRaw(value, 1)

  return `${size.value} ${size.prefix}`
}
</script>
