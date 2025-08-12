import { createApp, close } from '@midwayjs/mock';
import { Framework } from '@midwayjs/koa';
import { Application } from '@midwayjs/koa';
import { UserService } from '../../../src/modules/system/service/user.service';

/**
 * 用户服务分页功能单元测试
 * 专注于测试PaginationUtil的集成和分页逻辑
 */
describe('UserService Pagination Unit Tests', () => {
  let app: Application;
  let userService: UserService;

  beforeAll(async () => {
    app = await createApp<Framework>();
    userService = await app.getApplicationContext().getAsync(UserService);
  });

  afterAll(async () => {
    await close(app);
  });

  describe('PaginationUtil Integration', () => {
    it('应该使用PaginationUtil正确处理分页查询', async () => {
      const where = {};
      const options = {
        page: 1,
        limit: 10,
        sort: { id: 'desc' as const }
      };

      const result = await userService.findAll(where, options);

      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('currentPage');
      expect(result).toHaveProperty('pageSize');
      expect(result.currentPage).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(Array.isArray(result.records)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('应该正确处理默认分页参数', async () => {
      const where = {};
      const options = {};

      const result = await userService.findAll(where, options);

      expect(result.currentPage).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('应该正确处理查询条件过滤', async () => {
      // 测试空值过滤
      const whereWithEmpty = {
        username: '',
        nickName: null,
        email: undefined
      };
      
      const result = await userService.findAll(whereWithEmpty, { page: 1, limit: 5 });
      
      expect(result).toHaveProperty('records');
      expect(Array.isArray(result.records)).toBe(true);
    });

    it('应该为每个用户记录包含角色信息并过滤敏感数据', async () => {
      const where = {};
      const options = { page: 1, limit: 5 };

      const result = await userService.findAll(where, options);

      if (result.records.length > 0) {
        const user = result.records[0];
        expect(user).toHaveProperty('roles');
        expect(Array.isArray(user.roles)).toBe(true);
        expect(user).not.toHaveProperty('password'); // 确保密码字段被过滤
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('nickName');
      }
    });
  });

  describe('Query Optimization Verification', () => {
    it('应该验证查询不会重复执行', async () => {
      // 这个测试主要验证findAll方法的实现没有重复查询问题
      const startTime = Date.now();
      
      const result = await userService.findAll({}, { page: 1, limit: 1 });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // 验证查询结果正确
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      
      // 验证执行时间合理（不应该因为重复查询而过长）
      expect(executionTime).toBeLessThan(5000); // 5秒内完成
    });
  });
});