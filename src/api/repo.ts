import client from './client';
import type { ImportRepoInput, KbRepo } from '@/types/api';

const ZIP_UPLOAD_TIMEOUT_MS = 600_000;

export const repoApi = {
  get(id: number) {
    return client.get<KbRepo, KbRepo>(`/repos/${id}`);
  },
  importRepo(payload: ImportRepoInput) {
    return client.post<KbRepo, KbRepo>('/repos/import', payload);
  },
  /** multipart：字段 file、kbId，可选 repo_name（对齐 Graph 服务） */
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
