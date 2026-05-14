export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface User {
  id: number;
  username: string;
  displayName?: string | null;
  role: 'ADMIN' | 'USER' | string;
  enabled?: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface KnowledgeBase {
  id: number;
  name: string;
  description?: string | null;
  ownerId: number;
  ownerName?: string | null;
  repoCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface KnowledgeBaseInput {
  name: string;
  description?: string;
}

export type RepoStatus = 'IMPORTED' | 'SUMMARIZED' | 'GRAPH_READY' | 'FAILED' | string;

export interface KbRepo {
  id: number;
  kbId: number;
  name: string;
  owner?: string | null;
  repo?: string | null;
  githubUrl: string;
  ref?: string | null;
  defaultBranch?: string | null;
  language?: string | null;
  framework?: string | null;
  starCount?: number | null;
  status: RepoStatus;
  createdBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ImportRepoInput {
  kbId: number;
  githubUrl: string;
  ref?: string;
  depth?: number;
}

export interface RepoContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
}

export interface RepoSummary {
  id: number;
  repoId: number;
  primaryLanguage?: string | null;
  description?: string | null;
  frameworks?: string[] | null;
  tags?: string[] | null;
  topics?: string[] | null;
  /** key=language name, value=百分比 */
  languages?: Record<string, number> | null;
  topContributors?: RepoContributor[] | null;
  contributorCount?: number | null;
  forkCount?: number | null;
  watchersCount?: number | null;
  openIssuesCount?: number | null;
  license?: string | null;
  defaultBranch?: string | null;
  homepage?: string | null;
  sizeKb?: number | null;
  fileCount: number;
  codeLineCount: number;
  entryFiles?: string[] | null;
  complexityScore?: number | null;
  summaryText?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

