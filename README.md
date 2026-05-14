# CodeKB UI

Vue 3 + TypeScript + Vite + Element Plus 前端，对接单体后端 `codekb-server`（默认 API 前缀 `/api/v1`）。

## 功能页面（与当前路由一致）

- **仪表盘** — 知识库数量与列表入口  
- **知识库** — 列表 / 详情、导入仓库；名称与描述可通过 `PUT /knowledge-bases/{id}` 更新（见 `knowledgeApi.update`）  
- **仓库详情** — `/repos/:id` 摘要与外链 Git 地址展示  
- **关联图** — 消费后端图快照与 graph-job 接口  
- **代码挖掘** — 导入（GitHub / Gitee / GitLab / **ZIP** / 本地路径）、统计卡片、`/search/code` 检索；仓库链接跳转 **站内摘要**而非托管平台  
- **公司资产** — `/search/stats` 可视化  

## 技术栈

Vue 3.4、TypeScript 5、Vite 5、Element Plus、Pinia、Vue Router、Axios。

## 接口约定

响应 `{ code, message, data }`，`code === 0` 为成功。开发环境在 `.env.development` 配置：

```bash
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## 脚本

```bash
pnpm install
pnpm dev
pnpm build    # vue-tsc + vite build
```

演示账号以后端 `UserSeeder` / 登录页提示为准。
