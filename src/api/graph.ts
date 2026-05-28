import client from './client';
import type { CreateGraphTaskInput, GraphLoadOptions, GraphNode, GraphPayload, GraphTask } from '@/types/graph';

const GRAPH_REQUEST_TIMEOUT_MS = 60000;

function graphParams(options?: GraphLoadOptions) {
  if (!options) return undefined;
  return {
    compact: options.compact ?? true,
    nodeLimit: options.nodeLimit,
    edgeLimit: options.edgeLimit,
  };
}

export const graphApi = {
  createJob(payload: CreateGraphTaskInput) {
    return client.post<GraphTask, GraphTask>('/graph-jobs', payload);
  },
  getJob(taskId: number) {
    return client.get<GraphTask, GraphTask>(`/graph-jobs/${taskId}`);
  },
  getGraph(taskId: number, options?: GraphLoadOptions) {
    return client.get<GraphPayload, GraphPayload>(`/graph-jobs/${taskId}/graph`, {
      params: graphParams(options),
      timeout: GRAPH_REQUEST_TIMEOUT_MS,
    });
  },
  getLatestGraph(repoId: number, options?: GraphLoadOptions) {
    return client.get<GraphPayload, GraphPayload>(`/graph/repos/${repoId}/latest`, {
      params: graphParams(options),
      timeout: GRAPH_REQUEST_TIMEOUT_MS,
    });
  },
  getNodeDetail(taskId: number, nodeId: string) {
    return client.get<GraphNode, GraphNode>(`/graph-jobs/${taskId}/node-detail`, {
      params: { nodeId },
      timeout: GRAPH_REQUEST_TIMEOUT_MS,
    });
  },
  listByRepo(repoId: number) {
    return client.get<GraphTask[], GraphTask[]>(`/graph-jobs`, { params: { repoId } });
  },
};
