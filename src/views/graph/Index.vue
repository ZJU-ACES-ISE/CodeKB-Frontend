<template>
  <div class="graph-page">
    <!-- Left sidebar -->
    <aside class="sidebar">
      <h1 class="sidebar-title">Repository Graph Viewer</h1>

      <label class="field-label">知识库</label>
      <el-select v-model="selectedKbId" placeholder="选择知识库" style="width:100%" @change="onKbChange">
        <el-option v-for="kb in kbList" :key="kb.id" :label="kb.name" :value="kb.id" />
      </el-select>

      <label class="field-label">仓库</label>
      <el-select v-model="selectedRepoId" placeholder="选择仓库" style="width:100%"
        :disabled="!selectedKbId" @change="onRepoChange">
        <el-option v-for="r in repoList" :key="r.id" :label="r.name" :value="r.id" />
      </el-select>

      <div class="row-2">
        <div>
          <label class="field-label">Ref</label>
          <el-input v-model="refVal" placeholder="可选" />
        </div>
        <div>
          <label class="field-label">Depth</label>
          <el-input-number v-model="depth" :min="0" :max="1000" style="width:100%" />
        </div>
      </div>

      <div class="row-2" style="margin-top:12px">
        <el-button type="primary" :loading="polling" :disabled="!selectedRepoId" @click="handleBuild">
          {{ graph ? '重新构建' : 'Build' }}
        </el-button>
        <el-button :disabled="!task" @click="handleRefresh">Refresh</el-button>
      </div>

      <label class="field-label">Job ID</label>
      <el-input :value="task?.graphJobId || ''" readonly placeholder="任务 ID" />

      <el-button style="width:100%;margin-top:8px" :disabled="task?.status !== 'READY'" @click="handleLoad">
        Load Graph
      </el-button>

      <div class="status-box" :class="{ error: task?.status === 'FAILED' }">
        <template v-if="polling">构图中... {{ task?.externalStatusRaw || task?.status }}</template>
        <template v-else-if="task">
          状态：{{ task.status }}
          <span v-if="task.nodeCount != null">（{{ task.nodeCount }} 节点 / {{ task.edgeCount }} 边）</span>
          <div v-if="task.errorMessage" style="margin-top:4px;color:#b3261e">{{ task.errorMessage }}</div>
        </template>
        <template v-else>空闲</template>
      </div>

      <h2 class="section-title">VISIBLE TYPES</h2>
      <div class="checks" v-if="typeCountEntries.length">
        <label v-for="[type, count] in typeCountEntries" :key="type" class="check-label">
          <input type="checkbox" :value="type" :checked="visibleTypes.has(type)"
            @change="toggleType(type)" />
          {{ type }} ({{ count }})
        </label>
      </div>
      <div v-else class="muted">加载图后显示</div>

      <h2 class="section-title">LIMITS</h2>
      <label class="field-label">Max nodes rendered</label>
      <el-input-number v-model="maxNodes" :min="50" :max="3000" style="width:100%" />

      <h2 class="section-title">STATS</h2>
      <div class="stats-text">
        <template v-if="graph">
          节点总数: {{ graph.metadata.node_count }}<br />
          边总数: {{ graph.metadata.edge_count }}<br />
          <span v-for="[k, v] in Object.entries(graph.metadata.graph_type_counts)" :key="k">
            {{ k }}: {{ v }}<br />
          </span>
        </template>
        <span v-else class="muted">未加载图数据</span>
      </div>
    </aside>

    <!-- Right area -->
    <main class="main-area">
      <div class="toolbar">
        <el-button @click="handleFit">Fit</el-button>
        <el-button @click="clearDetail">Clear Detail</el-button>
        <span class="render-info">{{ renderInfo }}</span>
      </div>

      <div class="canvas-area">
        <GraphCanvas
          :graph="graph"
          :visible-types="visibleTypes"
          :max-nodes="maxNodes"
          @select="onSelectNode"
          @select-edge="onSelectEdge"
          @stats="onStats"
        />

        <!-- Details panel -->
        <div class="details-panel" :class="{ visible: !!selectedNode || !!selectedEdge }">
          <template v-if="selectedNode">
            <div class="detail-title">{{ selectedNode.label || selectedNode.id }}</div>
            <div class="kv">
              <span class="k">ID</span><span>{{ selectedNode.id }}</span>
              <span class="k">Graph</span><span>{{ selectedNode.graph_type }}</span>
              <span class="k">Type</span><span>{{ selectedNode.node_type }}</span>
              <span class="k">File</span><span>{{ selectedNode.file_path || '-' }}</span>
              <span class="k">Lines</span><span>{{ selectedNode.start_line }} – {{ selectedNode.end_line }}</span>
            </div>
            <pre class="code-block">{{ selectedNode.code || '' }}</pre>
          </template>
          <template v-else-if="selectedEdge">
            <div class="detail-title">{{ edgeTitle }}</div>
            <div class="kv">
              <span class="k">Source</span><span>{{ edgeSourceLabel }}</span>
              <span class="k">Target</span><span>{{ edgeTargetLabel }}</span>
              <span class="k">Relation</span><span>{{ selectedEdge.relation || selectedEdge.edge_type || '-' }}</span>
              <span class="k">Edge Type</span><span>{{ selectedEdge.edge_type || '-' }}</span>
              <span class="k">Confidence</span><span>{{ selectedEdge.confidence || '-' }}</span>
              <span class="k">Score</span><span>{{ formatEdgeNumber(selectedEdge.confidence_score) }}</span>
              <span class="k">Source File</span><span>{{ selectedEdge.source_file || '-' }}</span>
              <span class="k">Source Loc</span><span>{{ selectedEdge.source_location || '-' }}</span>
              <span class="k">Weight</span><span>{{ formatEdgeNumber(selectedEdge.weight) }}</span>
              <span class="k">Context</span><span>{{ selectedEdge.context || '-' }}</span>
            </div>
          </template>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { knowledgeApi } from '@/api/knowledge'
import GraphCanvas from '@/components/GraphCanvas.vue'
import { useGraphJob } from '@/composables/useGraphJob'
import type { GraphEdge, GraphNode, GraphPayload } from '@/types/graph'
import type { KnowledgeBase, KbRepo } from '@/types/api'
import client from '@/api/client'

const route = useRoute()
const { task, graph, polling, error, build, refresh, load } = useGraphJob()

const kbList = ref<KnowledgeBase[]>([])
const repoList = ref<KbRepo[]>([])
const selectedKbId = ref<number | null>(null)
const selectedRepoId = ref<number | null>(null)
const refVal = ref('')
const depth = ref(1)
const maxNodes = ref(700)
const visibleTypes = ref<Set<string>>(new Set(['folder_structure', 'cross_file_deps', 'call_graph', 'class_inheritance']))
const selectedNode = ref<GraphNode | null>(null)
const selectedEdge = ref<GraphEdge | null>(null)
const renderInfo = ref('')

const typeCountEntries = computed(() =>
  graph.value ? Object.entries(graph.value.metadata.graph_type_counts) : []
)

const nodeIndex = computed(() => {
  const map = new Map<string, GraphNode>()
  graph.value?.nodes.forEach((node) => map.set(node.id, node))
  return map
})

const edgeSourceLabel = computed(() => {
  if (!selectedEdge.value) return '-'
  return nodeIndex.value.get(selectedEdge.value.source)?.label || selectedEdge.value.source
})

const edgeTargetLabel = computed(() => {
  if (!selectedEdge.value) return '-'
  return nodeIndex.value.get(selectedEdge.value.target)?.label || selectedEdge.value.target
})

const edgeTitle = computed(() => {
  if (!selectedEdge.value) return ''
  return `${edgeSourceLabel.value} -> ${edgeTargetLabel.value}`
})

onMounted(async () => {
  try {
    kbList.value = await knowledgeApi.list()
    // if repoId in query, try to preselect
    const qRepoId = route.query.repoId ? Number(route.query.repoId) : null
    if (qRepoId) {
      for (const kb of kbList.value) {
        const repos = await knowledgeApi.repos(kb.id)
        const found = repos.find(r => r.id === qRepoId)
        if (found) {
          selectedKbId.value = kb.id
          repoList.value = repos
          selectedRepoId.value = qRepoId
          await onRepoChange(qRepoId)
          break
        }
      }
    }
  } catch (e: any) { ElMessage.error(e?.message || '加载知识库失败') }
})

async function onKbChange(kbId: number) {
  selectedRepoId.value = null
  repoList.value = []
  graph.value = null
  selectedEdge.value = null
  selectedNode.value = null
  try { repoList.value = await knowledgeApi.repos(kbId) }
  catch (e: any) { ElMessage.error(e?.message || '加载仓库失败') }
}

// 选中仓库后自动尝试加载已有 READY 图，并回填 task 信息（Job ID / 状态）
async function onRepoChange(repoId: number | null) {
  if (!repoId) return
  selectedNode.value = null
  selectedEdge.value = null
  graph.value = null
  task.value = null
  try {
    // 并行拉图数据 + 任务元信息
    const [data, latestTask] = await Promise.allSettled([
      client.get<GraphPayload, GraphPayload>(`/graph/repos/${repoId}/latest`),
      client.get<any, any>(`/graph/repos/${repoId}/latest-task`),
    ])
    if (latestTask.status === 'fulfilled' && latestTask.value) {
      task.value = latestTask.value
    }
    if (data.status === 'fulfilled' && data.value) {
      graph.value = data.value
      applyDefaultVisibleTypes(data.value)
      ElMessage.success(`已加载关联图：${data.value.metadata.node_count} 节点 / ${data.value.metadata.edge_count} 边`)
    }
  } catch {
    // 没有已就绪图就静默，等用户 Build
  }
}

async function handleBuild() {
  if (!selectedRepoId.value) return
  await build(selectedRepoId.value, refVal.value || undefined, depth.value)
  if (error.value) {
    ElMessage.error(error.value)
    return
  }
  // 构建完成后自动加载图，省一步点击
  if (task.value?.status === 'READY') {
    await load(task.value.id)
    if (graph.value) {
      applyDefaultVisibleTypes(graph.value)
      ElMessage.success('构建完成并已加载图')
    }
  }
}

async function handleRefresh() {
  if (!task.value) return
  await refresh(task.value.id)
}

async function handleLoad() {
  if (!task.value) return
  await load(task.value.id)
  if (error.value) ElMessage.error(error.value)
  else if (graph.value) applyDefaultVisibleTypes(graph.value)
}

function applyDefaultVisibleTypes(g: GraphPayload) {
  const types = Object.keys(g.metadata.graph_type_counts)
  const defaults = new Set(['folder_structure', 'cross_file_deps', 'call_graph', 'class_inheritance'])
  const defaulted = types.filter(t => defaults.has(t))
  visibleTypes.value = new Set(defaulted.length ? defaulted : types.slice(0, 4))
}

function handleFit() {
  // re-trigger render by toggling a dummy value
  maxNodes.value = maxNodes.value
}

function clearDetail() {
  selectedNode.value = null
  selectedEdge.value = null
}

function onSelectNode(node: GraphNode) {
  selectedEdge.value = null
  selectedNode.value = node
}

function onSelectEdge(edge: GraphEdge) {
  selectedNode.value = null
  selectedEdge.value = edge
}

function toggleType(type: string) {
  const s = new Set(visibleTypes.value)
  s.has(type) ? s.delete(type) : s.add(type)
  visibleTypes.value = s
}

function onStats(stats: { nodes: number; edges: number }) {
  renderInfo.value = `Rendered ${stats.nodes} nodes and ${stats.edges} edges`
}

function formatEdgeNumber(value: number | null | undefined) {
  if (value == null) return '-'
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}
</script>

<style scoped>
.graph-page {
  display: grid;
  grid-template-columns: 280px 1fr;
  /* 撑满 el-main 并禁止页面滚动，让画布内部自行滚动 */
  height: calc(100vh - 60px);
  max-height: calc(100vh - 60px);
  overflow: hidden;
}

.sidebar {
  border-right: 1px solid #d7dde8;
  background: #f7f9fc;
  padding: 16px;
  overflow-y: auto;
  font-family: inherit;
}

.sidebar-title { font-size: 16px; font-weight: 700; margin: 0 0 16px; }

.field-label {
  display: block;
  font-size: 12px;
  color: #69758a;
  margin: 12px 0 5px;
}

.row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.section-title {
  font-size: 11px;
  color: #69758a;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin: 18px 0 8px;
}

.status-box {
  margin-top: 12px;
  padding: 10px;
  border: 1px solid #d7dde8;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: #69758a;
  word-break: break-word;
  min-height: 42px;
}
.status-box.error { color: #b3261e; }

.checks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px 10px;
}
.check-label {
  display: flex;
  gap: 5px;
  align-items: center;
  font-size: 12px;
  cursor: pointer;
}
.check-label input { cursor: pointer; }

.stats-text { font-size: 12px; color: #69758a; line-height: 1.7; }
.muted { color: #aaa; font-size: 12px; }

/* main */
.main-area {
  display: grid;
  grid-template-rows: auto 1fr;
  min-width: 0;
  overflow: hidden;
}

.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid #d7dde8;
  background: #fff;
}
.render-info { font-size: 13px; color: #69758a; margin-left: 8px; }

.canvas-area {
  position: relative;
  overflow: hidden;
}

/* Details panel — identical style to index.html */
.details-panel {
  position: absolute;
  right: 16px;
  top: 16px;
  width: min(420px, calc(100% - 32px));
  max-height: calc(100% - 32px);
  overflow: auto;
  border: 1px solid #d7dde8;
  border-radius: 8px;
  background: rgba(255,255,255,.96);
  box-shadow: 0 12px 34px rgba(30,40,60,.14);
  padding: 12px;
  display: none;
  z-index: 10;
}
.details-panel.visible { display: block; }

.detail-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; word-break: break-word; }

.kv {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 5px 10px;
  font-size: 12px;
}
.k { color: #69758a; }

.code-block {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 10px 0 0;
  padding: 10px;
  border-radius: 6px;
  background: #101828;
  color: #ecf2ff;
  font-size: 12px;
  max-height: 220px;
  overflow: auto;
}
</style>
