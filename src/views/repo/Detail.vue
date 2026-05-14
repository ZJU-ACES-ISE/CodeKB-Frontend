<template>
  <div class="page">
    <el-breadcrumb separator="/" style="margin-bottom:16px">
      <el-breadcrumb-item :to="{ path: '/knowledge' }">知识库</el-breadcrumb-item>
      <el-breadcrumb-item v-if="detail?.repo?.kbId"
        :to="{ path: `/knowledge/${detail.repo.kbId}` }">知识库详情</el-breadcrumb-item>
      <el-breadcrumb-item>{{ detail?.repo?.name || '仓库详情' }}</el-breadcrumb-item>
    </el-breadcrumb>

    <div v-if="loading" class="center-spin"><el-icon class="is-loading" :size="32"><Loading /></el-icon></div>

    <template v-else-if="detail">
      <div class="repo-header">
        <div>
          <h2 style="margin:0 0 4px">{{ detail.repo.name }}</h2>
          <el-link :href="detail.repo.githubUrl" target="_blank" type="primary">
            {{ detail.repo.githubUrl }}
          </el-link>
        </div>
        <div class="repo-actions">
          <el-tag :type="statusType(detail.repo.status)" style="margin-right:8px">
            {{ statusLabel(detail.repo.status) }}
          </el-tag>
          <el-button type="primary" @click="goGraph">查看关联图</el-button>
          <el-button type="danger" plain @click="confirmDelete">删除仓库</el-button>
        </div>
      </div>

      <el-row :gutter="16" style="margin-top:20px">
        <el-col :span="12">
          <el-card header="基本信息">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="语言">{{ detail.repo.language || '-' }}</el-descriptions-item>
              <el-descriptions-item label="框架">{{ detail.repo.framework || '-' }}</el-descriptions-item>
              <el-descriptions-item label="Stars">{{ detail.repo.starCount ?? '-' }}</el-descriptions-item>
              <el-descriptions-item label="Ref">{{ detail.repo.ref || '-' }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card header="图任务状态">
            <template v-if="detail.latestGraphTask">
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="状态">
                  <el-tag :type="graphStatusType(detail.latestGraphTask.status)" size="small">
                    {{ detail.latestGraphTask.status }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="节点数">{{ detail.latestGraphTask.nodeCount ?? '-' }}</el-descriptions-item>
                <el-descriptions-item label="边数">{{ detail.latestGraphTask.edgeCount ?? '-' }}</el-descriptions-item>
                <el-descriptions-item label="外部状态">{{ detail.latestGraphTask.externalStatusRaw || '-' }}</el-descriptions-item>
              </el-descriptions>
              <p v-if="detail.latestGraphTask.errorMessage" style="color:#b3261e;margin-top:8px;font-size:13px">
                错误：{{ detail.latestGraphTask.errorMessage }}
              </p>
            </template>
            <el-empty v-else description="尚无图任务" :image-size="60" />
          </el-card>
        </el-col>
      </el-row>

      <el-card header="仓库摘要" style="margin-top:16px" v-if="detail.summary">
        <!-- 自动生成的中文摘要 -->
        <p class="summary-text">{{ detail.summary.summaryText || '摘要生成中...' }}</p>

        <!-- 主题描述 -->
        <div v-if="detail.summary.description" class="muted-block">
          <span class="block-label">原始描述</span>
          <span>{{ detail.summary.description }}</span>
        </div>

        <!-- 涉及领域：topics -->
        <div v-if="detail.summary.topics?.length" class="chip-row">
          <span class="block-label">涉及领域</span>
          <el-tag v-for="t in detail.summary.topics" :key="t" size="small" effect="plain" class="chip">{{ t }}</el-tag>
        </div>

        <!-- 框架 -->
        <div v-if="detail.summary.frameworks?.length" class="chip-row">
          <span class="block-label">主要框架</span>
          <el-tag v-for="f in detail.summary.frameworks" :key="f" size="small" type="success" class="chip">{{ f }}</el-tag>
        </div>

        <!-- 语言占比 -->
        <div v-if="detail.summary.languages && Object.keys(detail.summary.languages).length" class="lang-block">
          <span class="block-label">语言分布</span>
          <div class="lang-bar">
            <div v-for="(pct, name) in detail.summary.languages" :key="name"
              :style="{ width: pct + '%', background: langColor(String(name)) }"
              :title="name + ' ' + pct + '%'" />
          </div>
          <div class="lang-legend">
            <span v-for="(pct, name) in detail.summary.languages" :key="String(name)" class="lang-pill">
              <span class="lang-dot" :style="{ background: langColor(String(name)) }" />
              {{ name }} {{ pct }}%
            </span>
          </div>
        </div>

        <!-- 指标网格 -->
        <el-row :gutter="12" style="margin-top:16px">
          <el-col :span="6">
            <div class="metric">
              <div class="metric-value">{{ detail.summary.forkCount ?? 0 }}</div>
              <div class="metric-label">🍴 Forks</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric">
              <div class="metric-value">{{ detail.summary.watchersCount ?? 0 }}</div>
              <div class="metric-label">👀 Watchers</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric">
              <div class="metric-value">{{ detail.summary.openIssuesCount ?? 0 }}</div>
              <div class="metric-label">🐛 Open Issues</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="metric">
              <div class="metric-value">{{ formatSize(detail.summary.sizeKb) }}</div>
              <div class="metric-label">📦 代码规模</div>
            </div>
          </el-col>
        </el-row>

        <!-- 元信息 -->
        <el-descriptions :column="3" border size="small" style="margin-top:16px">
          <el-descriptions-item label="主语言">{{ detail.summary.primaryLanguage || '-' }}</el-descriptions-item>
          <el-descriptions-item label="许可证">{{ detail.summary.license || '-' }}</el-descriptions-item>
          <el-descriptions-item label="默认分支">{{ detail.summary.defaultBranch || '-' }}</el-descriptions-item>
          <el-descriptions-item label="主页" :span="3">
            <el-link v-if="detail.summary.homepage" :href="detail.summary.homepage" target="_blank">
              {{ detail.summary.homepage }}
            </el-link>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 贡献者 -->
        <div v-if="detail.summary.topContributors?.length" class="contributor-block">
          <span class="block-label">主要贡献者（{{ detail.summary.contributorCount }} 位）</span>
          <div class="contributor-list">
            <a v-for="c in detail.summary.topContributors" :key="c.login"
              :href="c.html_url" target="_blank" class="contributor-card"
              :title="c.login + ' · ' + c.contributions + ' commits'">
              <img :src="c.avatar_url" :alt="c.login" class="contributor-avatar" />
              <span class="contributor-name">{{ c.login }}</span>
              <span class="contributor-count">{{ c.contributions }} commits</span>
            </a>
          </div>
        </div>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { repoApi } from '@/api/repo'

const props = defineProps<{ repoId: string }>()
const router = useRouter()
const loading = ref(true)
const detail = ref<any>(null)

onMounted(async () => {
  try { detail.value = await repoApi.get(Number(props.repoId)) }
  catch (e: any) { ElMessage.error(e?.message || '加载失败') }
  finally { loading.value = false }
})

function goGraph() {
  router.push(`/graph?repoId=${props.repoId}`)
}

async function confirmDelete() {
  const name = detail.value?.repo?.name || '该仓库'
  const kbId = detail.value?.repo?.kbId
  try {
    await ElMessageBox.confirm(
      `确定要删除仓库「${name}」吗？此操作会同时删除其摘要和所有关联图任务，且不可恢复。`,
      '删除仓库',
      { type: 'warning', confirmButtonText: '删除', confirmButtonClass: 'el-button--danger', cancelButtonText: '取消' }
    )
  } catch { return }
  try {
    await repoApi.remove(Number(props.repoId))
    ElMessage.success('已删除')
    if (kbId) router.replace(`/knowledge/${kbId}`)
    else router.replace('/knowledge')
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

function statusType(s: string) {
  return { IMPORTED: 'info', SUMMARIZED: '', GRAPH_READY: 'success', FAILED: 'danger' }[s] ?? 'info'
}
function statusLabel(s: string) {
  return { IMPORTED: '已导入', SUMMARIZED: '已解析', GRAPH_READY: '图就绪', FAILED: '失败' }[s] ?? s
}
function graphStatusType(s: string) {
  return { PENDING: 'info', SUBMITTED: 'warning', BUILDING: 'warning', READY: 'success', FAILED: 'danger' }[s] ?? 'info'
}

function formatSize(kb?: number | null) {
  if (!kb) return '-'
  if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB'
  return kb + ' KB'
}

// 一组稳定的语言色板（取自 GitHub Linguist 常见色）
const LANG_COLORS: Record<string, string> = {
  Java: '#b07219', Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6',
  Go: '#00ADD8', Rust: '#dea584', Kotlin: '#A97BFF', Swift: '#F05138',
  C: '#555555', 'C++': '#f34b7d', 'C#': '#178600', Ruby: '#701516', PHP: '#4F5D95',
  HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Vue: '#41b883', Dart: '#00B4AB',
  Scala: '#c22d40', Lua: '#000080', Dockerfile: '#384d54', Makefile: '#427819',
}
const FALLBACK_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6']
function langColor(name: string) {
  if (LANG_COLORS[name]) return LANG_COLORS[name]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return FALLBACK_COLORS[Math.abs(h) % FALLBACK_COLORS.length]
}
</script>

<style scoped>
.page { padding: 24px; }
.repo-header { display: flex; justify-content: space-between; align-items: flex-start; }
.repo-actions { display: flex; align-items: center; }
.center-spin { display: flex; justify-content: center; padding: 60px; }
.meta-item { display: flex; flex-direction: column; }
.meta-label { font-size: 12px; color: #69758a; margin-bottom: 2px; }

.summary-text {
  color: #2d3748;
  line-height: 1.8;
  margin: 0;
  font-size: 14px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
  border-left: 3px solid #0c7c59;
  border-radius: 4px;
}

.muted-block {
  margin-top: 14px;
  font-size: 13px;
  color: #4a5568;
  line-height: 1.6;
}

.block-label {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: #69758a;
  margin-right: 8px;
  margin-bottom: 6px;
}

.chip-row { margin-top: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.chip { margin-right: 2px; }

.lang-block { margin-top: 16px; }
.lang-bar {
  display: flex;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
  background: #f0f0f0;
}
.lang-bar > div { height: 100%; transition: width .3s; }
.lang-legend { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 12px; }
.lang-pill {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  color: #555;
}
.lang-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  margin-right: 5px;
}

.metric {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px 10px;
  text-align: center;
}
.metric-value { font-size: 22px; font-weight: 700; color: #172033; }
.metric-label { font-size: 12px; color: #69758a; margin-top: 4px; }

.contributor-block { margin-top: 18px; }
.contributor-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  margin-top: 6px;
}
.contributor-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  text-decoration: none;
  color: #172033;
  transition: transform .15s, box-shadow .15s;
}
.contributor-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(30,40,60,.08);
  border-color: #0c7c59;
}
.contributor-avatar {
  width: 48px; height: 48px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.1);
}
.contributor-name { margin-top: 6px; font-size: 13px; font-weight: 500; }
.contributor-count { font-size: 11px; color: #69758a; }
</style>
