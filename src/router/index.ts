import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('@/views/login/Login.vue'),
        meta: { public: true, title: '登录' },
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/search',
    children: [
      {
        path: 'knowledge',
        name: 'knowledge-list',
        component: () => import('@/views/knowledge/List.vue'),
        meta: { title: '知识库' },
      },
      {
        path: 'knowledge/:kbId',
        name: 'knowledge-detail',
        component: () => import('@/views/knowledge/Detail.vue'),
        meta: { title: '知识库详情' },
        props: true,
      },
      {
        path: 'repos/:repoId',
        name: 'repo-detail',
        component: () => import('@/views/repo/Detail.vue'),
        meta: { title: '仓库详情' },
        props: true,
      },
      {
        path: 'graph',
        name: 'graph',
        component: () => import('@/views/graph/Index.vue'),
        meta: { title: '关联图' },
      },
      {
        path: 'search',
        name: 'search',
        component: () => import('@/views/search/Index.vue'),
        meta: { title: '代码挖掘' },
      },
      {
        path: 'company',
        name: 'company',
        component: () => import('@/views/company/Index.vue'),
        meta: { title: '公司资产' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/search',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  const isPublic = to.matched.some((r) => r.meta.public);
  if (!isPublic && !auth.token) {
    const redirect = encodeURIComponent(to.fullPath);
    return { path: '/login', query: { redirect } };
  }
  if (to.path === '/login' && auth.token) {
    return { path: '/search' };
  }
  if (to.meta.title) {
    document.title = `${to.meta.title as string} · CodeKB`;
  } else {
    document.title = 'CodeKB';
  }
  return true;
});

export default router;
