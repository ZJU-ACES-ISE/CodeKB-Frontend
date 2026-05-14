<script setup lang="ts">
import { computed } from 'vue';
import type { KbRepo, KnowledgeBase } from '@/types/api';
import type { GraphPayload, GraphTask } from '@/types/graph';
import { formatStatus } from '@/utils/format';

interface Props {
  kbs?: KnowledgeBase[];
  kbId?: number | null;
  repos: KbRepo[];
  repoId: number | null;
  refValue: string;
  depth: number;
  jobIdInput: string;
  building: boolean;
  loading: boolean;
  polling: boolean;
  task: GraphTask | null;
  status: string;
  isError: boolean;
  graph: GraphPayload | null;
  visibleTypes: string[];
  maxNodes: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:kbId': [value: number | null];
  'update:repoId': [value: number | null];
  'update:refValue': [value: string];
  'update:depth': [value: number];
  'update:jobIdInput': [value: string];
  'update:visibleTypes': [value: string[]];
  'update:maxNodes': [value: number];
  build: [];
  refresh: [];
  load: [];
}>();

const typeCountList = computed(() => {
  const counts = props.graph?.metadata.graph_type_counts || {};
  return Object.keys(counts)
    .sort()
    .map((t) => ({ type: t, count: counts[t] }));
});

const statsLines = computed(() => {
  if (!props.graph) return [] as string[];
  const m = props.graph.metadata;
  const lines = [`节点总数: ${m.node_count}`, `边总数: ${m.edge_count}`];
  Object.entries(m.graph_type_counts).forEach(([k, v]) => lines.push(`${k}: ${v}`));
  return lines;
});

function onRepoChange(v: number | null) {
  emit('update:repoId', v);
}
</script>

<template>
  <aside class="graph-sidebar">
    <h1>Repository Graph Viewer</h1>

    <template v-if="kbs && kbs.length !== undefined">
      <h2>知识库</h2>
      <el-select
        :model-value="kbId"
        placeholder="选择知识库"
        style="width: 100%"
        clearable
        @update:model-value="emit('update:kbId', ($event as number | null))"
      >
        <el-option
          v-for="kb in kbs"
          :key="kb.id"
          :value="kb.id"
          :label="kb.name"
        />
      </el-select>
    </template>

    <h2>仓库</h2>
    <el-select
      :model-value="repoId"
      placeholder="从当前知识库选择"
      style="width: 100%"
      clearable
      @update:model-value="onRepoChange"
    >
      <el-option
        v-for="r in repos"
        :key="r.id"
        :value="r.id"
        :label="r.name"
      />
    </el-select>

    <div class="row">
      <div>
        <label>Ref</label>
        <el-input
          :model-value="refValue"
          placeholder="可选"
          @update:model-value="emit('update:refValue', $event)"
        />
      </div>
      <div>
        <label>Depth</label>
        <el-input-number
          :model-value="depth"
          :min="0"
          :max="1000"
          style="width: 100%"
          @update:model-value="emit('update:depth', ($event ?? 1) as number)"
        />
      </div>
    </div>

    <div class="row" style="margin-top: 12px">
      <el-button
        type="primary"
        :loading="building || polling"
        :disabled="!repoId"
        @click="emit('build')"
      >
        Build
      </el-button>
      <el-button :disabled="!task" @click="emit('refresh')">Refresh</el-button>
    </div>

    <label style="margin-top: 14px">Task ID</label>
    <el-input
      :model-value="jobIdInput"
      placeholder="粘贴已完成的 task id"
      @update:model-value="emit('update:jobIdInput', $event)"
    />
    <el-button style="margin-top: 8px; width: 100%" :loading="loading" @click="emit('load')">
      Load Graph
    </el-button>

    <div class="status" :class="{ 'is-error': isError }">{{ status || 'Idle' }}</div>

    <template v-if="task">
      <h2>当前任务</h2>
      <div class="kv">
        <span>Task ID</span><span>{{ task.id }}</span>
        <span>外部 Job</span><span>{{ task.graphJobId || '-' }}</span>
        <span>状态</span><span>{{ formatStatus(task.status) }} ({{ task.externalStatusRaw || '-' }})</span>
        <span>节点</span><span>{{ task.nodeCount ?? '-' }}</span>
        <span>边</span><span>{{ task.edgeCount ?? '-' }}</span>
      </div>
    </template>

    <h2>Visible Types</h2>
    <div v-if="typeCountList.length" class="checks">
      <el-checkbox-group
        :model-value="visibleTypes"
        @update:model-value="emit('update:visibleTypes', ($event as string[]) ?? [])"
      >
        <el-checkbox
          v-for="row in typeCountList"
          :key="row.type"
          :value="row.type"
          :label="`${row.type} (${row.count})`"
        />
      </el-checkbox-group>
    </div>
    <p v-else class="kb-muted" style="font-size: 12px; margin-top: 6px">尚未加载图</p>

    <h2>Limits</h2>
    <label>Max nodes rendered</label>
    <el-input-number
      :model-value="maxNodes"
      :min="50"
      :max="3000"
      :step="50"
      style="width: 100%"
      @update:model-value="emit('update:maxNodes', ($event ?? 700) as number)"
    />

    <h2>Stats</h2>
    <div class="stats">
      <p v-for="line in statsLines" :key="line">{{ line }}</p>
      <p v-if="!statsLines.length">No graph loaded.</p>
    </div>
  </aside>
</template>

<style scoped>
.graph-sidebar {
  border-right: 1px solid var(--kb-border);
  background: var(--kb-panel);
  padding: 16px;
  overflow: auto;
  height: 100%;
}

h1 {
  font-size: 18px;
  margin: 0 0 12px;
}

h2 {
  font-size: 12px;
  margin: 18px 0 8px;
  color: var(--kb-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

label {
  display: block;
  font-size: 12px;
  color: var(--kb-muted);
  margin: 12px 0 6px;
}

.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.status {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid var(--kb-border);
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  line-height: 1.5;
  color: var(--kb-muted);
  word-break: break-word;
  white-space: pre-wrap;
}

.status.is-error {
  color: var(--kb-danger);
  border-color: rgba(179, 38, 30, 0.4);
  background: rgba(179, 38, 30, 0.06);
}

.kv {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 4px 10px;
  font-size: 12px;
  background: #fff;
  border: 1px solid var(--kb-border);
  border-radius: 6px;
  padding: 10px;
}

.kv span:nth-child(odd) {
  color: var(--kb-muted);
}

.checks {
  margin-top: 6px;
}

.checks :deep(.el-checkbox) {
  margin-right: 0;
  display: flex;
  width: 100%;
  font-size: 12px;
  height: 24px;
}

.stats {
  font-size: 12px;
  line-height: 1.6;
  color: var(--kb-muted);
}

.stats p {
  margin: 2px 0;
}
</style>
