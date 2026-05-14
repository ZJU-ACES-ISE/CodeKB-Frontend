<template>
  <div class="page">
    <div class="page-header">
      <h2>知识库</h2>
      <el-button type="primary" @click="dialogVisible = true">新建知识库</el-button>
    </div>

    <el-row :gutter="16" v-if="kbList.length">
      <el-col :xs="24" :sm="12" :lg="8" v-for="kb in kbList" :key="kb.id" style="margin-bottom:16px">
        <el-card shadow="hover" class="kb-card" @click="router.push(`/knowledge/${kb.id}`)">
          <div class="kb-card-top">
            <div class="kb-name">{{ kb.name }}</div>
            <el-button class="kb-edit-btn" size="small" link @click.stop="openEdit(kb)">
              <el-icon><Edit /></el-icon>
            </el-button>
          </div>
          <div class="kb-desc">{{ kb.description || '暂无描述' }}</div>
          <div class="kb-meta">
            <el-tag size="small" type="info">{{ kb.repoCount }} 个仓库</el-tag>
          </div>
        </el-card>
      </el-col>
    </el-row>
    <el-empty v-else description="还没有知识库" />

    <!-- 新建知识库 -->
    <el-dialog v-model="dialogVisible" title="新建知识库" width="440px">
      <el-form :model="form" label-position="top">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="例如：后端框架知识库" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="createKb">创建</el-button>
      </template>
    </el-dialog>

    <!-- 编辑知识库 -->
    <el-dialog v-model="editVisible" title="编辑知识库" width="440px" destroy-on-close>
      <el-form :model="editForm" label-position="top">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" placeholder="知识库名称" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.description" type="textarea" :rows="3" placeholder="可选" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSaving" @click="saveKbEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Edit } from '@element-plus/icons-vue'
import { knowledgeApi } from '@/api/knowledge'
import type { KnowledgeBase } from '@/types/api'

const router = useRouter()
const kbList = ref<KnowledgeBase[]>([])
const dialogVisible = ref(false)
const saving = ref(false)
const form = reactive({ name: '', description: '' })

const editVisible = ref(false)
const editSaving = ref(false)
const editForm = reactive({ name: '', description: '' })
let editingKbId: number | null = null

onMounted(load)

async function load() {
  try { kbList.value = await knowledgeApi.list() }
  catch (e: any) { ElMessage.error(e?.message || '加载失败') }
}

async function createKb() {
  if (!form.name.trim()) return ElMessage.warning('请填写名称')
  saving.value = true
  try {
    await knowledgeApi.create({ name: form.name, description: form.description })
    ElMessage.success('创建成功')
    dialogVisible.value = false
    form.name = ''
    form.description = ''
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  } finally {
    saving.value = false
  }
}

function openEdit(kb: KnowledgeBase) {
  editingKbId = kb.id
  editForm.name = kb.name
  editForm.description = kb.description ?? ''
  editVisible.value = true
}

async function saveKbEdit() {
  const name = editForm.name.trim()
  if (!name) return ElMessage.warning('请填写名称')
  editSaving.value = true
  try {
    await knowledgeApi.update(editingKbId!, {
      name,
      description: editForm.description.trim() || undefined,
    })
    ElMessage.success('已保存')
    editVisible.value = false
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  } finally {
    editSaving.value = false
  }
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { margin: 0; }
.kb-card { cursor: pointer; transition: transform .15s; }
.kb-card:hover { transform: translateY(-2px); }
.kb-name { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
.kb-desc { font-size: 13px; color: #69758a; margin-bottom: 10px; min-height: 36px; }
.kb-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.kb-card-top .kb-name { margin-bottom: 6px; }
.kb-edit-btn { visibility: hidden; color: #909399; font-size: 16px; }
.kb-card:hover .kb-edit-btn { visibility: visible; }
.kb-edit-btn:hover { color: var(--el-color-primary); }
</style>
