<template>
  <UiCard :horizontal="!uiStore.isMobile">
    <BackupRepository />
    <VtsDivider type="stretch" />
    <StorageRepository />
    <VtsDivider type="stretch" />
    <S3BackupRepository />
  </UiCard>
</template>

<script lang="ts" setup>
import BackupRepository from '@/components/site/dashboard/BackupRepository.vue'
import S3BackupRepository from '@/components/site/dashboard/S3BackupRepository.vue'
import StorageRepository from '@/components/site/dashboard/StorageRepository.vue'
import VtsDivider from '@core/components/divider/VtsDivider.vue'
import UiCard from '@core/components/ui/card/UiCard.vue'
import { useUiStore } from '@core/stores/ui.store'

const uiStore = useUiStore()
</script>
