/**
 * 数据库操作相关的类型定义
 */

export interface DatabaseQueryOptions {
  select?: Record<string, boolean>;
  include?: Record<string, boolean>;
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  skip?: number;
  take?: number;
}

export interface DatabaseOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WhereClause {
  [key: string]: any;
}

export interface SortClause {
  [key: string]: 'asc' | 'desc';
}

export interface QueryBuilder {
  where?: WhereClause;
  orderBy?: SortClause;
  skip?: number;
  take?: number;
  select?: Record<string, boolean>;
  include?: Record<string, boolean>;
}

export interface CountQuery {
  where?: WhereClause;
}

export interface FindManyQuery extends QueryBuilder {
  // 继承 QueryBuilder 的所有属性
}