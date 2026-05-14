export type GraphTaskStatus = 'PENDING' | 'SUBMITTED' | 'BUILDING' | 'READY' | 'FAILED' | string;

export interface GraphTask {
  id: number;
  repoId: number;
  graphJobId?: string | null;
  githubUrl: string;
  ref?: string | null;
  depth: number;
  status: GraphTaskStatus;
  externalStatusRaw?: string | null;
  nodeCount?: number | null;
  edgeCount?: number | null;
  snapshotUrl?: string | null;
  graphmlUrl?: string | null;
  errorMessage?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateGraphTaskInput {
  repoId: number;
  ref?: string;
  depth?: number;
}

export type GraphType =
  | 'folder_structure'
  | 'cross_file_deps'
  | 'call_graph'
  | 'class_inheritance'
  | 'ast'
  | 'cfg'
  | 'dfg'
  | 'type_deps'
  | 'code'
  | string;

export interface GraphNode {
  id: string;
  label: string;
  graph_type: GraphType;
  node_type: string;
  file_path: string;
  start_line: number;
  end_line: number;
  code: string;
  original_id?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  edge_type: string;
}

export interface GraphMetadata {
  node_count: number;
  edge_count: number;
  graph_type_counts: Record<string, number>;
  edge_type_counts: Record<string, number>;
}

export interface GraphPayload {
  job?: Record<string, unknown>;
  metadata: GraphMetadata;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
