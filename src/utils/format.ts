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
  SUMMARIZED: '已摘要',
  GRAPH_READY: '关联图就绪',
  FAILED: '失败',
  PENDING: '排队中',
  SUBMITTED: '已提交',
  BUILDING: '构建中',
  READY: '就绪',
};

export function formatStatus(value?: string | null): string {
  if (!value) return '-';
  return STATUS_LABELS[value] ?? value;
}

const STATUS_COLOR: Record<string, string> = {
  IMPORTED: 'info',
  SUMMARIZED: 'warning',
  GRAPH_READY: 'success',
  FAILED: 'danger',
  PENDING: 'info',
  SUBMITTED: 'info',
  BUILDING: 'warning',
  READY: 'success',
};

export function statusTagType(value?: string | null): 'success' | 'warning' | 'info' | 'danger' | 'primary' {
  if (!value) return 'info';
  return (STATUS_COLOR[value] as 'success' | 'warning' | 'info' | 'danger' | 'primary') ?? 'info';
}
