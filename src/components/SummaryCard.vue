<script setup lang="ts">
import { computed } from 'vue';
import type { RepoSummary } from '@/types/api';
import { formatNumber } from '@/utils/format';

const props = defineProps<{
  summary: RepoSummary | null;
}>();

const frameworks = computed(() => props.summary?.frameworks ?? []);
const tags = computed(() => props.summary?.tags ?? []);
const entryFiles = computed(() => props.summary?.entryFiles ?? []);
</script>

<template>
  <el-card v-if="summary" shadow="never" class="summary-card">
    <div class="summary-grid">
      <div class="stat">
        <span class="stat-label">主语言</span>
        <span class="stat-value">{{ summary.primaryLanguage || '-' }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">文件数</span>
        <span class="stat-value">{{ formatNumber(summary.fileCount) }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">代码行数</span>
        <span class="stat-value">{{ formatNumber(summary.codeLineCount) }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">复杂度评分</span>
        <span class="stat-value">{{ summary.complexityScore ?? '-' }}</span>
      </div>
    </div>

    <div v-if="frameworks.length" class="summary-section">
      <span class="section-label">框架</span>
      <div class="kb-tag-line">
        <el-tag v-for="f in frameworks" :key="f" type="success" effect="plain">{{ f }}</el-tag>
      </div>
    </div>

    <div v-if="tags.length" class="summary-section">
      <span class="section-label">标签</span>
      <div class="kb-tag-line">
        <el-tag v-for="t in tags" :key="t" effect="plain">{{ t }}</el-tag>
      </div>
    </div>

    <div v-if="entryFiles.length" class="summary-section">
      <span class="section-label">入口文件</span>
      <div class="kb-tag-line">
        <el-tag v-for="f in entryFiles" :key="f" type="info" effect="plain">{{ f }}</el-tag>
      </div>
    </div>

    <div v-if="summary.summaryText" class="summary-section">
      <span class="section-label">摘要</span>
      <p class="summary-text">{{ summary.summaryText }}</p>
    </div>
  </el-card>
  <el-empty v-else description="暂无摘要数据" />
</template>

<style scoped>
.summary-card {
  border-radius: 10px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--kb-panel);
}

.stat-label {
  font-size: 12px;
  color: var(--kb-muted);
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
}

.summary-section {
  margin-top: 14px;
}

.section-label {
  display: block;
  font-size: 12px;
  color: var(--kb-muted);
  margin-bottom: 6px;
}

.summary-text {
  margin: 6px 0 0;
  line-height: 1.65;
  color: var(--kb-text);
  white-space: pre-wrap;
}
</style>
