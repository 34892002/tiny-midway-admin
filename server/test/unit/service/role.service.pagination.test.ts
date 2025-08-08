import { createApp, close } from '@midwayjs/mock';
import { Framework } from '@midwayjs/koa';
import { Application } from '@midwayjs/koa';
import { RoleService } from '../../../src/modules/system/service/role.service';

describe('RoleService Pagination', () => {
  let app: Application;
  let roleService: RoleService;

  beforeAll(async () => {
    app = await createApp<Framework>();
    roleService = await app.getApplicationContext().getAsync(RoleService);
  });

  afterAll(async () => {
    await close(app);
  });

  describe('findAll', () => {
    it('应该使用PaginationUtil正确处理分页查询', async () => {
      const where = {};
      const options = {
        page: 1,
        limit: 10,
        sort: { id: 'desc' as const }
      };

      const result = await roleService.findAll(where, options);

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

      const result = await roleService.findAll(where, options);

      expect(result.currentPage).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('应该为每个角色记录包含权限信息', async () => {
      const where = {};
      const options = { page: 1, limit: 5 };

      const result = await roleService.findAll(where, options);

      if (result.records.length > 0) {
        const role = result.records[0];
        // 权限信息可能为空，但应该有这个属性
        expect(role).toHaveProperty('policies');
      }
    });
  });
});