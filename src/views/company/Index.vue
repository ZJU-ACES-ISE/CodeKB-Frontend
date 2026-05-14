<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2 class="title">公司资产概览</h2>
        <p class="subtitle">汇总当前平台所有代码知识库、仓库、技术分布与贡献者信息</p>
      </div>
      <el-button @click="load" :loading="loading">刷新</el-button>
    </div>

    <div v-if="loading" class="loading-center">
      <el-icon class="is-loading" :size="36"><IconLoading /></el-icon>
    </div>

    <template v-else-if="stats">
      <!-- KPI 卡片 -->
      <el-row :gutter="16" class="kpi-row">
        <el-col :span="6">
          <div class="kpi-card accent">
            <div class="kpi-value">{{ stats.kbCount }}</div>
            <div class="kpi-label">知识库</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="kpi-card">
            <div class="kpi-value">{{ stats.repoCount }}</div>
            <div class="kpi-label">代码仓库</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="kpi-card green">
            <div class="kpi-value">{{ stats.graphReadyCount }}</div>
            <div class="kpi-label">关联图就绪</div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="kpi-card blue">
            <div class="kpi-value">{{ fmtNumber(stats.totalNodes) }}</div>
            <div class="kpi-label">图节点总量</div>
            <div class="kpi-sub">{{ fmtNumber(stats.totalEdges) }} 条边</div>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top:20px">
        <!-- 语言分布 -->
        <el-col :span="12">
          <el-card header="语言分布" class="section-card">
            <div v-if="langEntries.length">
              <div class="lang-bar-wrap">
                <div class="lang-bar">
                  <div v-for="([lang, cnt]) in langEntries.slice(0,8)" :key="lang"
                    :style="{ flex: cnt, background: langColor(lang) }"
                    :title="`${lang}: ${cnt} 个仓库`" />
                </div>
              </div>
              <div class="lang-list">
                <div v-for="([lang, cnt]) in langEntries" :key="lang" class="lang-row">
                  <span class="lang-dot" :style="{ background: langColor(lang) }" />
                  <span class="lang-name">{{ lang }}</span>
                  <div class="lang-track">
                    <div class="lang-fill"
                      :style="{ width: (cnt / langEntries[0][1] * 100) + '%', background: langColor(lang) }" />
                  </div>
                  <span class="lang-cnt">{{ cnt }} 个</span>
                </div>
              </div>
            </div>
            <el-empty v-else description="暂无语言数据" :image-size="50" />
          </el-card>
        </el-col>

        <!-- 仓库状态 -->
        <el-col :span="12">
          <el-card header="仓库状态分布" class="section-card">
            <div v-if="statusEntries.length" class="status-list">
              <div v-for="([status, cnt]) in statusEntries" :key="status" class="status-row">
                <el-tag :type="statusTagType(status)" size="small">{{ statusLabel(status) }}</el-tag>
                <div class="status-track">
                  <div class="status-fill"
                    :style="{ width: (cnt / stats.repoCount * 100) + '%', background: statusColor(status) }" />
                </div>
                <span class="status-cnt">{{ cnt }}</span>
                <span class="status-pct">({{ Math.round(cnt / stats.repoCount * 100) }}%)</span>
              </div>
            </div>
            <el-empty v-else description="暂无数据" :image-size="50" />
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="16" style="margin-top:16px">
        <!-- 涉及领域 -->
        <el-col :span="12">
          <el-card header="涉及领域" class="section-card">
            <div v-if="topicEntries.length" class="framework-grid">
              <div v-for="([fw, cnt]) in topicEntries" :key="fw" class="fw-chip">
                <span class="fw-name">{{ fw }}</span>
                <el-badge :value="cnt" :max="99" class="fw-badge" />
              </div>
            </div>
            <el-empty v-else description="尚无领域数据（导入仓库后自动提取）" :image-size="50" />
          </el-card>
        </el-col>

        <!-- Star 排行 -->
        <el-col :span="12">
          <el-card header="⭐ 最受关注仓库" class="section-card">
            <div v-if="stats.topStarRepos.length" class="star-list">
              <div v-for="(repo, idx) in stats.topStarRepos" :key="repo.repoId" class="star-row">
                <span class="star-rank" :class="{ top3: idx < 3 }">{{ idx + 1 }}</span>
                <div class="star-info">
                  <el-link class="star-name" style="cursor:pointer" @click="router.push(`/repos/${repo.repoId}`)">{{ repo.name }}</el-link>
                  <el-tag v-if="repo.language" size="small" effect="plain" class="star-lang">{{ repo.language }}</el-tag>
                </div>
                <span class="star-count">⭐ {{ fmtNumber(repo.starCount) }}</span>
              </div>
            </div>
            <el-empty v-else description="暂无数据" :image-size="50" />
          </el-card>
        </el-col>
      </el-row>

      <!-- 知识库详情 -->
      <el-card header="知识库资产清单" style="margin-top:16px">
        <el-table :data="stats.knowledgeBases" stripe>
          <el-table-column label="知识库名称" prop="name" min-width="160">
            <template #default="{ row }">
              <el-link @click="router.push(`/knowledge/${row.id}`)">{{ row.name }}</el-link>
            </template>
          </el-table-column>
          <el-table-column label="描述" prop="description" min-width="200">
            <template #default="{ row }">{{ row.description || '-' }}</template>
          </el-table-column>
          <el-table-column label="仓库数" prop="repoCount" width="90" align="center" />
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button size="small" link type="primary" @click="router.push(`/knowledge/${row.id}`)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import client from '@/api/client'

const router = useRouter()
const loading = ref(false)
const stats = ref<any>(null)

const langEntries = computed(() =>
  stats.value ? Object.entries(stats.value.languageDistribution as Record<string, number>) : []
)
const statusEntries = computed(() =>
  stats.value ? Object.entries(stats.value.statusDistribution as Record<string, number>) : []
)
const topicEntries = computed(() =>
  stats.value
    ? Object.entries((stats.value.topicDistribution ?? {}) as Record<string, number>)
    : []
)

onMounted(load)

async function load() {
  loading.value = true
  try {
    stats.value = await client.get('/search/stats')
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function fmtNumber(n: number) {
  if (!n) return '0'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function statusLabel(s: string) {
  return { IMPORTED: '已导入', SUMMARIZED: '已解析', GRAPH_READY: '图就绪', FAILED: '失败' }[s] ?? s
}
function statusTagType(s: string) {
  return { IMPORTED: 'info', SUMMARIZED: '', GRAPH_READY: 'success', FAILED: 'danger' }[s] ?? 'info'
}
function statusColor(s: string) {
  return { IMPORTED: '#69758a', SUMMARIZED: '#409eff', GRAPH_READY: '#0c7c59', FAILED: '#f56c6c' }[s] ?? '#ccc'
}

const LANG_COLORS: Record<string, string> = {
  Java: '#b07219', Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6',
  Go: '#00ADD8', Rust: '#dea584', Kotlin: '#A97BFF', Swift: '#F05138',
  'C++': '#f34b7d', 'C#': '#178600', Ruby: '#701516', PHP: '#4F5D95',
  HTML: '#e34c26', CSS: '#563d7c', Vue: '#41b883', Dart: '#00B4AB',
}
const FALLBACK = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6']
function langColor(name: string) {
  if (LANG_COLORS[name]) return LANG_COLORS[name]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return FALLBACK[Math.abs(h) % FALLBACK.length]
}
</script>

<style scoped>
.page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
.title { font-size: 22px; font-weight: 700; margin: 0 0 4px; }
.subtitle { color: #69758a; font-size: 14px; margin: 0; }
.loading-center { display: flex; justify-content: center; padding: 80px; }

.kpi-row { margin-bottom: 4px; }
.kpi-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
}
.kpi-card.accent { border-color: #0c7c59; background: linear-gradient(135deg,#f0faf6,#fff); }
.kpi-card.green { border-color: #10b981; background: linear-gradient(135deg,#ecfdf5,#fff); }
.kpi-card.blue  { border-color: #3b82f6; background: linear-gradient(135deg,#eff6ff,#fff); }
.kpi-value { font-size: 36px; font-weight: 800; color: #172033; }
.kpi-label { font-size: 13px; color: #69758a; margin-top: 4px; }
.kpi-sub { font-size: 12px; color: #aaa; margin-top: 2px; }

.section-card { height: 100%; }

/* 语言 */
.lang-bar-wrap { margin-bottom: 14px; }
.lang-bar { display: flex; height: 12px; border-radius: 6px; overflow: hidden; background: #f0f0f0; }
.lang-bar > div { height: 100%; }
.lang-list { display: flex; flex-direction: column; gap: 8px; }
.lang-row { display: flex; align-items: center; gap: 8px; }
.lang-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.lang-name { width: 90px; font-size: 13px; }
.lang-track { flex: 1; height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; }
.lang-fill { height: 100%; border-radius: 3px; }
.lang-cnt { font-size: 12px; color: #69758a; width: 40px; text-align: right; }

/* 状态 */
.status-list { display: flex; flex-direction: column; gap: 12px; }
.status-row { display: flex; align-items: center; gap: 10px; }
.status-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
.status-fill { height: 100%; border-radius: 4px; }
.status-cnt { font-size: 14px; font-weight: 600; width: 30px; text-align: right; }
.status-pct { font-size: 12px; color: #aaa; width: 45px; }

/* 框架 */
.framework-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.fw-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #f7f9fc;
  font-size: 13px;
}

/* star */
.star-list { display: flex; flex-direction: column; gap: 10px; }
.star-row { display: flex; align-items: center; gap: 10px; }
.star-rank {
  width: 24px; height: 24px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
  background: #f0f0f0; color: #69758a;
  flex-shrink: 0;
}
.star-rank.top3 { background: #fef9c3; color: #92400e; }
.star-info { flex: 1; display: flex; align-items: center; gap: 8px; }
.star-name { font-size: 14px; font-weight: 500; }
.star-lang { }
.star-count { font-size: 13px; color: #69758a; white-space: nowrap; }
</style>
