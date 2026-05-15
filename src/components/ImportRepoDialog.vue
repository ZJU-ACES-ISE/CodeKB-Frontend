<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { repoApi } from '@/api/repo';
import type { KbRepo } from '@/types/api';

interface Props {
  visible: boolean;
  kbId: number;
}
const props = defineProps<Props>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  imported: [repo: KbRepo];
}>();

const formRef = ref<FormInstance>();
const form = reactive({
  provider: 'github',
  githubUrl: '',
  ref: '',
  depth: 1,
});
const submitting = ref(false);

const PLATFORM_LABEL: Record<string, string> = {
  github: 'GitHub',
  gitee: 'Gitee',
  gitlab: 'GitLab',
};

const urlPlaceholder = computed(() => {
  if (form.provider === 'gitee') return 'https://gitee.com/owner/repo';
  if (form.provider === 'gitlab') return 'https://gitlab.com/group/repo 或自建 GitLab URL';
  return 'https://github.com/owner/repo';
});

const urlRule = {
  validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
    const trimmed = value?.trim() || '';
    if (!trimmed) return callback(new Error('请填写仓库 URL'));
    const githubOk = /^(https?:\/\/github\.com\/|git@github\.com:)[^\s]+$/i.test(trimmed);
    const giteeOk = /^(https?:\/\/gitee\.com\/|git@gitee\.com:)[^\s]+$/i.test(trimmed);
    const gitlabOk = /^(https?:\/\/[^/\s]+\/|git@[^:\s]+:)[^\s]+$/i.test(trimmed);
    const valid =
      (form.provider === 'github' && githubOk) ||
      (form.provider === 'gitee' && giteeOk) ||
      (form.provider === 'gitlab' && gitlabOk);
    if (!valid) {
      const label = PLATFORM_LABEL[form.provider] || '代码托管平台';
      return callback(new Error(`${label} URL 格式不正确`));
    }
    return callback();
  },
  trigger: 'blur',
};

const rules: FormRules = {
  githubUrl: [
    urlRule,
  ],
  depth: [{ type: 'number', min: 0, max: 1000, message: 'depth 取值 0 - 1000', trigger: 'blur' }],
};

watch(
  () => props.visible,
  (v) => {
    if (v) {
      form.provider = 'github';
      form.githubUrl = '';
      form.ref = '';
      form.depth = 1;
    }
  },
);

function close() {
  emit('update:visible', false);
}

async function submit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      const repo = await repoApi.importRepo({
        kbId: props.kbId,
        provider: form.provider,
        githubUrl: form.githubUrl.trim(),
        ref: form.ref.trim() || undefined,
        depth: form.depth,
      });
      ElMessage.success('仓库已开始导入');
      emit('imported', repo);
      emit('update:visible', false);
    } catch {
      /* error toast handled in interceptor */
    } finally {
      submitting.value = false;
    }
  });
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="导入代码仓库"
    width="520px"
    :close-on-click-modal="false"
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
      <el-form-item label="仓库 URL" prop="githubUrl">
        <el-input v-model="form.githubUrl" :placeholder="urlPlaceholder" />
      </el-form-item>
      <el-form-item label="Ref" prop="ref">
        <el-input v-model="form.ref" placeholder="可选：分支 / tag / commit" />
      </el-form-item>
      <el-form-item label="Depth" prop="depth">
        <el-input-number v-model="form.depth" :min="0" :max="1000" />
        <span class="kb-muted" style="margin-left: 10px">0 表示 full clone</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">开始导入</el-button>
    </template>
  </el-dialog>
</template>
