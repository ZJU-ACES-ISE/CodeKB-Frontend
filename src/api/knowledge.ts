import client from './client';
import type { KbRepo, KnowledgeBase, KnowledgeBaseInput } from '@/types/api';

export const knowledgeApi = {
  list() {
    return client.get<KnowledgeBase[], KnowledgeBase[]>('/knowledge-bases');
  },
  get(id: number) {
    return client.get<KnowledgeBase, KnowledgeBase>(`/knowledge-bases/${id}`);
  },
  create(payload: KnowledgeBaseInput) {
    return client.post<KnowledgeBase, KnowledgeBase>('/knowledge-bases', payload);
  },
  update(id: number, payload: KnowledgeBaseInput) {
    return client.put<KnowledgeBase, KnowledgeBase>(`/knowledge-bases/${id}`, payload);
  },
  remove(id: number) {
    return client.delete<void, void>(`/knowledge-bases/${id}`);
  },
  repos(id: number) {
    return client.get<KbRepo[], KbRepo[]>(`/knowledge-bases/${id}/repos`);
  },
};
