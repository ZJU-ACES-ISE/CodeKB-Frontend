export function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('zh-CN');
}

const STATUS_LABELS: Record<string, string> = {
  IMPORTED: '已导入',
  SUMMARIZED: '已解析',
  FAILED: '失败',
  PENDING: '排队中',
  BUILDING: '构建中',
  READY: '就绪',
  NONE: '未创建',
};

export function normalizeGraphTaskStatus(value?: string | null): string | null | undefined {
  if (value === 'SUBMITTED' || value === 'SLOW_BUILDING') {
    return 'BUILDING';
  }
  return value;
}

function normalizeDisplayStatus(value?: string | null): string | null | undefined {
  return normalizeGraphTaskStatus(value);
}

export function formatStatus(value?: string | null): string {
  const normalized = normalizeDisplayStatus(value);
  if (!normalized) return '-';
  return STATUS_LABELS[normalized] ?? normalized;
}

const STATUS_COLOR: Record<string, string> = {
  IMPORTED: 'info',
  SUMMARIZED: 'warning',
  FAILED: 'danger',
  PENDING: 'info',
  BUILDING: 'warning',
  READY: 'success',
  NONE: 'info',
};

export function statusTagType(value?: string | null): 'success' | 'warning' | 'info' | 'danger' | 'primary' {
  const normalized = normalizeDisplayStatus(value);
  if (!normalized) return 'info';
  return (STATUS_COLOR[normalized] as 'success' | 'warning' | 'info' | 'danger' | 'primary') ?? 'info';
}

export function repoStatusLabel(value?: string | null): string {
  return formatStatus(value);
}

export function repoStatusTagType(value?: string | null): 'success' | 'warning' | 'info' | 'danger' | 'primary' {
  return statusTagType(value);
}

export function graphTaskStatusLabel(value?: string | null): string {
  return formatStatus(value);
}

export function graphTaskStatusTagType(value?: string | null): 'success' | 'warning' | 'info' | 'danger' | 'primary' {
  return statusTagType(value);
}
