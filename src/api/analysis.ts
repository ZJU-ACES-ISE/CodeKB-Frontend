import client from './client';
import type { RepoSummary } from '@/types/api';

export const analysisApi = {
  summary(repoId: number) {
    return client.get<RepoSummary, RepoSummary>(`/repos/${repoId}/summary`);
  },
  rebuildSummary(repoId: number) {
    return client.post<RepoSummary, RepoSummary>(`/repos/${repoId}/summary/rebuild`);
  },
};
