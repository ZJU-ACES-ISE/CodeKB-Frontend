<template>
  <div class="page">
    <div class="page-header">
      <div>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/knowledge' }">知识库</el-breadcrumb-item>
          <el-breadcrumb-item>{{ kb?.name || '...' }}</el-breadcrumb-item>
        </el-breadcrumb>
        <h2 style="margin:8px 0 0">{{ kb?.name }}</h2>
        <p v-if="kb?.description" style="color:#69758a;margin:4px 0 0">{{ kb.description }}</p>
      </div>
      <div class="header-actions">
        <el-button @click="openKbEdit">编辑信息</el-button>
        <el-button type="primary" @click="importDialogVisible = true">导入仓库</el-button>
      </div>
    </div>

    <el-table :data="repos" v-loading="loading" stripe row-class-name="repo-row"
      @row-click="(row: KbRepo) => router.push(`/repos/${row.id}`)">
      <el-table-column label="仓库名" prop="name" min-width="160">
        <template #default="{ row }">
          <el-link style="cursor:pointer" @click.stop="router.push(`/repos/${row.id}`)">{{ row.name }}</el-link>
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

    <ImportRepoDialog v-model:visible="importDialogVisible" :kb-id="Number(kbId)" @imported="loadRepos" />

    <el-dialog v-model="kbEditVisible" title="编辑知识库" width="440px" destroy-on-close>
      <el-form :model="kbEditForm" label-position="top">
        <el-form-item label="名称">
          <el-input v-model="kbEditForm.name" placeholder="知识库名称" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="kbEditForm.description" type="textarea" :rows="3" placeholder="可选" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="kbEditVisible = false">取消</el-button>
        <el-button type="primary" :loading="kbEditSaving" @click="saveKbMeta">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { knowledgeApi } from '@/api/knowledge'
import { repoApi } from '@/api/repo'
import ImportRepoDialog from '@/components/ImportRepoDialog.vue'
import type { KbRepo, KnowledgeBase } from '@/types/api'
import { graphTaskStatusLabel, graphTaskStatusTagType, repoStatusLabel, repoStatusTagType } from '@/utils/format'

const props = defineProps<{ kbId: string }>()
const router = useRouter()
const kb = ref<KnowledgeBase | null>(null)
const repos = ref<KbRepo[]>([])
const loading = ref(false)
const importDialogVisible = ref(false)
const kbEditVisible = ref(false)
const kbEditSaving = ref(false)
const kbEditForm = reactive({ name: '', description: '' })

function openKbEdit() {
  if (!kb.value) return
  kbEditForm.name = kb.value.name
  kbEditForm.description = kb.value.description ?? ''
  kbEditVisible.value = true
}

async function saveKbMeta() {
  const name = kbEditForm.name.trim()
  if (!name) return ElMessage.warning('请填写名称')
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

onMounted(async () => {
  try {
    kb.value = await knowledgeApi.get(Number(props.kbId))
    await loadRepos()
  } catch (e: any) { ElMessage.error(e?.message || '加载失败') }
})

async function loadRepos() {
  loading.value = true
  try { repos.value = await knowledgeApi.repos(Number(props.kbId)) }
  catch (e: any) { ElMessage.error(e?.message || '加载仓库失败') }
  finally { loading.value = false }
}

async function confirmDelete(row: KbRepo) {
  try {
    await ElMessageBox.confirm(
      `确定要删除仓库「${row.name}」吗？此操作会同时删除其摘要和所有关联图任务，且不可恢复。`,
      '删除仓库',
      { type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger', cancelButtonText: '取消' }
    )
  } catch { return }

  try {
    await repoApi.remove(row.id)
    ElMessage.success('已删除')
    await loadRepos()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.header-actions { display: flex; gap: 8px; flex-shrink: 0; }
:deep(.repo-row) { cursor: pointer; }
</style>
