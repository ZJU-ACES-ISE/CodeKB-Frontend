<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
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
  githubUrl: '',
  ref: '',
  depth: 1,
});
const submitting = ref(false);

const rules: FormRules = {
  githubUrl: [
    { required: true, message: '请填写 GitHub URL', trigger: 'blur' },
    {
      pattern: /^(https?:\/\/github\.com\/|git@github\.com:)[^\s]+$/i,
      message: 'GitHub URL 格式不正确',
      trigger: 'blur',
    },
  ],
  depth: [{ type: 'number', min: 0, max: 1000, message: 'depth 取值 0 - 1000', trigger: 'blur' }],
};

watch(
  () => props.visible,
  (v) => {
    if (v) {
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
    title="导入 GitHub 仓库"
    width="520px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
    @close="close"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
      <el-form-item label="GitHub URL" prop="githubUrl">
        <el-input v-model="form.githubUrl" placeholder="https://github.com/owner/repo" />
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
