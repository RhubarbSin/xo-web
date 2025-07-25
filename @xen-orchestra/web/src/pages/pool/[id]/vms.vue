<template>
  <VtsLoadingHero v-if="!isReady" type="page" />
  <UiCard v-else class="vms">
    <div class="pagination-container">
      <!-- TODO: update with item selection button when available -->
      <p class="typo-body-regular-small count">{{ t('n-vms', { n: vms.length }) }}</p>
      <UiTablePagination v-if="isReady" v-bind="paginationBindings" />
    </div>
    <VtsTable vertical-border>
      <thead>
        <tr>
          <ColumnTitle id="vm" :icon="faDesktop">{{ t('vm') }}</ColumnTitle>
          <ColumnTitle id="description" :icon="faAlignLeft">{{ t('vm-description') }}</ColumnTitle>
        </tr>
      </thead>
      <tbody>
        <tr v-for="vm in vmsRecords" :key="vm.id">
          <VtsCellObject :id="vm.data.id">
            <UiObjectLink :route="`/vm/${vm.data.id}/`">
              <template #icon>
                <UiObjectIcon size="medium" :state="vm.data.power_state.toLocaleLowerCase() as VmState" type="vm" />
              </template>
              {{ vm.data.name_label }}
            </UiObjectLink>
          </VtsCellObject>
          <VtsCellText>
            {{ vm.data.name_description }}
          </VtsCellText>
        </tr>
      </tbody>
    </VtsTable>
    <div class="pagination-container">
      <!-- TODO: update with item selection button when available -->
      <p class="typo-body-regular-small count">{{ t('n-vms', { n: vms.length }) }}</p>
      <UiTablePagination v-if="isReady" v-bind="paginationBindings" />
    </div>
  </UiCard>
</template>

<script lang="ts" setup>
import { useVmStore } from '@/stores/xo-rest-api/vm.store'
import type { XoPool } from '@/types/xo/pool.type'
import type { VmState } from '@core/types/object-icon.type'
import VtsCellObject from '@core/components/cell-object/VtsCellObject.vue'
import VtsCellText from '@core/components/cell-text/VtsCellText.vue'
import VtsLoadingHero from '@core/components/state-hero/VtsLoadingHero.vue'
import ColumnTitle from '@core/components/table/ColumnTitle.vue'
import VtsTable from '@core/components/table/VtsTable.vue'
import UiCard from '@core/components/ui/card/UiCard.vue'
import UiObjectIcon from '@core/components/ui/object-icon/UiObjectIcon.vue'
import UiObjectLink from '@core/components/ui/object-link/UiObjectLink.vue'
import UiTablePagination from '@core/components/ui/table-pagination/UiTablePagination.vue'
import { usePagination } from '@core/composables/pagination.composable'
import { defineTree } from '@core/composables/tree/define-tree'
import { useTree } from '@core/composables/tree.composable'
import { faAlignLeft, faDesktop } from '@fortawesome/free-solid-svg-icons'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  pool: XoPool
}>()

const { t } = useI18n()

const { isReady, records } = useVmStore().subscribe()

const vmsByPool = computed(() => records.value.filter(vm => vm.$pool === props.pool.id))

const definitions = computed(() =>
  defineTree(vmsByPool.value ?? [], {
    getLabel: 'name_label',
  })
)

const { nodes: vms } = useTree(definitions)
const { pageRecords: vmsRecords, paginationBindings } = usePagination('vms', vms)
</script>

<style lang="postcss" scoped>
.vms {
  margin: 1rem;
  gap: 0.8rem;
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .count {
    color: var(--color-neutral-txt-secondary);
  }
}
</style>
