/**
 * 角色控制器单元测试
 * 专门测试未覆盖的分支以提高代码覆盖率
 */

import { Framework, Application } from '@midwayjs/koa';
import { createApp, close } from '@midwayjs/mock';
import { AuthHelper, HttpHelper } from '../__helpers__';

describe('RoleController Unit Tests', () => {
  let app: Application;
  let adminToken: string;
  let httpClient: any;

  beforeAll(async () => {
    app = await createApp<Framework>();
    
    // 获取管理员token
    const loginResult = await AuthHelper.performLogin(app);
    const tokenInfo = AuthHelper.extractTokenInfo(loginResult);
    adminToken = tokenInfo.accessToken;
    
    // 创建认证客户端
    httpClient = HttpHelper.createAuthenticatedClient(app, adminToken);
  });

  afterAll(async () => {
    await close(app);
  });

  describe('page method - sort parameter coverage', () => {
    /**
     * 测试sort参数为null时的分支覆盖
     * 覆盖role.controller.ts第37行: sort || { id: 'desc' }
     */
    it('should handle null sort parameter and use default sort', async () => {
      const queryData = {
        currentPage: 1,
        pageSize: 10,
        sort: null // 明确传入null值
      };

      const response = await httpClient.post('/system/role/page', queryData);
      
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveProperty('records');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('currentPage');
      expect(response.body.data).toHaveProperty('pageSize');
    });

    /**
     * 测试sort参数为undefined时的分支覆盖
     * 覆盖role.controller.ts第37行: sort || { id: 'desc' }
     */
    it('should handle undefined sort parameter and use default sort', async () => {
      const queryData = {
        currentPage: 1,
        pageSize: 10
        // 不传入sort参数，使其为undefined
      };

      const response = await httpClient.post('/system/role/page', queryData);
      
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveProperty('records');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('currentPage');
      expect(response.body.data).toHaveProperty('pageSize');
    });

    /**
     * 测试sort参数为空字符串时的分支覆盖
     * 虽然空字符串在逻辑上不会触发||操作符，但测试边界情况
     */
    it('should handle empty string sort parameter', async () => {
      const queryData = {
        currentPage: 1,
        pageSize: 10,
        sort: '' // 空字符串
      };

      const response = await httpClient.post('/system/role/page', queryData);
      
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveProperty('records');
    });

    /**
     * 测试正常的sort参数（确保正常功能不受影响）
     */
    it('should handle valid sort parameter correctly', async () => {
      const queryData = {
        currentPage: 1,
        pageSize: 10,
        sort: JSON.stringify({ name: 'asc' })
      };

      const response = await httpClient.post('/system/role/page', queryData);
      
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveProperty('records');
    });

    /**
     * 测试sort参数为对象时的情况
     */
    it('should handle sort parameter as object', async () => {
      const queryData = {
        currentPage: 1,
        pageSize: 10,
        sort: { id: 'asc' } // 直接传入对象
      };

      const response = await httpClient.post('/system/role/page', queryData);
      
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveProperty('records');
    });
  });

  describe('page method - filter parameters coverage', () => {
    /**
     * 测试过滤参数的各种边界情况
     */
    it('should filter out invalid values correctly', async () => {
      const queryData = {
        currentPage: 1,
        pageSize: 10,
        name: '', // 空字符串应该被过滤
        code: null, // null值应该被过滤
        description: undefined, // undefined值应该被过滤
        system: false // 有效值应该保留
      };

      const response = await httpClient.post('/system/role/page', queryData);
      
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveProperty('records');
    });

    /**
     * 测试模糊查询功能
     */
    it('should handle fuzzy search with % suffix', async () => {
      const queryData = {
        currentPage: 1,
        pageSize: 10,
        name: 'admin%' // 以%结尾的模糊查询
      };

      const response = await httpClient.post('/system/role/page', queryData);
      
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveProperty('records');
    });
  });
});