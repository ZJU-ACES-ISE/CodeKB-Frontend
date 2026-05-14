<script setup lang="ts">
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <header class="page-header">
    <div class="page-header-text">
      <h2>{{ title }}</h2>
      <p v-if="subtitle" class="kb-muted">{{ subtitle }}</p>
    </div>
    <div class="page-header-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 18px;
}

.page-header-text h2 {
  margin: 0 0 6px;
  font-size: 20px;
}

.page-header-text p {
  margin: 0;
}

.page-header-actions {
  display: flex;
  gap: 8px;
}
</style>
