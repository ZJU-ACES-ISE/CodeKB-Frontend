import client from './client';
import type { ImportRepoInput, ImportRepoResponse, RepoDetailResponse } from '@/types/api';

const ZIP_UPLOAD_TIMEOUT_MS = 600_000;

export const repoApi = {
  get(id: number) {
    return client.get<RepoDetailResponse, RepoDetailResponse>(`/repos/${id}`);
  },
  importRepo(payload: ImportRepoInput) {
    return client.post<ImportRepoResponse, ImportRepoResponse>('/repos/import', payload);
  },
  retryAnalysis(id: number) {
    return client.post<ImportRepoResponse, ImportRepoResponse>(`/analysis/repos/${id}/retry`);
  },
  importZip(kbId: number, file: File, repoName?: string) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kbId', String(kbId));
    if (repoName?.trim()) fd.append('repo_name', repoName.trim());
    return client.post<{ repoId: number; status: string }, { repoId: number; status: string }>(
      '/repos/import-zip',
      fd,
      { timeout: ZIP_UPLOAD_TIMEOUT_MS },
    );
  },
  remove(id: number) {
    return client.delete<void, void>(`/repos/${id}`);
  },
};
