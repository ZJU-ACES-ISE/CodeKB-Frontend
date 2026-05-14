<template>
  <div class="login-wrap">
    <el-card class="login-card" shadow="always">
      <div class="login-header">
        <h1 class="login-title">CodeKB</h1>
        <p class="login-sub">企业代码知识库平台</p>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" label-position="top" @submit.prevent="handleLogin">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="admin / demo" size="large" clearable />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="admin123 / demo123"
            size="large" show-password @keyup.enter="handleLogin" />
        </el-form-item>

        <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom:16px" />

        <el-button type="primary" size="large" style="width:100%" :loading="loading" @click="handleLogin">
          登录
        </el-button>
      </el-form>

      <p class="login-hint">demo 账号：<code>admin / admin123</code> 或 <code>demo / demo123</code></p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance } from 'element-plus'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const error = ref('')

const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  if (!await formRef.value?.validate().catch(() => false)) return
  loading.value = true
  error.value = ''
  try {
    const result = await authApi.login(form.username, form.password)
    authStore.setAuth(result.token, result.user)
    ElMessage.success('登录成功')
    const redirect = route.query.redirect as string
    router.push(redirect ? decodeURIComponent(redirect) : '/search')
  } catch (e: any) {
    error.value = e?.message || '用户名或密码错误'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}
.login-card {
  width: 400px;
  padding: 16px 8px;
}
.login-header {
  text-align: center;
  margin-bottom: 28px;
}
.login-title {
  font-size: 28px;
  font-weight: 700;
  color: #0c7c59;
  margin: 0 0 6px;
}
.login-sub {
  color: #69758a;
  margin: 0;
  font-size: 14px;
}
.login-hint {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: #999;
}
</style>
