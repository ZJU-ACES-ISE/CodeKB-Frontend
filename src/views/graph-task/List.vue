<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="title">&#22270;&#35299;&#26512;&#20219;&#21153;</h2>
        <p class="subtitle">&#26597;&#30475;&#20179;&#24211;&#20174;&#23548;&#20837;&#12289;&#25688;&#35201;&#35299;&#26512;&#21040;&#20851;&#32852;&#22270;&#26500;&#24314;&#30340;&#24403;&#21069;&#27969;&#31243;&#19982;&#20219;&#21153;&#21382;&#21490;</p>
      </div>
      <el-button @click="load" :loading="loading">&#21047;&#26032;</el-button>
    </div>

    <el-card class="filter-card" shadow="never">
      <div class="filter-grid">
        <el-select v-model="kbFilter" clearable placeholder="&#30693;&#35782;&#24211;" class="filter-item">
          <el-option v-for="kb in kbOptions" :key="kb" :label="kb" :value="kb" />
        </el-select>
        <el-select v-model="providerFilter" clearable placeholder="&#26469;&#28304;&#24179;&#21488;" class="filter-item">
          <el-option v-for="item in providerOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="repoStatusFilter" clearable placeholder="&#20179;&#24211;&#29366;&#24577;" class="filter-item">
          <el-option v-for="status in repoStatusOptions" :key="status" :label="repoStatusLabel(status)" :value="status" />
        </el-select>
        <el-select v-model="graphStatusFilter" clearable placeholder="&#22270;&#20219;&#21153;&#29366;&#24577;" class="filter-item">
          <el-option v-for="status in graphStatusOptions" :key="status" :label="graphTaskStatusLabel(status)" :value="status" />
        </el-select>
        <el-input v-model="keyword" clearable placeholder="&#25628;&#32034;&#20179;&#24211;&#21517; / &#20179;&#24211;&#22320;&#22336;" class="filter-item" />
      </div>
    </el-card>

    <el-card class="table-card" shadow="never">
      <el-table :data="pagedFlows" v-loading="loading" stripe :row-key="rowKey" @expand-change="onExpandChange">
        <el-table-column type="expand">
          <template #default="{ row }">
            <div class="expand-wrap">
              <div class="timeline-grid">
                <div class="timeline-item">
                  <div class="timeline-label">&#23548;&#20837;&#26102;&#38388;</div>
                  <div class="timeline-value">{{ formatDateTime(row.repo.createdAt) }}</div>
                </div>
                <div class="timeline-item">
                  <div class="timeline-label">&#25688;&#35201;&#23436;&#25104;&#26102;&#38388;</div>
                  <div class="timeline-value">{{ formatDateTime(row.summaryUpdatedAt || row.summaryCreatedAt) }}</div>
                </div>
                <div class="timeline-item">
                  <div class="timeline-label">&#26368;&#26032;&#22270;&#20219;&#21153;&#21019;&#24314;</div>
                  <div class="timeline-value">{{ formatDateTime(row.latestGraphTask?.createdAt) }}</div>
                </div>
                <div class="timeline-item">
                  <div class="timeline-label">&#26368;&#26032;&#22270;&#20219;&#21153;&#25552;&#20132;</div>
                  <div class="timeline-value">{{ formatDateTime(row.latestGraphTask?.submittedAt) }}</div>
                </div>
                <div class="timeline-item">
                  <div class="timeline-label">&#26368;&#26032;&#22270;&#20219;&#21153;&#23436;&#25104;</div>
                  <div class="timeline-value">{{ formatDateTime(row.latestGraphTask?.completedAt) }}</div>
                </div>
                <div class="timeline-item">
                  <div class="timeline-label">&#26368;&#36817;&#27963;&#21160;&#26102;&#38388;</div>
                  <div class="timeline-value">{{ formatDateTime(row.latestActivityAt) }}</div>
                </div>
              </div>

              <div class="history-header">
                <span class="history-title">&#22270;&#20219;&#21153;&#21382;&#21490;</span>
                <span class="history-count">{{ graphHistoryMap[row.repo.id]?.length || 0 }} &#26465;</span>
              </div>

              <el-table
                :data="graphHistoryMap[row.repo.id] || []"
                size="small"
                border
                v-loading="historyLoadingRepoId === row.repo.id"
                empty-text="&#26242;&#26080;&#22270;&#20219;&#21153;&#35760;&#24405;"
              >
                <el-table-column label="&#20219;&#21153; ID" prop="id" width="90" />
                <el-table-column label="&#29366;&#24577;" width="120">
                  <template #default="{ row: task }">
                    <el-tag size="small" :type="graphTaskStatusTagType(task.status)">
                      {{ graphTaskStatusLabel(task.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="&#22806;&#37096;&#29366;&#24577;" prop="externalStatusRaw" min-width="120">
                  <template #default="{ row: task }">{{ task.externalStatusRaw || '-' }}</template>
                </el-table-column>
                <el-table-column label="&#33410;&#28857;&#25968;" width="100" align="center">
                  <template #default="{ row: task }">{{ formatNumber(task.nodeCount) }}</template>
                </el-table-column>
                <el-table-column label="&#36793;&#25968;" width="100" align="center">
                  <template #default="{ row: task }">{{ formatNumber(task.edgeCount) }}</template>
                </el-table-column>
                <el-table-column label="&#21019;&#24314;&#26102;&#38388;" width="160">
                  <template #default="{ row: task }">{{ formatDateTime(task.createdAt) }}</template>
                </el-table-column>
                <el-table-column label="&#25552;&#20132;&#26102;&#38388;" width="160">
                  <template #default="{ row: task }">{{ formatDateTime(task.submittedAt) }}</template>
                </el-table-column>
                <el-table-column label="&#23436;&#25104;&#26102;&#38388;" width="160">
                  <template #default="{ row: task }">{{ formatDateTime(task.completedAt) }}</template>
                </el-table-column>
                <el-table-column label="&#38169;&#35823;&#20449;&#24687;" min-width="220">
                  <template #default="{ row: task }">{{ task.errorMessage || '-' }}</template>
                </el-table-column>
              </el-table>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="&#20179;&#24211;" min-width="320">
          <template #default="{ row }">
            <div class="repo-cell">
              <el-link class="repo-link" @click="router.push(`/repos/${row.repo.id}`)">{{ row.repo.name }}</el-link>
              <span class="repo-sub">{{ row.kbName }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="&#26469;&#28304;" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ providerLabel(row.repo.provider) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="&#24403;&#21069;&#38454;&#27573;" min-width="150">
          <template #default="{ row }">
            <div class="stage-cell">
              <div class="stage-head">
                <span>{{ row.currentStageLabel }}</span>
                <el-tag v-if="isRepoPolling(row.repo.id)" size="small" effect="plain" type="info" class="stage-polling">
                  &#36718;&#35810;&#20013;
                </el-tag>
              </div>
              <span v-if="row.errorMessage" class="stage-error">{{ row.errorMessage }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="&#20179;&#24211;&#29366;&#24577;" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="repoStatusTagType(row.repo.status)">{{ repoStatusLabel(row.repo.status) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="&#22270;&#35299;&#26512;&#20219;&#21153;" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="graphTaskStatusTagType(row.latestGraphTask?.status || 'NONE')">
              {{ graphTaskStatusLabel(row.latestGraphTask?.status || 'NONE') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="&#23548;&#20837;&#26102;&#38388;" width="160">
          <template #default="{ row }">{{ formatDateTime(row.repo.createdAt) }}</template>
        </el-table-column>

        <el-table-column label="&#25688;&#35201;&#23436;&#25104;" width="160">
          <template #default="{ row }">{{ formatDateTime(row.summaryUpdatedAt || row.summaryCreatedAt) }}</template>
        </el-table-column>

        <el-table-column label="&#22270;&#20219;&#21153;&#21019;&#24314;" width="160">
          <template #default="{ row }">{{ formatDateTime(row.latestGraphTask?.createdAt) }}</template>
        </el-table-column>

        <el-table-column label="&#22270;&#20219;&#21153;&#25552;&#20132;" width="160">
          <template #default="{ row }">{{ formatDateTime(row.latestGraphTask?.submittedAt) }}</template>
        </el-table-column>

        <el-table-column label="&#22270;&#20219;&#21153;&#23436;&#25104;" width="160">
          <template #default="{ row }">{{ formatDateTime(row.latestGraphTask?.completedAt) }}</template>
        </el-table-column>

        <el-table-column label="&#33410;&#28857;/&#36793;" width="120" align="center">
          <template #default="{ row }">
            {{ formatNumber(row.latestGraphTask?.nodeCount) }} / {{ formatNumber(row.latestGraphTask?.edgeCount) }}
          </template>
        </el-table-column>

        <el-table-column label="&#25805;&#20316;" width="140" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="router.push(`/repos/${row.repo.id}`)">&#35814;&#24773;</el-button>
            <el-button size="small" link type="success" @click="router.push(`/graph?repoId=${row.repo.id}`)">&#20851;&#32852;&#22270;</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :current-page="page"
          :page-size="pageSize"
          :total="filteredFlows.length"
          @current-change="page = $event"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { graphTaskFlowApi } from '@/api/graphTaskFlow'
import type { GraphTaskFlowItem } from '@/types/api'
import type { GraphTask } from '@/types/graph'
import { formatDateTime, formatNumber, graphTaskStatusLabel, graphTaskStatusTagType, repoStatusLabel, repoStatusTagType } from '@/utils/format'

const router = useRouter()
const loading = ref(false)
const isRefreshing = ref(false)
const flows = ref<GraphTaskFlowItem[]>([])
const graphHistoryMap = ref<Record<number, GraphTask[]>>({})
const historyLoadingRepoId = ref<number | null>(null)
const expandedRepoIds = ref<number[]>([])

const kbFilter = ref<string | null>(null)
const providerFilter = ref<string | null>(null)
const repoStatusFilter = ref<string | null>(null)
const graphStatusFilter = ref<string | null>(null)
const keyword = ref('')
const page = ref(1)
const pageSize = 12

const REPO_POLL_MAX_ATTEMPTS = 60
const REPO_POLL_INTERVAL_MS = 2000
const REPO_FINAL_STATUSES = new Set(['SUMMARIZED', 'FAILED'])
const GRAPH_FINAL_STATUSES = new Set(['READY', 'FAILED'])
const pollingRepoIds = ref<number[]>([])
let isActive = true

const providerOptions = [
  { label: 'GitHub', value: 'github' },
  { label: 'Gitee', value: 'gitee' },
  { label: 'GitLab', value: 'gitlab' },
  { label: '\u672c\u5730\u76ee\u5f55', value: 'local' },
  { label: 'ZIP \u4e0a\u4f20', value: 'zip' },
]

const repoStatusOptions = ['IMPORTED', 'SUMMARIZED', 'FAILED']
const graphStatusOptions = ['NONE', 'PENDING', 'SUBMITTED', 'BUILDING', 'READY', 'FAILED']

const kbOptions = computed(() => [...new Set(flows.value.map((item) => item.kbName))].sort((a, b) => a.localeCompare(b, 'zh-CN')))

const filteredFlows = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return flows.value.filter((item) => {
    if (kbFilter.value && item.kbName !== kbFilter.value) return false
    if (providerFilter.value && (item.repo.provider || '') !== providerFilter.value) return false
    if (repoStatusFilter.value && item.repo.status !== repoStatusFilter.value) return false
    const graphStatus = graphStatusOf(item)
    if (graphStatusFilter.value && graphStatus !== graphStatusFilter.value) return false
    if (!q) return true
    const haystack = `${item.repo.name} ${item.repo.githubUrl} ${item.kbName}`.toLowerCase()
    return haystack.includes(q)
  })
})

const pagedFlows = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredFlows.value.slice(start, start + pageSize)
})

watch([kbFilter, providerFilter, repoStatusFilter, graphStatusFilter, keyword], () => {
  page.value = 1
})

onMounted(() => {
  void load()
})

onBeforeUnmount(() => {
  isActive = false
})

async function load(options: { silent?: boolean } = {}) {
  if (isRefreshing.value) return
  isRefreshing.value = true
  const silent = Boolean((options as { silent?: boolean })?.silent)
  if (!silent) {
    loading.value = true
  }

  try {
    const list = await graphTaskFlowApi.list()
    flows.value = sortFlows(list.map(normalizeFlow))
    await refreshExpandedHistories()
    pollPendingFlows()
  } catch (e: any) {
    if (!silent) {
      ElMessage.error(e?.message || '\u52a0\u8f7d\u56fe\u89e3\u6790\u4efb\u52a1\u5931\u8d25')
    }
  } finally {
    isRefreshing.value = false
    if (!silent) {
      loading.value = false
    }
  }
}

async function onExpandChange(row: GraphTaskFlowItem, expandedRows: GraphTaskFlowItem[]) {
  expandedRepoIds.value = expandedRows.map((item) => item.repo.id)
  const expanded = expandedRepoIds.value.includes(row.repo.id)
  if (!expanded) return
  await loadGraphHistory(row.repo.id, true)
}

async function refreshExpandedHistories() {
  if (!expandedRepoIds.value.length) return
  for (const repoId of expandedRepoIds.value) {
    await loadGraphHistory(repoId, true, true)
  }
}

async function loadGraphHistory(repoId: number, force = false, silent = false) {
  if (!force && graphHistoryMap.value[repoId]) return
  if (historyLoadingRepoId.value === repoId) return

  historyLoadingRepoId.value = repoId
  try {
    const tasks = await graphTaskFlowApi.listGraphJobs(repoId)
    graphHistoryMap.value = { ...graphHistoryMap.value, [repoId]: tasks }
  } catch (e: any) {
    if (!silent) {
      ElMessage.error(e?.message || '\u52a0\u8f7d\u56fe\u4efb\u52a1\u5386\u53f2\u5931\u8d25')
    }
  } finally {
    historyLoadingRepoId.value = null
  }
}

function pollPendingFlows() {
  flows.value
    .filter((item) => !flowPollingSettled(item))
    .forEach((item) => void pollFlow(item.repo.id))
}

async function pollFlow(repoId: number) {
  if (isRepoPolling(repoId)) return
  setRepoPolling(repoId, true)
  try {
    for (let attempt = 0; attempt < REPO_POLL_MAX_ATTEMPTS && isActive; attempt += 1) {
      const flow = await refreshSingleFlowSnapshot(repoId)
      if (!flow) return
      if (flowPollingSettled(flow)) {
        return
      }
      await sleep(REPO_POLL_INTERVAL_MS)
    }
  } finally {
    setRepoPolling(repoId, false)
  }
}

async function refreshSingleFlowSnapshot(repoId: number) {
  const previous = flows.value.find((item) => item.repo.id === repoId) || null
  try {
    const flow = normalizeFlow(await graphTaskFlowApi.get(repoId))
    mergeFlowSnapshot(flow)
    if (expandedRepoIds.value.includes(repoId)) {
      await loadGraphHistory(repoId, true, true)
    }
    return flow
  } catch {
    return previous
  }
}

function normalizeFlow(item: GraphTaskFlowItem): GraphTaskFlowItem {
  const latestGraphTask = item.latestGraphTask ?? item.repo.latestGraphTask ?? null
  return {
    ...item,
    latestGraphTask,
    repo: {
      ...item.repo,
      latestGraphTask,
    },
  }
}

function mergeFlowSnapshot(nextFlow: GraphTaskFlowItem) {
  const normalized = normalizeFlow(nextFlow)
  const index = flows.value.findIndex((item) => item.repo.id === normalized.repo.id)
  if (index === -1) {
    flows.value = sortFlows([normalized, ...flows.value])
    return normalized
  }
  const merged = flows.value.map((item, idx) => (idx === index ? normalized : item))
  flows.value = sortFlows(merged)
  return normalized
}

function sortFlows(items: GraphTaskFlowItem[]) {
  return [...items].sort((left, right) => {
    const timeDiff = timestampValue(right.latestActivityAt) - timestampValue(left.latestActivityAt)
    if (timeDiff !== 0) return timeDiff
    return right.repo.id - left.repo.id
  })
}

function graphStatusOf(item?: GraphTaskFlowItem | null) {
  return item?.latestGraphTask?.status || 'NONE'
}

function repoStatusIsFinal(status?: string | null) {
  return REPO_FINAL_STATUSES.has(status || '')
}

function graphStatusIsFinal(graphStatus?: string | null, repoStatus?: string | null) {
  const normalized = graphStatus || 'NONE'
  if (GRAPH_FINAL_STATUSES.has(normalized)) return true
  return normalized === 'NONE' && repoStatus === 'FAILED'
}

function flowPollingSettled(item?: GraphTaskFlowItem | null) {
  if (!item) return false
  return repoStatusIsFinal(item.repo.status) && graphStatusIsFinal(graphStatusOf(item), item.repo.status)
}

function timestampValue(value?: string | null) {
  if (!value) return 0
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? 0 : ts
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isRepoPolling(repoId: number) {
  return pollingRepoIds.value.includes(repoId)
}

function setRepoPolling(repoId: number, active: boolean) {
  if (active) {
    if (!pollingRepoIds.value.includes(repoId)) {
      pollingRepoIds.value = [...pollingRepoIds.value, repoId]
    }
    return
  }
  pollingRepoIds.value = pollingRepoIds.value.filter((id) => id !== repoId)
}

function providerLabel(value?: string | null) {
  return { github: 'GitHub', gitee: 'Gitee', gitlab: 'GitLab', local: '\u672c\u5730\u76ee\u5f55', zip: 'ZIP \u4e0a\u4f20' }[value || ''] || (value || '-')
}

function rowKey(row: GraphTaskFlowItem) {
  return row.repo.id
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.title { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
.subtitle { color: #69758a; font-size: 14px; margin: 0; }
.filter-card, .table-card { border-radius: 10px; }
.filter-card { margin-bottom: 16px; }
.filter-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.filter-item { width: 100%; }
.repo-cell { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
.repo-link { font-weight: 600; max-width: 100%; }
.repo-sub { display: inline-flex; align-items: center; padding: 2px 10px; border-radius: 999px; background: #f1f5f9; border: 1px solid #dbe4f0; font-size: 12px; color: #516074; line-height: 1.4; }
.stage-cell { display: flex; flex-direction: column; gap: 4px; }
.stage-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.stage-polling { flex: 0 0 auto; }
.stage-error { font-size: 12px; color: #b3261e; line-height: 1.4; }
.expand-wrap { padding: 8px 8px 4px; }
.timeline-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
.timeline-item { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
.timeline-label { font-size: 12px; color: #69758a; margin-bottom: 4px; }
.timeline-value { font-size: 13px; color: #172033; }
.history-header { display: flex; justify-content: space-between; align-items: center; margin: 8px 0 10px; }
.history-title { font-size: 14px; font-weight: 600; }
.history-count { font-size: 12px; color: #69758a; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
@media (max-width: 1200px) {
  .filter-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .timeline-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 768px) {
  .page { padding: 16px; }
  .page-header { flex-direction: column; gap: 12px; }
  .filter-grid { grid-template-columns: 1fr; }
  .timeline-grid { grid-template-columns: 1fr; }
  .repo-cell { align-items: flex-start; }
}
</style>
