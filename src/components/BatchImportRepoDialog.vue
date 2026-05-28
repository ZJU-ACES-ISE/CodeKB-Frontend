<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { repoApi } from '@/api/repo'
import type { BatchImportResponse } from '@/types/api'

interface Props {
  visible: boolean
  kbId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  imported: [result: BatchImportResponse]
}>()

const formRef = ref<FormInstance>()
const form = reactive({
  provider: 'github',
  githubUrls: '',
  ref: '',
  depth: 1,
})
const submitting = ref(false)

const PLATFORM_LABEL: Record<string, string> = {
  github: 'GitHub',
  gitee: 'Gitee',
  gitlab: 'GitLab',
}

const urlPlaceholder = computed(() => {
  if (form.provider === 'gitee') return '每行一个 Gitee 仓库地址，例如 https://gitee.com/owner/repo'
  if (form.provider === 'gitlab') return '每行一个 GitLab 仓库地址，例如 https://gitlab.com/group/repo'
  return '每行一个 GitHub 仓库地址，例如 https://github.com/owner/repo'
})

function splitUrls(value: string) {
  return value
    .split(/[\r\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function validUrlByProvider(url: string) {
  const githubOk = /^(https?:\/\/github\.com\/|git@github\.com:)[^\s]+$/i.test(url)
  const giteeOk = /^(https?:\/\/gitee\.com\/|git@gitee\.com:)[^\s]+$/i.test(url)
  const gitlabOk = /^(https?:\/\/[^/\s]+\/|git@[^:\s]+:)[^\s]+$/i.test(url)
  if (form.provider === 'github') return githubOk
  if (form.provider === 'gitee') return giteeOk
  return gitlabOk
}

const githubUrlsRule = {
  validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
    const items = splitUrls(value || '')
    if (items.length === 0) {
      return callback(new Error('请至少填写一个仓库地址'))
    }
    const invalid = items.find((url) => !validUrlByProvider(url))
    if (invalid) {
      const label = PLATFORM_LABEL[form.provider] || '代码托管平台'
      return callback(new Error(`${label} 仓库地址格式不正确：${invalid}`))
    }
    return callback()
  },
  trigger: 'blur',
}

const rules: FormRules = {
  githubUrls: [githubUrlsRule],
  depth: [{ type: 'number', min: 0, max: 1000, message: 'depth 取值 0 - 1000', trigger: 'blur' }],
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      form.provider = 'github'
      form.githubUrls = ''
      form.ref = ''
      form.depth = 1
      formRef.value?.clearValidate()
    }
  },
)

function close() {
  emit('update:visible', false)
}

async function submit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  const urls = splitUrls(form.githubUrls)
  if (urls.length === 0) {
    ElMessage.warning('请至少填写一个仓库地址')
    return
  }

  submitting.value = true
  try {
    const result = await repoApi.batchImport({
      kbId: props.kbId,
      items: urls.map((githubUrl) => ({
        githubUrl,
        provider: form.provider,
        ref: form.ref.trim() || undefined,
        depth: form.depth,
      })),
    })
    emit('imported', result)
    emit('update:visible', false)
  } catch {
    // error toast handled in interceptor
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="批量导入代码仓库"
    width="720px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="emit('update:visible', $event)"
    @close="close"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="平台">
        <el-select v-model="form.provider" style="width: 100%">
          <el-option label="GitHub" value="github" />
          <el-option label="Gitee" value="gitee" />
          <el-option label="GitLab" value="gitlab" />
        </el-select>
      </el-form-item>
      <el-form-item label="仓库列表" prop="githubUrls">
        <el-input
          v-model="form.githubUrls"
          type="textarea"
          :rows="8"
          :placeholder="urlPlaceholder"
        />
      </el-form-item>
      <el-form-item label="Ref" prop="ref">
        <el-input v-model="form.ref" placeholder="可选：分支 / tag / commit，批量导入时会应用到所有仓库" />
      </el-form-item>
      <el-form-item label="Depth" prop="depth">
        <el-input-number v-model="form.depth" :min="0" :max="1000" />
        <span class="kb-muted" style="margin-left: 10px">0 表示 full clone</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">开始批量导入</el-button>
    </template>
  </el-dialog>
</template>
