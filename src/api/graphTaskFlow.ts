import client from './client';
import type { GraphTaskFlowItem } from '@/types/api';
import type { GraphTask } from '@/types/graph';

export const graphTaskFlowApi = {
  list() {
    return client.get<GraphTaskFlowItem[], GraphTaskFlowItem[]>('/graph-task-flows');
  },
  get(repoId: number) {
    return client.get<GraphTaskFlowItem, GraphTaskFlowItem>(`/graph-task-flows/${repoId}`);
  },
  listGraphJobs(repoId: number) {
    return client.get<GraphTask[], GraphTask[]>('/graph-jobs', { params: { repoId } });
  },
};
