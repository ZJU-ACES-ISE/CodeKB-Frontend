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

export interface GraphLoadOptions {
  compact?: boolean;
  nodeLimit?: number;
  edgeLimit?: number;
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
  code?: string | null;
  original_id?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation?: string | null;
  edge_type: string;
  confidence?: string | null;
  confidence_score?: number | null;
  source_file?: string | null;
  source_location?: string | null;
  weight?: number | null;
  context?: string | null;
}

export interface GraphMetadata {
  node_count: number;
  edge_count: number;
  graph_type_counts: Record<string, number>;
  edge_type_counts: Record<string, number>;
  full_node_count?: number;
  full_edge_count?: number;
  returned_node_count?: number;
  returned_edge_count?: number;
  compact?: boolean;
  truncated?: boolean;
  node_code_omitted?: boolean;
}

export interface GraphPayload {
  taskId?: number;
  job?: Record<string, unknown>;
  metadata: GraphMetadata;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
