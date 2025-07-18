<template>
  <VtsTreeItem v-if="host !== undefined" :expanded="isExpanded" class="infra-host-item">
    <UiTreeItemLabel
      :icon="faServer"
      :route="{ name: 'host.dashboard', params: { uuid: host.uuid } }"
      @toggle="toggle()"
    >
      {{ host.name_label || '(Host)' }}
      <template #addons>
        <VtsIcon v-if="isPoolMaster" v-tooltip="t('master')" accent="info" :icon="faCircle" :overlay-icon="faStar" />
        <UiCounter
          v-if="isReady"
          v-tooltip="t('running-vm', { count: vmCount })"
          :value="vmCount"
          accent="brand"
          variant="secondary"
          size="small"
        />
      </template>
    </UiTreeItemLabel>
    <template #sublist>
      <VtsTreeList>
        <InfraVmItems :host-opaque-ref="hostOpaqueRef" />
      </VtsTreeList>
    </template>
  </VtsTreeItem>
</template>

<script lang="ts" setup>
import InfraVmItems from '@/components/infra/InfraVmItems.vue'
import type { XenApiHost } from '@/libs/xen-api/xen-api.types'
import { useHostStore } from '@/stores/xen-api/host.store'
import { usePoolStore } from '@/stores/xen-api/pool.store'
import { useVmStore } from '@/stores/xen-api/vm.store'
import VtsIcon from '@core/components/icon/VtsIcon.vue'
import VtsTreeItem from '@core/components/tree/VtsTreeItem.vue'
import VtsTreeList from '@core/components/tree/VtsTreeList.vue'
import UiCounter from '@core/components/ui/counter/UiCounter.vue'
import UiTreeItemLabel from '@core/components/ui/tree-item-label/UiTreeItemLabel.vue'
import { vTooltip } from '@core/directives/tooltip.directive'
import { faCircle, faServer, faStar } from '@fortawesome/free-solid-svg-icons'
import { useToggle } from '@vueuse/shared'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { hostOpaqueRef } = defineProps<{
  hostOpaqueRef: XenApiHost['$ref']
}>()

const { t } = useI18n()

const { getByOpaqueRef } = useHostStore().subscribe()
const host = computed(() => getByOpaqueRef(hostOpaqueRef))

const { pool } = usePoolStore().subscribe()
const isPoolMaster = computed(() => pool.value?.master === hostOpaqueRef)

const { runningVms, isReady } = useVmStore().subscribe()

const vmCount = computed(() => runningVms.value.filter(vm => vm.resident_on === hostOpaqueRef)?.length ?? 0)

const [isExpanded, toggle] = useToggle(true)
</script>
