<template>
  <div class="vm-vifs-table">
    <UiTitle>
      {{ t('vifs') }}
      <template #actions>
        <UiButton
          v-tooltip="t('coming-soon')"
          disabled
          :left-icon="faPlus"
          variant="secondary"
          accent="brand"
          size="medium"
        >
          {{ t('new-vif') }}
        </UiButton>
      </template>
    </UiTitle>
    <div class="container">
      <div class="table-actions">
        <UiQuerySearchBar @search="(value: string) => (searchQuery = value)" />
        <UiTableActions :title="t('table-actions')">
          <UiButton
            v-tooltip="t('coming-soon')"
            disabled
            :left-icon="faPowerOff"
            variant="tertiary"
            accent="brand"
            size="medium"
          >
            {{ t('change-state') }}
          </UiButton>
          <UiButton
            v-tooltip="t('coming-soon')"
            disabled
            :left-icon="faEdit"
            variant="tertiary"
            accent="brand"
            size="medium"
          >
            {{ t('edit') }}
          </UiButton>
          <UiButton
            v-tooltip="t('coming-soon')"
            disabled
            :left-icon="faTrash"
            variant="tertiary"
            accent="danger"
            size="medium"
          >
            {{ t('delete') }}
          </UiButton>
        </UiTableActions>
        <UiTopBottomTable :selected-items="0" :total-items="0">
          <UiTablePagination v-if="isReady" v-bind="paginationBindings" />
        </UiTopBottomTable>
      </div>
      <VtsDataTable :is-ready :has-error :no-data-message="vifs.length === 0 ? t('no-vif-detected') : undefined">
        <template #thead>
          <tr>
            <template v-for="column of visibleColumns" :key="column.id">
              <th v-if="column.id === 'checkbox'" class="checkbox">
                <div v-tooltip="t('coming-soon')">
                  <UiCheckbox disabled :v-model="areAllSelected" accent="brand" />
                </div>
              </th>
              <th v-else-if="column.id === 'more'" class="more">
                <UiButtonIcon v-tooltip="t('coming-soon')" :icon="faEllipsis" accent="brand" disabled size="small" />
              </th>
              <th v-else>
                <div v-tooltip class="text-ellipsis">
                  <VtsIcon accent="brand" :icon="headerIcon[column.id]" />
                  {{ column.label }}
                </div>
              </th>
            </template>
          </tr>
        </template>
        <template #tbody>
          <tr
            v-for="row of vifsRecords"
            :key="row.id"
            :class="{ selected: selectedVifId === row.id }"
            @click="selectedVifId = row.id"
          >
            <td
              v-for="column of row.visibleColumns"
              :key="column.id"
              class="typo-body-regular-small"
              :class="{ checkbox: column.id === 'checkbox' }"
            >
              <div v-if="column.id === 'checkbox'" v-tooltip="t('coming-soon')">
                <UiCheckbox v-model="selected" disabled accent="brand" :value="row.id" />
              </div>
              <UiButtonIcon
                v-else-if="column.id === 'more'"
                v-tooltip="t('coming-soon')"
                :icon="faEllipsis"
                accent="brand"
                disabled
                size="small"
              />
              <div v-else-if="column.id === 'status'" v-tooltip>
                <VtsConnectionStatus :status="column.value" />
              </div>
              <div v-else-if="column.id === 'network'" class="network">
                <!-- TODO Remove the span when the link works and the icon is fixed -->
                <!--
                  <UiComplexIcon size="medium" class="icon">
                    <VtsIcon :icon="faNetworkWired" accent="current" />
                    <VtsIcon accent="success" :icon="faCircle" :overlay-icon="faCheck" />
                  </UiComplexIcon>
                  <a v-tooltip href="" class="text-ellipsis">{{ column.value.name }}</a>
                 -->
                <span v-tooltip class="text-ellipsis">{{ column.value }}</span>
              </div>
              <div v-else-if="column.id === 'IP'" class="ip-addresses">
                <span v-tooltip class="text-ellipsis">{{ column.value[0] }}</span>
                <span v-if="column.value.length > 1" class="typo-body-regular-small more-ips">
                  {{ `+${column.value.length - 1}` }}
                </span>
              </div>
              <div v-else v-tooltip="{ placement: 'bottom-end' }" class="text-ellipsis">
                {{ column.value }}
              </div>
            </td>
          </tr>
        </template>
      </VtsDataTable>
      <VtsStateHero v-if="searchQuery && filteredVifs.length === 0" type="table" image="no-result">
        <div>{{ t('no-result') }}</div>
      </VtsStateHero>
      <UiTopBottomTable :selected-items="0" :total-items="0">
        <UiTablePagination v-if="isReady" v-bind="paginationBindings" />
      </UiTopBottomTable>
    </div>
  </div>
</template>

<script lang="ts" setup>
import useMultiSelect from '@/composables/multi-select.composable'
import type { XenApiNetwork, XenApiVif } from '@/libs/xen-api/xen-api.types'
import { useNetworkStore } from '@/stores/xen-api/network.store'
import { useVifStore } from '@/stores/xen-api/vif.store'
import { useVmGuestMetricsStore } from '@/stores/xen-api/vm-guest-metrics.store'
import { useVmStore } from '@/stores/xen-api/vm.store'
import VtsConnectionStatus from '@core/components/connection-status/VtsConnectionStatus.vue'
import VtsDataTable from '@core/components/data-table/VtsDataTable.vue'
import VtsIcon from '@core/components/icon/VtsIcon.vue'
import VtsStateHero from '@core/components/state-hero/VtsStateHero.vue'
import UiButton from '@core/components/ui/button/UiButton.vue'
import UiButtonIcon from '@core/components/ui/button-icon/UiButtonIcon.vue'
import UiCheckbox from '@core/components/ui/checkbox/UiCheckbox.vue'
import UiQuerySearchBar from '@core/components/ui/query-search-bar/UiQuerySearchBar.vue'
import UiTableActions from '@core/components/ui/table-actions/UiTableActions.vue'
import UiTablePagination from '@core/components/ui/table-pagination/UiTablePagination.vue'
import UiTitle from '@core/components/ui/title/UiTitle.vue'
import UiTopBottomTable from '@core/components/ui/top-bottom-table/UiTopBottomTable.vue'
import { usePagination } from '@core/composables/pagination.composable'
import { useRouteQuery } from '@core/composables/route-query.composable'
import { useTable } from '@core/composables/table.composable'
import { vTooltip } from '@core/directives/tooltip.directive'
import type { IconDefinition } from '@fortawesome/fontawesome-common-types'
import {
  faAlignLeft,
  faAt,
  faCaretDown,
  faEdit,
  faEllipsis,
  faHashtag,
  faPlus,
  faPowerOff,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { noop } from '@vueuse/shared'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { vifs } = defineProps<{
  vifs: XenApiVif[]
}>()

const { isReady, hasError } = useVifStore().subscribe()
const { getByOpaqueRef: getNetworkByOpaqueRef } = useNetworkStore().subscribe()
const { getByOpaqueRef: getGuestMetricsByOpaqueRef } = useVmGuestMetricsStore().subscribe()
const { getByOpaqueRef: getVmByOpaqueRef } = useVmStore().subscribe()

const { t } = useI18n()

const selectedVifId = useRouteQuery('id')

const vifsUuids = computed(() => vifs.map(vif => vif.uuid))

const { selected, areAllSelected } = useMultiSelect(vifsUuids)

const getNetworkName = (networkRef: XenApiNetwork['$ref']) => getNetworkByOpaqueRef(networkRef)?.name_label ?? ''

const getIpAddresses = (vif: XenApiVif) => {
  const vm = getVmByOpaqueRef(vif.VM)

  if (!vm) return []

  const guestMetrics = getGuestMetricsByOpaqueRef(vm.guest_metrics)

  if (!guestMetrics?.networks) return []

  return [...new Set(Object.values(guestMetrics.networks).sort())]
}

const searchQuery = ref('')

const filteredVifs = computed(() => {
  const searchTerm = searchQuery.value.trim().toLocaleLowerCase()

  if (!searchTerm) {
    return vifs
  }

  return vifs.filter(vif =>
    [...Object.values(vif), getNetworkName(vif.network)].some(value =>
      String(value).toLocaleLowerCase().includes(searchTerm)
    )
  )
})

const { visibleColumns, rows } = useTable('vifs', filteredVifs, {
  rowId: record => record.uuid,
  columns: define => [
    define('checkbox', noop, { label: '', isHideable: false }),
    define('network', record => getNetworkName(record.network), { label: t('network') }),
    define('device', record => t('vif-device', { device: record.device }), { label: t('device') }),
    define('status', record => (record.currently_attached ? 'connected' : 'disconnected'), { label: t('status') }),
    define('IP', record => getIpAddresses(record), { label: t('ip-addresses') }),
    define('MAC', { label: t('mac-addresses') }),
    define('MTU', { label: t('mtu') }),
    define('locking_mode', { label: t('locking-mode') }),
    define('more', noop, { label: '', isHideable: false }),
  ],
})

const { pageRecords: vifsRecords, paginationBindings } = usePagination('vifs', rows)

type VifHeader = 'network' | 'device' | 'status' | 'IP' | 'MAC' | 'MTU' | 'locking_mode'

const headerIcon: Record<VifHeader, IconDefinition> = {
  network: faAlignLeft,
  device: faAlignLeft,
  status: faPowerOff,
  IP: faAt,
  MAC: faAt,
  MTU: faHashtag,
  locking_mode: faCaretDown,
}
</script>

<style scoped lang="postcss">
.vm-vifs-table {
  display: flex;
  flex-direction: column;
  gap: 2.4rem;

  .container,
  .table-actions {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .network {
    display: flex;
    align-items: center;
    gap: 1.8rem;
  }

  .ip-addresses {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .more-ips {
      color: var(--color-neutral-txt-secondary);
    }
  }

  .checkbox,
  .more {
    width: 4.8rem;
  }

  .checkbox {
    text-align: center;
    line-height: 1;
  }
}
</style>
