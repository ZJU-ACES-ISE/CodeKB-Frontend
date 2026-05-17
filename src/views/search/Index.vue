<template>
  <div class="mine-page">

    <!-- ═══ Hero ═══ -->
    <div class="hero">
      <div class="hero-text">
        <h2 class="hero-title">开源代码挖掘中心</h2>
        <p class="hero-sub">从 GitHub、Gitee、GitLab、上传 ZIP 或本地目录导入代码，构建可检索的知识图谱</p>
      </div>
      <el-button type="primary" size="large" @click="importTab = 'github'; importOpen = true">
        <el-icon style="margin-right:6px"><IconPlus /></el-icon> 导入新仓库
      </el-button>
    </div>

    <!-- ═══ KPI 卡片 ═══ -->
    <el-row :gutter="14" class="kpi-row">
      <el-col :span="6" v-for="k in kpis" :key="k.label">
        <div class="kpi-card" :style="{ borderTopColor: k.color }">
          <div class="kpi-icon" :style="{ background: k.color + '1a', color: k.color }">
            <el-icon :size="22"><component :is="k.icon" /></el-icon>
          </div>
          <div class="kpi-body">
            <div class="kpi-val">{{ k.value }}</div>
            <div class="kpi-lbl">{{ k.label }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- ═══ 图表行 ═══ -->
    <el-row :gutter="16" class="chart-row" v-if="stats">
      <!-- 来源平台分布 -->
      <el-col :span="6" class="chart-col">
        <el-card class="chart-card" header="来源平台">
          <div class="chart-center">
            <DonutChart
              :data="sourceDonut"
              :size="160"
              center-val=""
              center-label="平台"
              :max-legend="5"
            />
          </div>
        </el-card>
      </el-col>

      <!-- 语言分布 -->
      <el-col :span="9" class="chart-col">
        <el-card class="chart-card" header="语言分布">
          <HBarChart :data="langBars" :max-items="8" />
        </el-card>
      </el-col>

      <!-- 仓库状态 -->
      <el-col :span="9" class="chart-col">
        <el-card class="chart-card" header="仓库状态（导入 / 摘要）">
          <div class="progress-grid">
            <div v-for="s in statusBlocks" :key="s.label" class="progress-block">
              <div class="pb-value" :style="{ color: s.color }">{{ s.count }}</div>
              <div class="pb-ring">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="22" fill="none" stroke="#f0f0f0" stroke-width="5"/>
                  <circle cx="26" cy="26" r="22" fill="none"
                    :stroke="s.color" stroke-width="5"
                    stroke-linecap="round"
                    :stroke-dasharray="`${s.pct * 1.382} 138.2`"
                    transform="rotate(-90 26 26)"
                    style="transition:stroke-dasharray .5s"
                  />
                </svg>
                <span class="pb-pct" :style="{ color: s.color }">{{ s.pct }}%</span>
              </div>
              <div class="pb-label">{{ s.label }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ═══ Star 排行 + 最近导入 ═══ -->
    <el-row :gutter="16" class="bottom-row" v-if="stats">
      <el-col :xs="24" :md="12" :xl="8">
        <el-card header="⭐ 最受关注仓库" class="summary-card">
          <el-scrollbar v-if="stats.topStarRepos.length" class="summary-scroll">
            <div class="star-list">
              <div v-for="(r, i) in stats.topStarRepos" :key="r.repoId" class="star-row">
                <span class="star-idx" :class="{ gold: i === 0, silver: i === 1, bronze: i === 2 }">
                  {{ i + 1 }}
                </span>
                <div class="star-body">
                  <el-link @click="$router.push(`/repos/${r.repoId}`)" class="star-name" style="cursor:pointer">{{ r.name }}</el-link>
                  <div class="star-meta">
                    <span class="provider-pill">{{ providerIcon(r.provider || r.githubUrl) }}</span>
                    <el-tag v-if="r.language" size="small" effect="plain">{{ r.language }}</el-tag>
                  </div>
                </div>
                <span class="star-count">⭐ {{ fmtNum(r.starCount) }}</span>
              </div>
            </div>
          </el-scrollbar>
          <el-empty v-else description="暂无数据" class="summary-empty" :image-size="50" />
        </el-card>
      </el-col>

      <el-col :xs="24" :md="12" :xl="8">
        <el-card header="仓库列表" class="summary-card" v-loading="repoCatalogLoading">
          <el-scrollbar v-if="repoCatalog.length" class="summary-scroll">
            <div class="repo-list">
              <div v-for="repo in repoCatalog" :key="repo.id" class="repo-list-row">
                <div class="repo-list-main">
                  <span class="provider-badge repo-list-provider">{{ providerIcon(repo.provider || repo.githubUrl) }}</span>
                  <div class="repo-list-body">
                    <el-link @click="$router.push(`/repos/${repo.id}`)" class="repo-list-name" style="cursor:pointer">{{ repo.name }}</el-link>
                    <div class="repo-list-meta">
                      <span class="repo-list-kb">{{ kbName(repo.kbId) }}</span>
                      <el-tag v-if="repo.language" size="small" effect="plain">{{ repo.language }}</el-tag>
                      <span v-if="repo.starCount" class="repo-list-stars">⭐ {{ fmtNum(repo.starCount) }}</span>
                    </div>
                  </div>
                </div>
                <div class="repo-list-statuses">
                  <el-tag size="small" effect="plain" :type="repoStatusTagType(repo.status)">
                    仓库 {{ repoStatusLabel(repo.status) }}
                  </el-tag>
                  <el-tag
                    size="small"
                    effect="plain"
                    :type="graphTaskStatusTagType(repo.latestGraphTask?.status || 'NONE')"
                  >
                    图任务 {{ graphTaskStatusLabel(repo.latestGraphTask?.status || 'NONE') }}
                  </el-tag>
                </div>
              </div>
            </div>
          </el-scrollbar>
          <el-empty v-else-if="!repoCatalogLoading" class="summary-empty" description="暂无仓库" :image-size="50" />
        </el-card>
      </el-col>

      <el-col :xs="24" :md="24" :xl="8">
        <el-card header="涉及领域" class="summary-card">
          <el-scrollbar v-if="fwBlocks.length" class="summary-scroll">
            <div class="fw-grid">
              <div v-for="fw in fwBlocks" :key="fw.name" class="fw-block"
                :style="{ background: fw.bg, borderColor: fw.color }">
                <div class="fw-head">
                  <span class="fw-swatch" :style="{ background: fw.color }" />
                  <div class="fw-name">{{ fw.name }}</div>
                </div>
                <div class="fw-cnt">{{ fw.count }} 个仓库</div>
              </div>
            </div>
          </el-scrollbar>
          <el-empty v-else description="导入仓库后自动提取领域信息" class="summary-empty" :image-size="50" />
        </el-card>
      </el-col>
    </el-row>

    <!-- ═══ 多平台导入对话框 ═══ -->
    <el-dialog v-model="importOpen" title="导入代码仓库" width="560px" :close-on-click-modal="false">
      <el-tabs v-model="importTab" class="import-tabs">

        <!-- GitHub -->
        <el-tab-pane name="github">
          <template #label>
            <span class="tab-label">
              <svg viewBox="0 0 24 24" class="tab-icon" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </span>
          </template>
          <el-form :model="gitForm" label-position="top" style="margin-top:8px">
            <el-form-item label="目标知识库">
              <el-select v-model="gitForm.kbId" placeholder="选择知识库" style="width:100%">
                <el-option v-for="kb in kbList" :key="kb.id" :label="kb.name" :value="kb.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="仓库地址">
              <el-input v-model="gitForm.url" placeholder="https://github.com/owner/repo" />
            </el-form-item>
            <div style="display:grid;grid-template-columns:1fr 130px;gap:12px">
              <el-form-item label="Ref（分支 / tag，可选）">
                <el-input v-model="gitForm.ref" placeholder="main / v1.0.0" />
              </el-form-item>
              <el-form-item label="Clone Depth">
                <el-input-number v-model="gitForm.depth" :min="0" :max="100" style="width:100%" />
              </el-form-item>
            </div>
            <el-button type="primary" :loading="gitSubmitting" style="width:100%;margin-top:4px" @click="submitGit">
              开始导入
            </el-button>
          </el-form>
        </el-tab-pane>

        <!-- Gitee -->
        <el-tab-pane name="gitee">
          <template #label>
            <span class="tab-label" style="color:#c7254e">
              <svg viewBox="0 0 24 24" class="tab-icon" fill="currentColor">
                <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.265.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.594.594 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.594.594 0 0 1 .593-.592h6.418c.328 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296z"/>
              </svg>
              Gitee
            </span>
          </template>
          <el-form :model="giteeForm" label-position="top" style="margin-top:8px">
            <el-form-item label="目标知识库">
              <el-select v-model="giteeForm.kbId" placeholder="选择知识库" style="width:100%">
                <el-option v-for="kb in kbList" :key="kb.id" :label="kb.name" :value="kb.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="仓库地址">
              <el-input v-model="giteeForm.url" placeholder="https://gitee.com/owner/repo" />
            </el-form-item>
            <div style="display:grid;grid-template-columns:1fr 130px;gap:12px">
              <el-form-item label="Ref（分支 / tag，可选）">
                <el-input v-model="giteeForm.ref" placeholder="master / v1.0.0" />
              </el-form-item>
              <el-form-item label="Clone Depth">
                <el-input-number v-model="giteeForm.depth" :min="0" :max="100" style="width:100%" />
              </el-form-item>
            </div>
            <el-button type="primary" :loading="giteeSubmitting" style="width:100%;margin-top:4px" @click="submitGitee">
              开始导入
            </el-button>
          </el-form>
        </el-tab-pane>

        <!-- GitLab -->
        <el-tab-pane name="gitlab">
          <template #label>
            <span class="tab-label" style="color:#e24329">
              <svg viewBox="0 0 24 24" class="tab-icon" fill="currentColor">
                <path d="m23.955 13.587-1.342-4.135-2.664-8.189a.455.455 0 0 0-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 0 0-.867 0L1.386 9.45.044 13.587a.924.924 0 0 0 .331 1.023L12 23.054l11.625-8.443a.92.92 0 0 0 .33-1.024"/>
              </svg>
              GitLab
            </span>
          </template>
          <el-form :model="gitlabForm" label-position="top" style="margin-top:8px">
            <el-form-item label="目标知识库">
              <el-select v-model="gitlabForm.kbId" placeholder="选择知识库" style="width:100%">
                <el-option v-for="kb in kbList" :key="kb.id" :label="kb.name" :value="kb.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="仓库地址">
              <el-input v-model="gitlabForm.url" placeholder="https://gitlab.com/owner/repo 或自建 GitLab" />
            </el-form-item>
            <div style="display:grid;grid-template-columns:1fr 130px;gap:12px">
              <el-form-item label="Ref（分支 / tag，可选）">
                <el-input v-model="gitlabForm.ref" placeholder="main / v1.0.0" />
              </el-form-item>
              <el-form-item label="Clone Depth">
                <el-input-number v-model="gitlabForm.depth" :min="0" :max="100" style="width:100%" />
              </el-form-item>
            </div>
            <el-button type="primary" :loading="gitlabSubmitting" style="width:100%;margin-top:4px" @click="submitGitlab">
              开始导入
            </el-button>
          </el-form>
        </el-tab-pane>

        <!-- ZIP 上传 -->
        <el-tab-pane name="zip">
          <template #label>
            <span class="tab-label">
              <el-icon class="tab-icon"><IconUpload /></el-icon>
              ZIP
            </span>
          </template>
          <div class="zip-form-wrap">
            <el-alert type="info" :closable="false" style="margin-bottom:14px">
              上传源码 ZIP，后端转发至图谱服务的 <code>/api/graph-jobs/upload</code>（字段 file，可选 repo_name）。
            </el-alert>
            <el-form :model="zipForm" label-position="top" style="margin-top:4px">
              <el-form-item label="目标知识库">
                <el-select v-model="zipForm.kbId" placeholder="选择知识库" style="width:100%">
                  <el-option v-for="kb in kbList" :key="kb.id" :label="kb.name" :value="kb.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="仓库名称（可选，传给图谱 repo_name）">
                <el-input v-model="zipForm.repoName" placeholder="默认使用压缩包文件名（不含 .zip）" clearable />
              </el-form-item>
              <el-form-item label="ZIP 文件">
                <el-upload
                  ref="zipUploadRef"
                  drag
                  :auto-upload="false"
                  :limit="1"
                  accept=".zip,application/zip"
                  :on-change="onZipFileChange"
                  :on-remove="clearZipUpload"
                >
                  <el-icon class="el-icon--upload"><IconUploadFilled /></el-icon>
                  <div class="el-upload__text">拖拽文件到此处，或 <em>点击选择</em></div>
                  <template #tip>
                    <div class="el-upload__tip">仅支持 .zip，较大文件上传请耐心等待</div>
                  </template>
                </el-upload>
              </el-form-item>
              <el-button type="primary" :loading="zipSubmitting" style="width:100%;margin-top:4px" @click="submitZip">
                上传并开始构图
              </el-button>
            </el-form>
          </div>
        </el-tab-pane>

        <!-- 本地目录 -->
        <el-tab-pane name="local">
          <template #label>
            <span class="tab-label">
              <el-icon class="tab-icon"><IconFolderOpened /></el-icon>
              本地目录
            </span>
          </template>
          <div class="local-form">
            <el-alert type="info" :closable="false" style="margin-bottom:16px">
              本地目录模式：输入服务器上的绝对路径，后端直接读取本地目录（无需 git clone）。适用于离线仓库或企业内网代码。
            </el-alert>
            <el-form :model="localForm" label-position="top">
              <el-form-item label="目标知识库">
                <el-select v-model="localForm.kbId" placeholder="选择知识库" style="width:100%">
                  <el-option v-for="kb in kbList" :key="kb.id" :label="kb.name" :value="kb.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="服务器目录路径">
                <el-input v-model="localForm.path" placeholder="/data/repos/my-project" />
              </el-form-item>
              <el-form-item label="仓库名称（显示用）">
                <el-input v-model="localForm.name" placeholder="my-project" />
              </el-form-item>
              <el-button type="primary" :loading="localLoading" @click="importLocal" style="width:100%">
                开始导入
              </el-button>
            </el-form>
          </div>
        </el-tab-pane>

      </el-tabs>
    </el-dialog>

    <!-- ═══ 搜索区 ═══ -->
    <el-card class="search-section">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span>🔍 代码检索</span>
          <span class="search-hint">在已导入的仓库中搜索（demo：基于摘要 + 标签匹配）</span>
        </div>
      </template>

      <div class="search-bar-wrap">
        <el-input v-model="query" size="large" placeholder="输入关键词，例如：payment、UserService、Spring Boot..."
          clearable @keyup.enter="doSearch">
          <template #prefix><el-icon><IconSearch /></el-icon></template>
          <template #append>
            <el-button type="primary" :loading="searching" @click="doSearch">搜索</el-button>
          </template>
        </el-input>
        <div class="example-row">
          <span class="ex-label">快速搜：</span>
          <el-tag v-for="ex in examples" :key="ex" class="ex-chip" @click="quickSearch(ex)">{{ ex }}</el-tag>
        </div>
      </div>

      <div v-if="searched" class="result-meta">
        <template v-if="results.length">
          找到 <strong>{{ results.length }}</strong> 个相关仓库，关键词：<el-tag size="small">{{ lastQ }}</el-tag>
        </template>
        <template v-else>未找到与「{{ lastQ }}」相关的代码，请换个关键词。</template>
      </div>

      <div class="results" v-if="results.length">
        <div class="result-card" v-for="item in results" :key="item.repoId">
          <div class="rc-header">
            <div class="rc-left">
              <span class="provider-badge">{{ providerIcon(item.provider || item.githubUrl) }}</span>
              <el-link @click="$router.push(`/repos/${item.repoId}`)" class="rc-name" style="cursor:pointer">{{ item.repoName }}</el-link>
              <el-tag v-if="item.language" size="small" effect="plain">{{ item.language }}</el-tag>
              <span v-if="item.starCount" class="rc-stars">⭐ {{ fmtNum(item.starCount) }}</span>
              <el-tag size="small" type="warning">匹配 {{ item.score.toFixed(1) }}</el-tag>
            </div>
            <div>
              <el-button size="small" @click="$router.push(`/repos/${item.repoId}`)">详情</el-button>
              <el-button size="small" type="success" @click="$router.push(`/graph?repoId=${item.repoId}`)">图谱</el-button>
            </div>
          </div>
          <p v-if="item.snippet" class="rc-snippet" v-html="hl(item.snippet, lastQ)" />
          <div v-if="topicsOf(item)" class="rc-topics">
            <el-tag v-for="t in topicsOf(item)" :key="t" size="small" effect="plain" class="rc-topic">{{ t }}</el-tag>
          </div>
        </div>
      </div>
    </el-card>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadFile, UploadInstance } from 'element-plus'
import client from '@/api/client'
import { knowledgeApi } from '@/api/knowledge'
import { repoApi } from '@/api/repo'
import DonutChart from '@/components/charts/DonutChart.vue'
import HBarChart from '@/components/charts/HBarChart.vue'
import type { ImportRepoResponse, KbRepo, KnowledgeBase } from '@/types/api'
import { graphTaskStatusLabel, graphTaskStatusTagType, repoStatusLabel, repoStatusTagType } from '@/utils/format'

// ── 知识库列表 ────────────────────────────────────────────────────────────
const kbList = ref<KnowledgeBase[]>([])
const repoCatalog = ref<KbRepo[]>([])
const repoCatalogLoading = ref(false)
const REPO_POLL_MAX_ATTEMPTS = 60
const REPO_POLL_INTERVAL_MS = 2000
const pollingRepoIds = new Set<number>()
const retriedRepoIds = new Set<number>()
let isActive = true

onUnmounted(() => {
  isActive = false
})

async function loadKbs() {
  try {
    kbList.value = await knowledgeApi.list()
  } catch {
    kbList.value = []
  }
}

async function loadRepoCatalog(showLoading = true) {
  if (!kbList.value.length) {
    repoCatalog.value = []
    return
  }
  if (showLoading) repoCatalogLoading.value = true
  try {
    const reposByKb = await Promise.all(
      kbList.value.map(async (kb) => {
        try {
          return await knowledgeApi.repos(kb.id)
        } catch {
          return [] as KbRepo[]
        }
      }),
    )
    repoCatalog.value = reposByKb
      .flat()
      .sort((a, b) => {
        const starDiff = (b.starCount ?? 0) - (a.starCount ?? 0)
        if (starDiff !== 0) return starDiff
        return a.name.localeCompare(b.name)
      })
  } finally {
    if (showLoading) repoCatalogLoading.value = false
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function refreshRepoStatusSnapshot(showLoading = false) {
  await Promise.all([loadStats(), loadRepoCatalog(showLoading)])
}

function pollImportedRepos() {
  repoCatalog.value
    .filter((repo) => repo.status === 'IMPORTED')
    .forEach((repo) => void pollImportedRepo(repo.id))
}

async function pollImportedRepo(repoId: number) {
  if (pollingRepoIds.has(repoId)) return
  pollingRepoIds.add(repoId)
  try {
    for (let attempt = 0; attempt < REPO_POLL_MAX_ATTEMPTS && isActive; attempt += 1) {
      await refreshRepoStatusSnapshot(false)
      const repo = repoCatalog.value.find((item) => item.id === repoId)
      if (
        repo &&
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
      if (repo && repo.status !== 'IMPORTED') {
        return
      }
      await sleep(REPO_POLL_INTERVAL_MS)
    }
  } finally {
    pollingRepoIds.delete(repoId)
  }
}

async function initializePage() {
  await loadKbs()
  await Promise.all([loadStats(), loadRepoCatalog()])
  pollImportedRepos()
}

onMounted(() => { initializePage() })

// ── 三套平台导入表单（GitHub / Gitee / GitLab 共用同一套逻辑，各自独立 state）
function makeForm() {
  return ref({ kbId: null as number | null, url: '', ref: '', depth: 1 })
}
async function submitForm(
  form: ReturnType<typeof makeForm>,
  submitting: { value: boolean },
  provider: 'github' | 'gitee' | 'gitlab',
) {
  if (!form.value.kbId) return ElMessage.warning('请选择知识库')
  if (!form.value.url.trim()) return ElMessage.warning('请输入仓库地址')
  submitting.value = true
  try {
    const result = await repoApi.importRepo({
      kbId: form.value.kbId,
      githubUrl: form.value.url.trim(),
      provider,
      ref: form.value.ref || undefined,
      depth: form.value.depth,
    })
    ElMessage.success('导入任务已创建，后台正在处理...')
    form.value.url = ''
    form.value.ref = ''
    onImported(result)
  } catch (e: any) {
    ElMessage.error(e?.message || '导入失败')
  } finally { submitting.value = false }
}

const gitForm = makeForm()
const gitSubmitting = ref(false)
function submitGit() { submitForm(gitForm, gitSubmitting, 'github') }

const giteeForm = makeForm()
const giteeSubmitting = ref(false)
function submitGitee() { submitForm(giteeForm, giteeSubmitting, 'gitee') }

const gitlabForm = makeForm()
const gitlabSubmitting = ref(false)
function submitGitlab() { submitForm(gitlabForm, gitlabSubmitting, 'gitlab') }

// ── stats ────────────────────────────────────────────────────────────────
const stats = ref<any>(null)

async function loadStats() {
  try { stats.value = await client.get('/search/stats') } catch {}
}

const LANG_COLORS: Record<string, string> = {
  Java: '#b07219', Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6',
  Go: '#00ADD8', Rust: '#dea584', Kotlin: '#A97BFF', Swift: '#F05138',
  'C++': '#f34b7d', 'C#': '#178600', Ruby: '#701516', PHP: '#4F5D95',
  HTML: '#e34c26', CSS: '#563d7c', Vue: '#41b883', Dart: '#00B4AB',
}
const FALLBACK = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#3b82f6', '#ec4899']
function lc(name: string) {
  if (LANG_COLORS[name]) return LANG_COLORS[name]
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return FALLBACK[Math.abs(h) % FALLBACK.length]
}

const SOURCE_COLORS: Record<string, string> = {
  github: '#24292e', gitee: '#c7254e', gitlab: '#e24329', local: '#10b981', zip: '#7c3aed', other: '#69758a',
}
function detectProvider(target?: string | null) {
  const value = (target || '').toLowerCase()
  if (!value) return 'other'
  if (['github', 'gitee', 'gitlab', 'local', 'zip', 'other'].includes(value)) return value
  if (value.startsWith('upload://')) return 'zip'
  if (value.includes('github')) return 'github'
  if (value.includes('gitee')) return 'gitee'
  if (value.includes('gitlab')) return 'gitlab'
  if (value.startsWith('local://') || value.startsWith('/') || value.startsWith('file')) return 'local'
  return 'other'
}
function providerIcon(target?: string | null) {
  return { github: '🐙', gitee: '🏮', gitlab: '🦊', local: '📁', zip: '📦', other: '🔗' }[detectProvider(target)] ?? '🔗'
}

const langBars = computed(() => {
  if (!stats.value) return []
  return Object.entries(stats.value.languageDistribution as Record<string, number>)
    .map(([label, value]) => ({ label, value: value as number, color: lc(label) }))
    .slice(0, 8)
})

const sourceDonut = computed(() => {
  if (!stats.value) return []
  const backendDist = stats.value.providerDistribution as Record<string, number> | undefined
  if (backendDist && Object.keys(backendDist).length) {
    return Object.entries(backendDist).map(([k, v]) => ({
      label: k.charAt(0).toUpperCase() + k.slice(1),
      value: v as number,
      color: SOURCE_COLORS[k] || '#aaa',
    }))
  }
  const dist: Record<string, number> = {}
  ;(stats.value.topStarRepos || []).forEach((r: any) => {
    const p = detectProvider(r.provider || r.githubUrl)
    dist[p] = (dist[p] || 0) + 1
  })
  if (!Object.keys(dist).length) {
    dist.github = stats.value.repoCount || 0
  }
  return Object.entries(dist).map(([k, v]) => ({
    label: k.charAt(0).toUpperCase() + k.slice(1),
    value: v as number,
    color: SOURCE_COLORS[k] || '#aaa',
  }))
})

const STATUS_META = [
  { key: 'IMPORTED', label: '已导入', color: '#69758a' },
  { key: 'SUMMARIZED', label: '已解析', color: '#3b82f6' },
  { key: 'FAILED', label: '失败', color: '#ef4444' },
]
const statusBlocks = computed(() => {
  if (!stats.value) return []
  const dist = (stats.value.repoStatusDistribution ?? stats.value.statusDistribution) as Record<string, number>
  const total = stats.value.repoCount || 1
  return STATUS_META.map(s => ({
    ...s,
    count: dist[s.key] || 0,
    pct: Math.round(((dist[s.key] || 0) / total) * 100),
  }))
})

const FW_COLORS = ['#0c7c59', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#10b981']
const fwBlocks = computed(() => {
  if (!stats.value) return []
  const dist = (stats.value.topicDistribution ?? {}) as Record<string, number>
  return Object.entries(dist)
    .slice(0, 12)
    .map(([name, count], i) => ({
      name,
      count,
      color: FW_COLORS[i % FW_COLORS.length],
      bg: FW_COLORS[i % FW_COLORS.length] + '12',
    }))
})

const kpis = computed(() => [
  { label: '代码仓库', value: fmtNum(stats.value?.repoCount || 0), color: '#0c7c59', icon: 'IconCollection' },
  { label: '知识库', value: fmtNum(stats.value?.kbCount || 0), color: '#3b82f6', icon: 'IconGrid' },
  { label: '图任务就绪', value: fmtNum(stats.value?.graphReadyCount || 0), color: '#8b5cf6', icon: 'IconShare' },
  { label: '图节点总量', value: fmtNum(stats.value?.totalNodes || 0), color: '#f59e0b', icon: 'IconData' },
])

// ── import dialog ─────────────────────────────────────────────────────────
const importOpen = ref(false)
const importTab = ref('github')
const currentKbId = ref<number | undefined>(undefined)
const localForm = ref({ kbId: null as number | null, path: '', name: '' })
const localLoading = ref(false)

const zipForm = ref({ kbId: null as number | null, repoName: '' })
const zipFile = ref<File | null>(null)
const zipSubmitting = ref(false)

const zipUploadRef = ref<UploadInstance>()

function clearZipUpload() {
  zipFile.value = null
  zipUploadRef.value?.clearFiles()
}

function onZipFileChange(uploadFile: UploadFile) {
  zipFile.value = (uploadFile.raw as File) ?? null
}

async function submitZip() {
  if (!zipForm.value.kbId) return ElMessage.warning('请选择知识库')
  if (!zipFile.value) return ElMessage.warning('请选择 ZIP 文件')
  zipSubmitting.value = true
  try {
    const result = await repoApi.importZip(
      zipForm.value.kbId,
      zipFile.value,
      zipForm.value.repoName || undefined,
    )
    ElMessage.success('上传成功，后台正在解析摘要并构图…')
    zipForm.value.repoName = ''
    clearZipUpload()
    onImported(result)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '上传失败')
  } finally {
    zipSubmitting.value = false
  }
}

async function importLocal() {
  if (!localForm.value.kbId) return ElMessage.warning('请选择知识库')
  if (!localForm.value.path) return ElMessage.warning('请输入服务器目录路径')
  localLoading.value = true
  try {
    const result = await repoApi.importRepo({
      kbId: localForm.value.kbId,
      githubUrl: 'local://' + localForm.value.path,
      provider: 'local',
      repoName: localForm.value.name.trim() || undefined,
      ref: undefined,
      depth: 0,
    })
    ElMessage.success('本地目录导入任务已创建')
    localForm.value.path = ''
    localForm.value.name = ''
    await onImported(result)
  } catch (e: any) {
    ElMessage.error(e?.message || '导入失败')
  } finally { localLoading.value = false }
}

async function onImported(result?: ImportRepoResponse) {
  importOpen.value = false
  await refreshRepoStatusSnapshot(true)
  if (result?.repoId) {
    void pollImportedRepo(result.repoId)
  } else {
    pollImportedRepos()
  }
}

// ── search ────────────────────────────────────────────────────────────────
const query = ref('')
const lastQ = ref('')
const searching = ref(false)
const searched = ref(false)
const results = ref<any[]>([])
const examples = ['payment', 'Spring Boot', 'Python', 'login', 'API gateway', 'machine learning']

async function doSearch() {
  const q = query.value.trim()
  if (!q) return ElMessage.warning('请输入关键词')
  searching.value = true
  try {
    results.value = await client.get<any[], any[]>('/search/code', { params: { q, limit: 20 } }) || []
    lastQ.value = q
    searched.value = true
  } catch (e: any) { ElMessage.error(e?.message || '搜索失败') }
  finally { searching.value = false }
}

function quickSearch(kw: string) { query.value = kw; doSearch() }

function hl(text: string, kw: string) {
  if (!kw || !text) return text
  const e = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`(${e})`, 'gi'), '<mark>$1</mark>')
}

function topicsOf(item: any): string[] {
  const raw = item.topics
  if (!raw) return []
  if (Array.isArray(raw)) return raw.slice(0, 5)
  try { return (JSON.parse(raw) as string[]).slice(0, 5) } catch { return [] }
}

function kbName(kbId: number) {
  return kbList.value.find(kb => kb.id === kbId)?.name || `知识库 #${kbId}`
}

function fmtNum(n: number) {
  if (!n && n !== 0) return '-'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}
</script>

<style scoped>
.mine-page { padding: 24px; }

/* Hero */
.hero {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 22px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #0c7c59 0%, #1e40af 100%);
  border-radius: 12px;
  color: #fff;
}
.hero-title { font-size: 22px; font-weight: 800; margin: 0 0 4px; }
.hero-sub { font-size: 13px; opacity: .85; margin: 0; }

/* KPI */
.kpi-row { margin-bottom: 16px; }
.kpi-card {
  display: flex; align-items: center; gap: 14px;
  padding: 16px; background: #fff;
  border: 1px solid #e2e8f0; border-top: 3px solid;
  border-radius: 10px;
}
.kpi-icon {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.kpi-val { font-size: 26px; font-weight: 800; color: #172033; line-height: 1; }
.kpi-lbl { font-size: 12px; color: #69758a; margin-top: 3px; }

/* Charts */
.chart-row { margin-bottom: 16px; }
.chart-col { display: flex; }
.chart-card {
  width: 100%;
  height: 100%;
  min-height: 290px;
}
.chart-card :deep(.el-card__body) {
  min-height: 232px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.chart-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 0;
}

/* progress blocks */
.progress-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
  align-items: center;
}
.progress-block { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.pb-ring { position: relative; display: flex; align-items: center; justify-content: center; }
.pb-pct {
  position: absolute; font-size: 11px; font-weight: 700;
}
.pb-value { font-size: 20px; font-weight: 800; }
.pb-label { font-size: 11px; color: #69758a; text-align: center; }

/* bottom row */
.bottom-row { margin-bottom: 20px; }
.bottom-row > .el-col { display: flex; }
.summary-card { width: 100%; height: 100%; }
.summary-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
}
.summary-scroll { height: 300px; padding-right: 4px; }
.summary-empty { height: 300px; display: flex; align-items: center; justify-content: center; }
.star-list { display: flex; flex-direction: column; gap: 0; }
.star-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #edf2f7;
}
.star-row:last-child { border-bottom: 0; }
.star-idx {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; background: #f0f0f0; color: #69758a; flex-shrink: 0;
  margin-top: 2px;
}
.star-idx.gold { background: #fef9c3; color: #92400e; }
.star-idx.silver { background: #f1f5f9; color: #475569; }
.star-idx.bronze { background: #fef3c7; color: #b45309; }
.star-body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.star-name {
  display: inline-block;
  max-width: 100%;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}
.star-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.star-count {
  flex-shrink: 0;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-top: 4px;
}
.provider-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}
.provider-icon { font-size: 14px; }
.provider-badge { font-size: 18px; flex-shrink: 0; }

.repo-list { display: flex; flex-direction: column; gap: 10px; }
.repo-list-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #edf2f7;
}
.repo-list-row:last-child { border-bottom: 0; }
.repo-list-main { display: flex; align-items: flex-start; gap: 10px; min-width: 0; flex: 1; }
.repo-list-provider { margin-top: 2px; }
.repo-list-body { min-width: 0; flex: 1; }
.repo-list-name {
  display: inline-block;
  max-width: 100%;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}
.repo-list-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
  color: #69758a;
  font-size: 12px;
}
.repo-list-kb { color: #4a5568; }
.repo-list-stars { white-space: nowrap; }
.repo-list-statuses {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

/* frameworks */
.fw-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.fw-block {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid;
  min-width: 0;
  text-align: left;
}
.fw-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.fw-swatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}
.fw-name {
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}
.fw-cnt {
  font-size: 12px;
  color: #69758a;
  margin-top: 8px;
  padding-left: 18px;
}

@media (max-width: 1199px) {
  .summary-scroll,
  .summary-empty { height: 280px; }
  .fw-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 991px) {
  .chart-col,
  .bottom-row > .el-col { display: block; }
  .chart-card { min-height: 0; }
  .chart-card :deep(.el-card__body) { min-height: 0; }
  .fw-grid { grid-template-columns: 1fr; }
}

/* import dialog */
.import-tabs :deep(.el-tabs__header) { margin-bottom: 12px; }
.tab-label { display: flex; align-items: center; gap: 5px; font-size: 13px; }
.tab-icon { width: 14px; height: 14px; }
.local-form { padding-top: 4px; }
.zip-form-wrap { padding-top: 4px; }
.zip-form-wrap :deep(.el-upload-dragger) { padding: 24px 16px; }
.zip-form-wrap code { font-size: 12px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }

/* search */
.search-section { margin-top: 0; }
.search-hint { font-size: 12px; color: #aaa; }
.search-bar-wrap { margin-bottom: 12px; }
.example-row { margin-top: 10px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.ex-label { font-size: 12px; color: #69758a; }
.ex-chip { cursor: pointer; }
.ex-chip:hover { background: #e6f4f1; border-color: #0c7c59; color: #0c7c59; }
.result-meta { margin: 10px 0; font-size: 13px; color: #4a5568; }
.results { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.result-card {
  border: 1px solid #e2e8f0; border-radius: 10px;
  padding: 16px; background: #fff;
}
.result-card:hover { box-shadow: 0 4px 14px rgba(30,40,60,.07); }
.rc-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.rc-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rc-name { font-size: 15px; font-weight: 600; }
.rc-stars { font-size: 13px; color: #69758a; }
.rc-snippet {
  font-size: 13px; color: #4a5568; line-height: 1.7;
  padding: 8px 12px; background: #f7fafc;
  border-left: 3px solid #0c7c59; border-radius: 4px;
  margin: 0 0 8px;
}
:deep(mark) { background: #fef9c3; color: #92400e; padding: 0 2px; border-radius: 2px; }
.rc-topics { display: flex; flex-wrap: wrap; gap: 5px; }
.rc-topic { }
</style>
