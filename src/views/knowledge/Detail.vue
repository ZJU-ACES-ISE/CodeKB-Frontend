<template>
  <div class="page">
    <div v-if="loadError" class="state-wrap">
      <el-result
        icon="warning"
        title="无法访问该知识库"
        :sub-title="loadError"
      >
        <template #extra>
          <el-button @click="router.replace('/knowledge')">返回知识库列表</el-button>
          <el-button type="primary" @click="initialize">重试</el-button>
        </template>
      </el-result>
    </div>

    <template v-else>
      <div class="page-header">
        <div>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/knowledge' }">知识库</el-breadcrumb-item>
            <el-breadcrumb-item>{{ kb?.name || '...' }}</el-breadcrumb-item>
          </el-breadcrumb>
          <h2 style="margin: 8px 0 0">{{ kb?.name }}</h2>
          <p v-if="kb?.description" style="color: #69758a; margin: 4px 0 0">{{ kb.description }}</p>
        </div>
        <div class="header-actions">
          <el-button @click="openKbEdit">编辑信息</el-button>
          <el-button @click="importDialogVisible = true">导入仓库</el-button>
          <el-button type="primary" plain @click="batchImportDialogVisible = true">批量导入</el-button>
          <el-button
            type="danger"
            plain
            :disabled="selectedRepoIds.length === 0"
            :loading="batchDeleting"
            @click="batchDeleteSelected"
          >
            批量删除
          </el-button>
        </div>
      </div>

      <el-table
        :data="repos"
        v-loading="loading"
        stripe
        row-class-name="repo-row"
        @selection-change="handleSelectionChange"
        @row-click="handleRowClick"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column label="仓库名" prop="name" min-width="160">
          <template #default="{ row }">
            <el-link style="cursor: pointer" @click.stop="router.push(`/repos/${row.id}`)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="语言" prop="language" width="100">
          <template #default="{ row }">
            <span>{{ row.language || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="Stars" prop="starCount" width="90" align="center">
          <template #default="{ row }">{{ row.starCount != null ? row.starCount : '-' }}</template>
        </el-table-column>
        <el-table-column label="仓库状态" width="130">
          <template #default="{ row }">
            <el-tag :type="repoStatusTagType(row.status)" size="small">{{ repoStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="图任务状态" width="140">
          <template #default="{ row }">
            <el-tag
              size="small"
              effect="plain"
              :type="graphTaskStatusTagType(row.latestGraphTask?.status || 'NONE')"
            >
              {{ graphTaskStatusLabel(row.latestGraphTask?.status || 'NONE') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click.stop="router.push(`/repos/${row.id}`)">详情</el-button>
            <el-button size="small" link type="success" @click.stop="router.push(`/graph?repoId=${row.id}`)">关联图</el-button>
            <el-button size="small" link type="danger" @click.stop="confirmDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <ImportRepoDialog
        v-model:visible="importDialogVisible"
        :kb-id="Number(kbId)"
        @imported="handleImported"
      />
      <BatchImportRepoDialog
        v-model:visible="batchImportDialogVisible"
        :kb-id="Number(kbId)"
        @imported="handleBatchImported"
      />

      <el-dialog v-model="kbEditVisible" title="编辑知识库" width="440px" destroy-on-close>
        <el-form :model="kbEditForm" label-position="top">
          <el-form-item label="名称">
            <el-input v-model="kbEditForm.name" placeholder="知识库名称" maxlength="100" show-word-limit />
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              v-model="kbEditForm.description"
              type="textarea"
              :rows="3"
              placeholder="可选"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="kbEditVisible = false">取消</el-button>
          <el-button type="primary" :loading="kbEditSaving" @click="saveKbMeta">保存</el-button>
        </template>
      </el-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { knowledgeApi } from '@/api/knowledge'
import { repoApi } from '@/api/repo'
import BatchImportRepoDialog from '@/components/BatchImportRepoDialog.vue'
import ImportRepoDialog from '@/components/ImportRepoDialog.vue'
import type {
  BatchDeleteResponse,
  BatchImportResponse,
  ImportRepoResponse,
  KbRepo,
  KnowledgeBase,
} from '@/types/api'
import { graphTaskStatusLabel, graphTaskStatusTagType, repoStatusLabel, repoStatusTagType } from '@/utils/format'

const props = defineProps<{ kbId: string }>()
const router = useRouter()
const kb = ref<KnowledgeBase | null>(null)
const repos = ref<KbRepo[]>([])
const loading = ref(true)
const loadError = ref('')
const importDialogVisible = ref(false)
const batchImportDialogVisible = ref(false)
const kbEditVisible = ref(false)
const kbEditSaving = ref(false)
const batchDeleting = ref(false)
const selectedRepoIds = ref<number[]>([])
const kbEditForm = reactive({ name: '', description: '' })
const REPO_POLL_MAX_ATTEMPTS = 60
const REPO_POLL_INTERVAL_MS = 2000
const pollingRepoIds = new Set<number>()
const retriedRepoIds = new Set<number>()
let isActive = true

onUnmounted(() => {
  isActive = false
})

onMounted(() => {
  void initialize()
})

function openKbEdit() {
  if (!kb.value) return
  kbEditForm.name = kb.value.name
  kbEditForm.description = kb.value.description ?? ''
  kbEditVisible.value = true
}

function handleSelectionChange(selection: KbRepo[]) {
  selectedRepoIds.value = selection.map((item) => item.id)
}

function handleRowClick(row: KbRepo) {
  router.push(`/repos/${row.id}`)
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function pollImportedRepos() {
  repos.value
    .filter((repo) => repo.status === 'IMPORTED')
    .forEach((repo) => void pollImportedRepo(repo.id))
}

async function saveKbMeta() {
  const name = kbEditForm.name.trim()
  if (!name) {
    ElMessage.warning('请填写名称')
    return
  }
  kbEditSaving.value = true
  try {
    kb.value = await knowledgeApi.update(Number(props.kbId), {
      name,
      description: kbEditForm.description.trim() || undefined,
    })
    ElMessage.success('已保存')
    kbEditVisible.value = false
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    kbEditSaving.value = false
  }
}

async function initialize() {
  loadError.value = ''
  loading.value = true
  try {
    kb.value = await knowledgeApi.get(Number(props.kbId))
    await loadRepos()
    pollImportedRepos()
  } catch (e: unknown) {
    kb.value = null
    repos.value = []
    loadError.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadRepos(showLoading = true) {
  if (showLoading) loading.value = true
  try {
    repos.value = await knowledgeApi.repos(Number(props.kbId))
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载仓库失败')
  } finally {
    if (showLoading) loading.value = false
  }
}

async function handleImported(result: ImportRepoResponse) {
  if (result.action === 'DUPLICATE') {
    const repoLabel = result.repoName || `#${result.repoId}`
    try {
      await ElMessageBox.confirm(
        `仓库「${repoLabel}」已导入当前账户。是否直接更新该知识库仓库？`,
        '仓库已存在',
        {
          type: 'warning',
          confirmButtonText: '更新',
          cancelButtonText: '取消',
        },
      )
    } catch {
      return
    }
    await repoApi.refresh(result.repoId)
    ElMessage.success('已开始更新仓库，后台正在重新解析并构图...')
  }

  retriedRepoIds.delete(result.repoId)
  await loadRepos()
  void pollImportedRepo(result.repoId)
}

async function handleBatchImported(result: BatchImportResponse) {
  if (result.failureCount > 0) {
    ElMessage.warning(`批量导入完成：成功 ${result.successCount} 个，失败 ${result.failureCount} 个`)
  } else {
    ElMessage.success(`批量导入完成：成功 ${result.successCount} 个`)
  }
  await loadRepos()
  pollImportedRepos()
}

async function batchDeleteSelected() {
  if (!selectedRepoIds.value.length) return

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRepoIds.value.length} 个仓库吗？此操作会同时删除摘要和关联图任务，且不可恢复。`,
      '批量删除仓库',
      {
        type: 'warning',
        confirmButtonText: '删除',
        confirmButtonClass: 'el-button--danger',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }

  batchDeleting.value = true
  try {
    const result: BatchDeleteResponse = await repoApi.batchDelete({ repoIds: selectedRepoIds.value })
    const failure = result.results.find((item) => !item.success)
    if (result.failureCount > 0) {
      if (failure?.message) {
        ElMessage.warning(`已删除 ${result.successCount} 个，${result.failureCount} 个失败：${failure.message}`)
      } else {
        ElMessage.warning(`已删除 ${result.successCount} 个，${result.failureCount} 个失败`)
      }
    } else {
      ElMessage.success(`已删除 ${result.successCount} 个仓库`)
    }
    selectedRepoIds.value = []
    await loadRepos()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '批量删除失败')
  } finally {
    batchDeleting.value = false
  }
}

async function pollImportedRepo(repoId: number) {
  if (pollingRepoIds.has(repoId)) return
  pollingRepoIds.add(repoId)
  try {
    for (let attempt = 0; attempt < REPO_POLL_MAX_ATTEMPTS && isActive; attempt += 1) {
      await loadRepos(false)
      const repo = repos.value.find((item) => item.id === repoId)
      if (!repo) return

      if (
        repo.status === 'IMPORTED' &&
        repo.latestGraphTask?.status === 'READY' &&
        !retriedRepoIds.has(repoId)
      ) {
        retriedRepoIds.add(repoId)
        try {
          await repoApi.retryAnalysis(repoId)
        } catch {
          // keep polling even if retry request fails
        }
      }

      if (repo.status !== 'IMPORTED') return
      await sleep(REPO_POLL_INTERVAL_MS)
    }
  } finally {
    pollingRepoIds.delete(repoId)
  }
}

async function confirmDelete(row: KbRepo) {
  try {
    await ElMessageBox.confirm(
      `确定要删除仓库「${row.name}」吗？此操作会同时删除其摘要和所有关联图任务，且不可恢复。`,
      '删除仓库',
      {
        type: 'warning',
        confirmButtonText: '删除',
        confirmButtonClass: 'el-button--danger',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }

  try {
    await repoApi.remove(row.id)
    ElMessage.success('已删除')
    await loadRepos()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.header-actions { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
:deep(.repo-row) { cursor: pointer; }
.state-wrap { min-height: 300px; display: flex; align-items: center; justify-content: center; }
.kb-muted { color: #8c97a8; font-size: 12px; }
</style>