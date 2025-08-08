/**
 * 分页查询工具函数
 */

import { PaginationOptions, PaginationResult, PaginationMeta } from '../modules/system/types/pagination.types';
import { DatabaseQueryOptions, WhereClause } from '../modules/system/types/database.types';

export class PaginationUtil {
  /**
   * 解析分页查询参数
   * @param query 原始查询参数
   * @returns 标准化的分页选项
   */
  static parsePaginationQuery(query: any): PaginationOptions {
    const page = Math.max(1, Number(query.currentPage) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    
    let sort: Record<string, 'asc' | 'desc'>;
    if (typeof query.sort === 'string') {
      try {
        sort = JSON.parse(query.sort);
      } catch {
        sort = { id: 'desc' };
      }
    } else if (query.sort && typeof query.sort === 'object') {
      sort = query.sort;
    } else {
      sort = { id: 'desc' };
    }
    
    return { page, limit, sort };
  }

  /**
   * 构建数据库查询条件
   * @param where 查询条件
   * @param options 分页选项
   * @returns 数据库查询选项
   */
  static buildDatabaseQuery<T>(
    where: Record<string, any>, 
    options: PaginationOptions
  ): DatabaseQueryOptions {
    const { page, limit, sort } = options;
    return {
      where: this.buildWhereClause(where),
      orderBy: sort,
      skip: (page - 1) * limit,
      take: limit
    };
  }

  /**
   * 构建查询条件子句，处理模糊查询和条件过滤
   * @param where 原始查询条件
   * @returns 处理后的查询条件
   */
  static buildWhereClause(where: Record<string, any>): WhereClause {
    const result: WhereClause = {};
    
    for (const [key, value] of Object.entries(where)) {
      // 跳过空值
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      // 处理字符串类型的模糊查询
      if (typeof value === 'string') {
        // 如果值以 % 结尾，表示模糊查询
        if (value.endsWith('%')) {
          result[key] = { contains: value.slice(0, -1) };
        } else {
          result[key] = value;
        }
      } 
      // 处理数组类型（in 查询）
      else if (Array.isArray(value)) {
        result[key] = { in: value };
      }
      // 处理布尔值和数字
      else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * 构建分页结果
   * @param records 查询结果记录
   * @param total 总记录数
   * @param options 分页选项
   * @returns 分页结果
   */
  static buildPaginationResult<T>(
    records: T[],
    total: number,
    options: PaginationOptions
  ): PaginationResult<T> {
    const { page, limit } = options;
    return {
      records,
      total,
      currentPage: page,
      pageSize: limit
    };
  }

  /**
   * 构建分页元数据
   * @param total 总记录数
   * @param options 分页选项
   * @returns 分页元数据
   */
  static buildPaginationMeta(
    total: number,
    options: PaginationOptions
  ): PaginationMeta {
    const { page, limit } = options;
    const totalPages = Math.ceil(total / limit);
    
    return {
      total,
      currentPage: page,
      pageSize: limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  /**
   * 验证分页参数
   * @param page 页码
   * @param limit 每页大小
   * @returns 验证结果
   */
  static validatePaginationParams(page: number, limit: number): { valid: boolean; error?: string } {
    if (page < 1) {
      return { valid: false, error: '页码必须大于0' };
    }
    
    if (limit < 1) {
      return { valid: false, error: '每页大小必须大于0' };
    }
    
    if (limit > 100) {
      return { valid: false, error: '每页大小不能超过100' };
    }
    
    return { valid: true };
  }
}