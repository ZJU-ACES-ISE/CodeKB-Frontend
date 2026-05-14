import axios, { type AxiosResponse, AxiosError } from 'axios';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '@/stores/auth';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
});

client.interceptors.request.use((cfg) => {
  const auth = useAuthStore();
  if (auth.token) {
    cfg.headers = cfg.headers ?? {};
    (cfg.headers as Record<string, string>).Authorization = `Bearer ${auth.token}`;
  }
  return cfg;
});

client.interceptors.response.use(
  (resp: AxiosResponse) => {
    const body = resp.data;
    if (body && typeof body === 'object' && 'code' in body) {
      const wrapped = body as { code: number; message?: string; data: unknown };
      if (wrapped.code === 0) {
        return wrapped.data as never;
      }
      const msg = wrapped.message || `code=${wrapped.code}`;
      ElMessage.error(msg);
      return Promise.reject(new Error(msg));
    }
    return resp.data;
  },
  (err: AxiosError) => {
    const status = err.response?.status;
    if (status === 401) {
      useAuthStore().logout();
      if (location.pathname !== '/login') {
        const redirect = encodeURIComponent(location.pathname + location.search);
        location.href = `/login?redirect=${redirect}`;
      }
    }
    const respData = err.response?.data as { message?: string } | undefined;
    const msg = respData?.message || err.message || '网络错误';
    if (status !== 401) {
      ElMessage.error(msg);
    }
    return Promise.reject(new Error(msg));
  },
);

export default client;
