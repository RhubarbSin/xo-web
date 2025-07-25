<template>
  <UiCardTitle
    :left="t('vms', 2)"
    :level="UiCardTitleLevel.SubtitleWithUnderline"
    :right="t('top-#', { n: N_ITEMS })"
  />
  <NoDataError v-if="hasError" />
  <UiCardSpinner v-else-if="isLoading" />
  <NoResult v-else-if="isStatEmpty" />
  <UsageBar v-else :data :n-items="N_ITEMS" />
</template>

<script lang="ts" setup>
import NoDataError from '@/components/NoDataError.vue'
import NoResult from '@/components/NoResult.vue'
import UiCardSpinner from '@/components/ui/UiCardSpinner.vue'
import UiCardTitle from '@/components/ui/UiCardTitle.vue'
import UsageBar from '@/components/UsageBar.vue'
import { useStatStatus } from '@/composables/stat-status.composable'
import { getAvgCpuUsage } from '@/libs/utils'
import { useVmStore } from '@/stores/xen-api/vm.store'
import { UiCardTitleLevel } from '@/types/enums'
import { IK_VM_STATS } from '@/types/injection-keys'
import type { StatData } from '@/types/stat'
import { N_ITEMS } from '@/views/pool/PoolDashboardView.vue'
import { computed, inject } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { hasError, isFetching } = useVmStore().subscribe()

const stats = inject(
  IK_VM_STATS,
  computed(() => [])
)

const data = computed<StatData[]>(() => {
  const result: StatData[] = []

  stats.value.forEach(stat => {
    if (!stat.stats) {
      return
    }

    const avgCpuUsage = getAvgCpuUsage(stat.stats.cpus)

    if (avgCpuUsage === undefined) {
      return
    }

    result.push({
      id: stat.id,
      label: stat.name,
      value: avgCpuUsage,
    })
  })

  return result
})

const { isLoading, isStatEmpty } = useStatStatus(stats, data, isFetching)
</script>
