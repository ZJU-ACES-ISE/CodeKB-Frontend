<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const activeMenu = computed(() => {
  if (route.path.startsWith('/knowledge')) return 'knowledge';
  if (route.path.startsWith('/repos')) return 'knowledge';
  if (route.path.startsWith('/graph')) return 'graph';
  if (route.path.startsWith('/search')) return 'search';
  if (route.path.startsWith('/company')) return 'company';
  return 'search';
});

function goto(key: string) {
  if (key === 'knowledge') router.push('/knowledge');
  if (key === 'graph') router.push('/graph');
  if (key === 'search') router.push('/search');
  if (key === 'company') router.push('/company');
}

function onLogout() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <el-container class="app-container">
    <el-aside width="220px" class="app-aside">
      <div class="brand">
        <span class="brand-mark">KB</span>
        <span class="brand-text">CodeKB</span>
      </div>
      <el-menu :default-active="activeMenu" class="app-menu" @select="goto">
        <el-menu-item index="search">
          <el-icon><IconMagnet /></el-icon>
          <span>代码挖掘</span>
        </el-menu-item>
        <el-menu-item index="knowledge">
          <el-icon><IconCollection /></el-icon>
          <span>知识库</span>
        </el-menu-item>
        <el-menu-item index="graph">
          <el-icon><IconShare /></el-icon>
          <span>关联图</span>
        </el-menu-item>
        <el-menu-item index="company">
          <el-icon><IconOfficeBuilding /></el-icon>
          <span>公司资产</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="app-header">
        <div class="header-left">
          <span class="header-title">{{ (route.meta.title as string) || 'CodeKB' }}</span>
        </div>
        <div class="header-right">
          <el-dropdown trigger="click">
            <span class="user-trigger">
              <el-avatar :size="28" class="user-avatar">
                {{ (auth.displayName || 'U').slice(0, 1).toUpperCase() }}
              </el-avatar>
              <span class="user-name">{{ auth.displayName }}</span>
              <el-icon><IconArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>{{ auth.user?.role || 'USER' }}</el-dropdown-item>
                <el-dropdown-item divided @click="onLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="app-main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.app-container {
  height: 100vh;
}

.app-aside {
  background: #0f172a;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
}

.brand-mark {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  background: var(--kb-accent);
  color: #fff;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
}

.brand-text {
  font-weight: 700;
  letter-spacing: 0.4px;
}

.app-menu {
  flex: 1;
  border-right: 0;
  background: transparent;
}

.app-menu :deep(.el-menu-item) {
  color: #cbd5e1;
}

.app-menu :deep(.el-menu-item.is-active) {
  background: rgba(12, 124, 89, 0.15);
  color: #fff;
}

.app-menu :deep(.el-menu-item:hover) {
  background: rgba(148, 163, 184, 0.1);
  color: #fff;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid var(--kb-border);
  padding: 0 24px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
}

.user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
}

.user-avatar {
  background: var(--kb-accent);
  color: #fff;
}

.user-name {
  font-size: 13px;
}

.app-main {
  background: #f8fafc;
  padding: 0;
  overflow-y: auto;   /* 普通页面可以滚动 */
  height: 100%;
}
</style>
