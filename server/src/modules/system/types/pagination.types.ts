/**
 * 分页相关的接口和类型定义
 */

export interface PaginationQuery {
  currentPage?: number;
  pageSize?: number;
  sort?: string | Record<string, 'asc' | 'desc'>;
}

export interface PaginationResult<T> {
  records: T[];
  total: number;
  currentPage: number;
  pageSize: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sort: Record<string, 'asc' | 'desc'>;
}

export interface PaginationMeta {
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}