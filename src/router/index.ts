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
        meta: { public: true, title: '\u767b\u5f55' },
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/search',
    children: [
      {
        path: 'graph-tasks',
        name: 'graph-task-list',
        component: () => import('@/views/graph-task/List.vue'),
        meta: { title: '\u56fe\u89e3\u6790\u4efb\u52a1' },
      },
      {
        path: 'knowledge',
        name: 'knowledge-list',
        component: () => import('@/views/knowledge/List.vue'),
        meta: { title: '\u77e5\u8bc6\u5e93' },
      },
      {
        path: 'knowledge/:kbId',
        name: 'knowledge-detail',
        component: () => import('@/views/knowledge/Detail.vue'),
        meta: { title: '\u77e5\u8bc6\u5e93\u8be6\u60c5' },
        props: true,
      },
      {
        path: 'repos/:repoId',
        name: 'repo-detail',
        component: () => import('@/views/repo/Detail.vue'),
        meta: { title: '\u4ed3\u5e93\u8be6\u60c5' },
        props: true,
      },
      {
        path: 'graph',
        name: 'graph',
        component: () => import('@/views/graph/Index.vue'),
        meta: { title: '\u5173\u8054\u56fe' },
      },
      {
        path: 'search',
        name: 'search',
        component: () => import('@/views/search/Index.vue'),
        meta: { title: '\u4ee3\u7801\u6316\u6398' },
      },
      {
        path: 'company',
        name: 'company',
        component: () => import('@/views/company/Index.vue'),
        meta: { title: '\u516c\u53f8\u8d44\u4ea7' },
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
    document.title = `${to.meta.title as string} - CodeKB`;
  } else {
    document.title = 'CodeKB';
  }
  return true;
});

export default router;
