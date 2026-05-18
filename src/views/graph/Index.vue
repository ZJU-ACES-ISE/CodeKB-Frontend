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
        <div class="toolbar-main">
          <el-button @click="handleFit">Fit</el-button>
          <el-button @click="clearDetail">Clear Detail</el-button>
          <span class="render-info">{{ renderInfo }}</span>
        </div>
        <div class="search-toolbar">
          <el-input
            v-model="searchQuery"
            clearable
            placeholder="搜索节点名称"
            class="search-input"
          />
          <el-select
            v-model="searchNodeTypes"
            multiple
            collapse-tags
            collapse-tags-tooltip
            clearable
            placeholder="节点类型"
            class="search-type-select"
          >
            <el-option
              v-for="type in nodeTypeOptions"
              :key="type"
              :label="type"
              :value="type"
            />
          </el-select>
          <el-button :disabled="!hasActiveSearch" @click="clearSearch">清空搜索</el-button>
        </div>
      </div>

      <div class="canvas-area">
        <GraphCanvas
          :graph="graph"
          :visible-types="visibleTypes"
          :max-nodes="maxNodes"
          :pinned-node-ids="effectivePinnedNodeIds"
          :matched-node-ids="effectiveMatchedNodeIds"
          :highlighted-edge-keys="effectiveHighlightedEdgeKeys"
          :focused-node-id="activeHighlightedNodeId"
          @select="onSelectNode"
          @select-edge="onSelectEdge"
          @blank-click="onCanvasBlankClick"
          @stats="onStats"
        />

        <div class="panel-window search-results-panel" :class="searchPanelClasses">
          <div class="panel-window-header">
            <div class="panel-window-title-group">
              <span class="panel-window-title">&#25628;&#32034;&#32467;&#26524;</span>
              <span class="search-results-count">{{ matchedNodes.length }} &#39033;</span>
            </div>
            <div class="panel-window-actions">
              <el-button
                text
                circle
                size="small"
                class="panel-action"
                :title="searchPanelMinimized ? '\u6062\u590d\u7a97\u53e3' : '\u6700\u5c0f\u5316\u7a97\u53e3'"
                :aria-label="searchPanelMinimized ? '\u6062\u590d\u641c\u7d22\u7ed3\u679c\u7a97\u53e3' : '\u6700\u5c0f\u5316\u641c\u7d22\u7ed3\u679c\u7a97\u53e3'"
                @click="toggleSearchPanelMinimized"
              >
                <el-icon>
                  <IconPlus v-if="searchPanelMinimized" />
                  <IconMinus v-else />
                </el-icon>
              </el-button>
            </div>
          </div>
          <div v-if="!searchPanelMinimized" class="panel-window-body">
            <div v-if="!hasActiveSearch" class="search-results-empty">&#35831;&#36755;&#20837;&#20851;&#38190;&#35789;&#65292;&#25110;&#20808;&#36873;&#25321;&#33410;&#28857;&#31867;&#22411;&#21518;&#20877;&#25628;&#32034;&#12290;</div>
            <div v-else-if="!matchedNodes.length" class="search-results-empty">&#26410;&#62789;&#21040;&#53305;&#9147;&#30340;&#33410;&#28857;&#12290;</div>
            <div v-else class="search-results-list">
              <button
                v-for="node in limitedMatchedNodes"
                :key="node.id"
                type="button"
                class="search-result-item"
                :class="{ active: activeHighlightedNodeId === node.id }"
                @mouseenter="hoverMatchedNode(node.id)"
                @mouseleave="clearHoveredMatchedNode()"
                @click="focusMatchedNode(node)"
              >
                <div class="search-result-name">{{ node.label || node.id }}</div>
                <div class="search-result-meta">
                  <span>{{ node.node_type || '-' }}</span>
                  <span>{{ node.graph_type }}</span>
                </div>
                <div class="search-result-path">{{ node.file_path || '-' }}</div>
              </button>
            </div>
          </div>
        </div>

        <!-- Details panel -->
        <div class="panel-window details-panel" :class="detailPanelClasses">
          <div class="panel-window-header">
            <div class="panel-window-title-group">
              <span class="panel-window-title">&#35814;&#24773;&#20449;&#24687;</span>
              <span class="panel-window-subtitle">{{ detailPanelSubtitle }}</span>
            </div>
            <div class="panel-window-actions">
              <el-button
                text
                circle
                size="small"
                class="panel-action"
                :class="{ active: detailPanelPinned }"
                :title="detailPanelPinned ? '\u53d6\u6d88\u56fa\u5b9a\u7a97\u53e3\u5185\u5bb9' : '\u56fa\u5b9a\u7a97\u53e3\u5185\u5bb9'"
                :aria-label="detailPanelPinned ? '\u53d6\u6d88\u56fa\u5b9a\u8be6\u60c5\u7a97\u53e3\u5185\u5bb9' : '\u56fa\u5b9a\u8be6\u60c5\u7a97\u53e3\u5185\u5bb9'"
                @click="toggleDetailPanelPinned"
              >
                <el-icon><IconTop /></el-icon>
              </el-button>
              <el-button
                text
                circle
                size="small"
                class="panel-action"
                :title="detailPanelMinimized ? '\u6062\u590d\u7a97\u53e3' : '\u6700\u5c0f\u5316\u7a97\u53e3'"
                :aria-label="detailPanelMinimized ? '\u6062\u590d\u8be6\u60c5\u7a97\u53e3' : '\u6700\u5c0f\u5316\u8be6\u60c5\u7a97\u53e3'"
                @click="toggleDetailPanelMinimized"
              >
                <el-icon>
                  <IconPlus v-if="detailPanelMinimized" />
                  <IconMinus v-else />
                </el-icon>
              </el-button>
            </div>
          </div>
          <div v-if="!detailPanelMinimized" class="panel-window-body">
            <template v-if="selectedNode">
              <div class="detail-title">{{ selectedNode.label || selectedNode.id }}</div>
              <div class="kv">
                <span class="k">ID</span><span>{{ selectedNode.id }}</span>
                <span class="k">Graph</span><span>{{ selectedNode.graph_type }}</span>
                <span class="k">Type</span><span>{{ selectedNode.node_type }}</span>
                <span class="k">File</span><span>{{ selectedNode.file_path || '-' }}</span>
                <span class="k">Lines</span><span>{{ selectedNode.start_line }} - {{ selectedNode.end_line }}</span>
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
            <div v-else class="detail-empty">&#35831;&#36873;&#25321;&#33410;&#28857;&#25110;&#36793;&#26597;&#30475;&#35814;&#32454;&#20449;&#24687;&#12290;</div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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
const searchQuery = ref('')
const searchNodeTypes = ref<string[]>([])
const focusedSearchNodeId = ref<string | null>(null)
const hoveredSearchNodeId = ref<string | null>(null)
const pinnedSearchNodeId = ref<string | null>(null)
const searchPanelMinimized = ref(false)
const detailPanelMinimized = ref(false)
const detailPanelPinned = ref(false)

const typeCountEntries = computed(() =>
  graph.value ? Object.entries(graph.value.metadata.graph_type_counts) : []
)

const detailPanelVisible = computed(() => !!selectedNode.value || !!selectedEdge.value)
const searchPanelVisible = computed(() => hasActiveSearch.value)

const searchPanelClasses = computed(() => ({
  visible: searchPanelVisible.value,
  minimized: searchPanelMinimized.value,
}))

const detailPanelClasses = computed(() => ({
  visible: detailPanelVisible.value,
  minimized: detailPanelMinimized.value,
  pinned: detailPanelPinned.value,
}))

const detailPanelSubtitle = computed(() => {
  if (selectedNode.value) return '\u8282\u70b9'
  if (selectedEdge.value) return '\u8fb9'
  return '\u5f53\u524d\u9009\u62e9'
})

const visibleNodeList = computed(() => {
  if (!graph.value) return [] as GraphNode[]
  return graph.value.nodes.filter((node) => visibleTypes.value.has(node.graph_type))
})

const nodeTypeOptions = computed(() => {
  const set = new Set<string>()
  visibleNodeList.value.forEach((node) => {
    if (node.node_type) set.add(node.node_type)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-CN'))
})

const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const selectedNodeTypeSet = computed(() => new Set(searchNodeTypes.value))
const hasActiveSearch = computed(() => Boolean(normalizedSearchQuery.value || searchNodeTypes.value.length))

const matchedNodes = computed(() => {
  if (!graph.value || !hasActiveSearch.value) return [] as GraphNode[]
  const query = normalizedSearchQuery.value
  const typeFilter = selectedNodeTypeSet.value
  return visibleNodeList.value.filter((node) => {
    if (typeFilter.size && !typeFilter.has(node.node_type || '')) return false
    if (!query) return true
    const text = `${node.label || ''} ${node.id}`.trim().toLowerCase()
    return text.includes(query)
  })
})

const limitedMatchedNodes = computed(() => matchedNodes.value.slice(0, 40))
const matchedNodeIds = computed(() => new Set(matchedNodes.value.map((node) => node.id)))

function edgeKey(edge: GraphEdge) {
  return [
    edge.source,
    edge.target,
    edge.edge_type || '',
    edge.relation || '',
    edge.source_location || '',
  ].join('__')
}

const highlightedEdgeKeys = computed(() => {
  if (!graph.value || !matchedNodeIds.value.size) return new Set<string>()
  const ids = matchedNodeIds.value
  const keys = new Set<string>()
  graph.value.edges.forEach((edge) => {
    if (ids.has(edge.source) || ids.has(edge.target)) {
      keys.add(edgeKey(edge))
    }
  })
  return keys
})

const pinnedNodeIds = computed(() => {
  if (!graph.value || !matchedNodeIds.value.size) return new Set<string>()
  const ids = new Set<string>(matchedNodeIds.value)
  graph.value.edges.forEach((edge) => {
    if (matchedNodeIds.value.has(edge.source) || matchedNodeIds.value.has(edge.target)) {
      ids.add(edge.source)
      ids.add(edge.target)
    }
  })
  return ids
})

const activeHighlightedNodeId = computed(() => hoveredSearchNodeId.value || pinnedSearchNodeId.value || null)

const activeNeighborNodeIds = computed(() => {
  if (!graph.value || !activeHighlightedNodeId.value) return new Set<string>()
  const activeId = activeHighlightedNodeId.value
  const ids = new Set<string>([activeId])
  graph.value.edges.forEach((edge) => {
    if (edge.source === activeId || edge.target === activeId) {
      ids.add(edge.source)
      ids.add(edge.target)
    }
  })
  return ids
})

const effectiveMatchedNodeIds = computed(() => {
  if (!activeHighlightedNodeId.value) return matchedNodeIds.value
  return activeNeighborNodeIds.value
})

const effectiveHighlightedEdgeKeys = computed(() => {
  if (!graph.value) return new Set<string>()
  if (!activeHighlightedNodeId.value) return highlightedEdgeKeys.value
  const activeId = activeHighlightedNodeId.value
  const keys = new Set<string>()
  graph.value.edges.forEach((edge) => {
    if (edge.source === activeId || edge.target === activeId) {
      keys.add(edgeKey(edge))
    }
  })
  return keys
})

const effectivePinnedNodeIds = computed(() => {
  if (!graph.value) return new Set<string>()
  if (!activeHighlightedNodeId.value) return pinnedNodeIds.value
  return activeNeighborNodeIds.value
})

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

watch([normalizedSearchQuery, searchNodeTypes], () => {
  if (!hasActiveSearch.value) {
    focusedSearchNodeId.value = null
    hoveredSearchNodeId.value = null
    pinnedSearchNodeId.value = null
    return
  }
  if (searchPanelMinimized.value) {
    searchPanelMinimized.value = false
  }
  if (pinnedSearchNodeId.value && matchedNodeIds.value.has(pinnedSearchNodeId.value)) {
    return
  }
  if (hoveredSearchNodeId.value && matchedNodeIds.value.has(hoveredSearchNodeId.value)) {
    return
  }
  focusedSearchNodeId.value = matchedNodes.value[0]?.id || null
})

watch(graph, () => {
  searchQuery.value = ''
  searchNodeTypes.value = []
  focusedSearchNodeId.value = null
  hoveredSearchNodeId.value = null
  pinnedSearchNodeId.value = null
  searchPanelMinimized.value = false
  detailPanelMinimized.value = false
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

async function onRepoChange(repoId: number | null) {
  if (!repoId) return
  selectedNode.value = null
  selectedEdge.value = null
  graph.value = null
  task.value = null
  try {
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
  maxNodes.value = maxNodes.value
}

function clearDetail() {
  selectedNode.value = null
  selectedEdge.value = null
}

function toggleSearchPanelMinimized() {
  searchPanelMinimized.value = !searchPanelMinimized.value
}

function toggleDetailPanelMinimized() {
  detailPanelMinimized.value = !detailPanelMinimized.value
}

function toggleDetailPanelPinned() {
  detailPanelPinned.value = !detailPanelPinned.value
}

function clearSearch() {
  searchQuery.value = ''
  searchNodeTypes.value = []
  focusedSearchNodeId.value = null
  hoveredSearchNodeId.value = null
  pinnedSearchNodeId.value = null
}

function hoverMatchedNode(nodeId: string) {
  hoveredSearchNodeId.value = nodeId
}

function clearHoveredMatchedNode() {
  hoveredSearchNodeId.value = null
}

function focusMatchedNode(node: GraphNode) {
  focusedSearchNodeId.value = node.id
  pinnedSearchNodeId.value = node.id
  if (detailPanelPinned.value) return
  selectedEdge.value = null
  selectedNode.value = node
  if (detailPanelMinimized.value) {
    detailPanelMinimized.value = false
  }
}

function onSelectNode(node: GraphNode) {
  if (detailPanelPinned.value) return
  selectedEdge.value = null
  selectedNode.value = node
  if (detailPanelMinimized.value) {
    detailPanelMinimized.value = false
  }
}

function onSelectEdge(edge: GraphEdge) {
  if (detailPanelPinned.value) return
  selectedNode.value = null
  selectedEdge.value = edge
  if (detailPanelMinimized.value) {
    detailPanelMinimized.value = false
  }
}

function onCanvasBlankClick() {
  pinnedSearchNodeId.value = null
  hoveredSearchNodeId.value = null
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

.main-area {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.toolbar {
  min-height: 48px;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid #d7dde8;
  background: #fff;
  flex-wrap: wrap;
}

.toolbar-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}

.search-input,
.search-type-select {
  width: 240px;
}

.render-info { font-size: 13px; color: #69758a; }

.canvas-area {
  position: relative;
  overflow: hidden;
  flex: 1;
}

.panel-window {
  position: absolute;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #d7dde8;
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(23, 32, 51, 0.12);
  display: none;
  overflow: hidden;
}

.panel-window.visible {
  display: flex;
  flex-direction: column;
}

.panel-window.minimized .panel-window-body {
  display: none;
}

.panel-window.pinned {
  box-shadow: 0 12px 36px rgba(37, 99, 235, 0.16);
}

.panel-window-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #edf2f7;
  background: rgba(248, 250, 252, 0.96);
}

.panel-window.minimized .panel-window-header {
  border-bottom: 0;
}

.panel-window-title-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.panel-window-title {
  font-size: 13px;
  font-weight: 600;
  color: #172033;
}

.panel-window-subtitle {
  font-size: 12px;
  color: #69758a;
}

.panel-window-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.panel-action {
  color: #69758a;
}

.panel-action :deep(.el-icon) {
  font-size: 14px;
}

.panel-action.active {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.12);
}

.panel-window-body {
  min-height: 0;
}

.search-results-panel {
  left: 16px;
  top: 16px;
  width: 320px;
  max-width: calc(100% - 32px);
  max-height: 360px;
  z-index: 9;
}

.search-results-count {
  font-size: 12px;
  color: #69758a;
  font-weight: 500;
}

.search-results-empty {
  padding: 20px 14px;
  font-size: 12px;
  color: #69758a;
  line-height: 1.6;
}

.search-results-list {
  overflow-y: auto;
}

.search-result-item {
  width: 100%;
  border: 0;
  border-bottom: 1px solid #edf2f7;
  background: transparent;
  text-align: left;
  padding: 12px 14px;
  cursor: pointer;
}

.search-result-item:last-child {
  border-bottom: 0;
}

.search-result-item:hover,
.search-result-item.active {
  background: #eff6ff;
}

.search-result-name {
  font-size: 13px;
  font-weight: 600;
  color: #172033;
  line-height: 1.4;
}

.search-result-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
  font-size: 12px;
  color: #69758a;
}

.search-result-path {
  margin-top: 4px;
  font-size: 12px;
  color: #4a5568;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.details-panel {
  right: 16px;
  top: 16px;
  width: min(420px, calc(100% - 32px));
  max-height: calc(100% - 32px);
  z-index: 10;
}

.details-panel .panel-window-body {
  overflow: auto;
  padding: 12px;
}

.detail-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; word-break: break-word; }
.detail-empty { padding: 16px 4px; font-size: 12px; color: #69758a; }

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

@media (max-width: 1080px) {
  .toolbar-main,
  .search-toolbar {
    width: 100%;
  }

  .search-input,
  .search-type-select {
    width: 100%;
  }

  .search-results-panel,
  .details-panel {
    left: 12px;
    right: 12px;
    width: auto;
    max-width: none;
  }

  .details-panel {
    top: auto;
    bottom: 12px;
  }
}
</style>
