<!-- 水平条形图 -->
<template>
  <div class="hbar-wrap">
    <div v-for="(item, i) in items" :key="i" class="hbar-row">
      <div class="hbar-label" :title="item.label">{{ item.label }}</div>
      <div class="hbar-track">
        <div
          class="hbar-fill"
          :style="{ width: (item.value / maxVal * 100) + '%', background: item.color }"
        />
      </div>
      <div class="hbar-val">{{ item.value }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Item { label: string; value: number; color: string }
const props = defineProps<{ data: Item[]; maxItems?: number }>()

const items = computed(() => (props.data || []).slice(0, props.maxItems ?? 8))
const maxVal = computed(() => Math.max(...items.value.map(i => i.value), 1))
</script>

<style scoped>
.hbar-wrap { display: flex; flex-direction: column; gap: 8px; }
.hbar-row { display: flex; align-items: center; gap: 8px; }
.hbar-label {
  width: 90px; font-size: 12px; color: #4a5568;
  text-align: right; flex-shrink: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.hbar-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
.hbar-fill { height: 100%; border-radius: 4px; transition: width .4s; }
.hbar-val { width: 32px; font-size: 12px; color: #69758a; text-align: right; }
</style>
