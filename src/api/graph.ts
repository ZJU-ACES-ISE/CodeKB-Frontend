import client from './client';
import type { CreateGraphTaskInput, GraphPayload, GraphTask } from '@/types/graph';

export const graphApi = {
  createJob(payload: CreateGraphTaskInput) {
    return client.post<GraphTask, GraphTask>('/graph-jobs', payload);
  },
  getJob(taskId: number) {
    return client.get<GraphTask, GraphTask>(`/graph-jobs/${taskId}`);
  },
  getGraph(taskId: number) {
    return client.get<GraphPayload, GraphPayload>(`/graph-jobs/${taskId}/graph`);
  },
  listByRepo(repoId: number) {
    return client.get<GraphTask[], GraphTask[]>(`/graph-jobs`, { params: { repoId } });
  },
};
