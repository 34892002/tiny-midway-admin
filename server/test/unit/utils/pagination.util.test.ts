/**
 * 分页工具函数单元测试
 */

import { PaginationUtil } from '../../../src/utils/pagination.util';
import { PaginationOptions } from '../../../src/modules/system/types/pagination.types';

describe('PaginationUtil', () => {
  describe('parsePaginationQuery', () => {
    it('应该解析基本的分页参数', () => {
      const query = {
        currentPage: '2',
        pageSize: '10',
        sort: '{"name": "asc"}'
      };

      const result = PaginationUtil.parsePaginationQuery(query);

      expect(result).toEqual({
        page: 2,
        limit: 10,
        sort: { name: 'asc' }
      });
    });

    it('应该使用默认值处理缺失的参数', () => {
      const query = {};

      const result = PaginationUtil.parsePaginationQuery(query);

      expect(result).toEqual({
        page: 1,
        limit: 20,
        sort: { id: 'desc' }
      });
    });

    it('应该处理无效的页码和页面大小', () => {
      const query = {
        currentPage: '0',
        pageSize: '200'
      };

      const result = PaginationUtil.parsePaginationQuery(query);

      expect(result.page).toBe(1); // 最小值为1
      expect(result.limit).toBe(100); // 最大值为100
    });

    it('应该处理无效的排序参数', () => {
      const query = {
        sort: 'invalid-json'
      };

      const result = PaginationUtil.parsePaginationQuery(query);

      expect(result.sort).toEqual({ id: 'desc' });
    });

    it('应该处理对象类型的排序参数', () => {
      const query = {
        sort: { username: 'asc', createTime: 'desc' }
      };

      const result = PaginationUtil.parsePaginationQuery(query);

      expect(result.sort).toEqual({ username: 'asc', createTime: 'desc' });
    });
  });

  describe('buildDatabaseQuery', () => {
    it('应该构建正确的数据库查询条件', () => {
      const where = { username: 'test', active: true };
      const options: PaginationOptions = {
        page: 2,
        limit: 10,
        sort: { id: 'desc' }
      };

      const result = PaginationUtil.buildDatabaseQuery(where, options);

      expect(result).toEqual({
        where: { username: 'test', active: true },
        orderBy: { id: 'desc' },
        skip: 10,
        take: 10
      });
    });

    it('应该正确计算跳过的记录数', () => {
      const where = {};
      const options: PaginationOptions = {
        page: 3,
        limit: 15,
        sort: { id: 'asc' }
      };

      const result = PaginationUtil.buildDatabaseQuery(where, options);

      expect(result.skip).toBe(30); // (3-1) * 15
      expect(result.take).toBe(15);
    });
  });

  describe('buildWhereClause', () => {
    it('应该过滤空值', () => {
      const where = {
        username: 'test',
        email: null,
        phone: undefined,
        active: '',
        id: 0
      };

      const result = PaginationUtil.buildWhereClause(where);

      expect(result).toEqual({
        username: 'test',
        id: 0
      });
    });

    it('应该处理模糊查询', () => {
      const where = {
        username: 'test%',
        email: 'user@example.com'
      };

      const result = PaginationUtil.buildWhereClause(where);

      expect(result).toEqual({
        username: { contains: 'test' },
        email: 'user@example.com'
      });
    });

    it('应该处理数组类型的in查询', () => {
      const where = {
        status: ['active', 'inactive'],
        id: [1, 2, 3]
      };

      const result = PaginationUtil.buildWhereClause(where);

      expect(result).toEqual({
        status: { in: ['active', 'inactive'] },
        id: { in: [1, 2, 3] }
      });
    });

    it('应该处理布尔值和数字', () => {
      const where = {
        active: true,
        system: false,
        id: 123
      };

      const result = PaginationUtil.buildWhereClause(where);

      expect(result).toEqual({
        active: true,
        system: false,
        id: 123
      });
    });
  });

  describe('buildPaginationResult', () => {
    it('应该构建正确的分页结果', () => {
      const records = [{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }];
      const total = 25;
      const options: PaginationOptions = {
        page: 2,
        limit: 10,
        sort: { id: 'desc' }
      };

      const result = PaginationUtil.buildPaginationResult(records, total, options);

      expect(result).toEqual({
        records,
        total: 25,
        currentPage: 2,
        pageSize: 10
      });
    });
  });

  describe('buildPaginationMeta', () => {
    it('应该构建正确的分页元数据', () => {
      const total = 25;
      const options: PaginationOptions = {
        page: 2,
        limit: 10,
        sort: { id: 'desc' }
      };

      const result = PaginationUtil.buildPaginationMeta(total, options);

      expect(result).toEqual({
        total: 25,
        currentPage: 2,
        pageSize: 10,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      });
    });

    it('应该正确处理第一页', () => {
      const total = 25;
      const options: PaginationOptions = {
        page: 1,
        limit: 10,
        sort: { id: 'desc' }
      };

      const result = PaginationUtil.buildPaginationMeta(total, options);

      expect(result.hasNext).toBe(true);
      expect(result.hasPrev).toBe(false);
    });

    it('应该正确处理最后一页', () => {
      const total = 25;
      const options: PaginationOptions = {
        page: 3,
        limit: 10,
        sort: { id: 'desc' }
      };

      const result = PaginationUtil.buildPaginationMeta(total, options);

      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });
  });

  describe('validatePaginationParams', () => {
    it('应该验证有效的分页参数', () => {
      const result = PaginationUtil.validatePaginationParams(1, 20);

      expect(result).toEqual({ valid: true });
    });

    it('应该拒绝无效的页码', () => {
      const result = PaginationUtil.validatePaginationParams(0, 20);

      expect(result).toEqual({
        valid: false,
        error: '页码必须大于0'
      });
    });

    it('应该拒绝无效的页面大小', () => {
      const result1 = PaginationUtil.validatePaginationParams(1, 0);
      const result2 = PaginationUtil.validatePaginationParams(1, 101);

      expect(result1).toEqual({
        valid: false,
        error: '每页大小必须大于0'
      });

      expect(result2).toEqual({
        valid: false,
        error: '每页大小不能超过100'
      });
    });
  });
});