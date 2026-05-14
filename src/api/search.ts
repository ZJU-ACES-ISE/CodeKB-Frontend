import client from './client';

export const searchApi = {
  code(q: string, limit = 20) {
    return client.get<any[], any[]>('/search/code', { params: { q, limit } });
  },
  stats() {
    return client.get<any, any>('/search/stats');
  },
};
