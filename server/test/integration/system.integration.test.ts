import { Framework, Application } from '@midwayjs/koa';
import { createApp, close } from '@midwayjs/mock';
import { AuthHelper, HttpHelper, DatabaseHelper } from '../__helpers__';
import { BusinessErrors, SystemErrors } from '../../src/error/admin.error';

/**
 * 系统管理集成测试
 * 整合系统管理相关的所有测试用例，包括资源管理、菜单管理等
 * 重构自 system/resource.test.ts，使用统一的测试工具库，消除代码重复
 */
describe('System Management Integration Tests', () => {
  process.env.NODE_ENV = 'unittest';

  let app: Application;
  let adminToken: string;
  let testResourceId: number;

  // 保存原始环境变量
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRunDemo = process.env.RUN_DEMO;

  beforeAll(async () => {
    // 设置测试环境
    process.env.RUN_DEMO = 'false';

    app = await createApp<Framework>();

    // 设置测试数据库
    await DatabaseHelper.setupTestDatabase();

    // 获取管理员token
    adminToken = await AuthHelper.getAdminToken(app);
  });

  afterAll(async () => {
    // 恢复环境变量
    process.env.NODE_ENV = originalNodeEnv;
    process.env.RUN_DEMO = originalRunDemo;

    await DatabaseHelper.cleanupTestDatabase();
    await close(app);
  });

  /**
   * 辅助函数：将菜单树扁平化为数组
   */
  function flattenMenuTree(menuTree: any[]): any[] {
    const result: any[] = [];
    
    function flatten(menus: any[]) {
      for (const menu of menus) {
        result.push(menu);
        if (menu.children && menu.children.length > 0) {
          flatten(menu.children);
        }
      }
    }
    
    flatten(menuTree);
    return result;
  }

  /**
   * 资源路由管理测试
   * 测试系统路由获取功能
   */
  describe('Resource Router Management', () => {
    it('should get all routers successfully', async () => {
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);
      const routersResponse = await client.get('/system/resource/routers');
      
      expect(routersResponse.status).toBe(200);
      expect(routersResponse.body.code).toBe(0);
      expect(Array.isArray(routersResponse.body.data)).toBe(true);
    });

    it('should handle router access without authentication', async () => {
      const client = HttpHelper.createAnonymousClient(app);
      const routersResponse = await client.get('/system/resource/routers');
      
      expect(routersResponse.status).toBe(401);
    });
  });

  /**
   * 菜单生命周期管理测试
   * 测试完整的菜单CRUD操作流程
   */
  describe('Menu Lifecycle Management', () => {
    it('should complete full menu management workflow', async () => {
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);

      // 1. 获取菜单树
      const menuTreeResponse = await client.get('/system/resource/list');
      
      expect(menuTreeResponse.status).toBe(200);
      expect(menuTreeResponse.body.code).toBe(0);
      expect(menuTreeResponse.body.data).toBeDefined();

      // 2. 创建新菜单
      const createMenuData = {
        name: '集成测试菜单',
        code: 'integration_test_menu_' + Date.now(),
        type: '1',
        parentId: null,
        path: '/integration-test',
        icon: 'test-icon',
        order: 999,
        enable: true
      };

      const createResponse = await client.post('/system/resource', createMenuData);
      
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.code).toBe(0);
      expect(createResponse.body.data).toHaveProperty('id');
      
      testResourceId = createResponse.body.data.id;

      // 3. 验证菜单创建成功 - 再次获取菜单树
      const menuTreeAfterCreateResponse = await client.get('/system/resource/list');
      
      expect(menuTreeAfterCreateResponse.status).toBe(200);
      expect(menuTreeAfterCreateResponse.body.code).toBe(0);
      
      // 验证新菜单存在
      const allMenus = flattenMenuTree(menuTreeAfterCreateResponse.body.data);
      const createdMenu = allMenus.find((menu: any) => menu.id === testResourceId);
      expect(createdMenu).toBeDefined();
      expect(createdMenu.name).toBe(createMenuData.name);
      expect(createdMenu.code).toBe(createMenuData.code);

      // 4. 更新菜单信息
      const updateMenuData = {
        name: '集成测试菜单(已更新)',
        path: '/integration-test-updated',
        icon: 'updated-icon'
      };

      const updateResponse = await client.put(`/system/resource/${testResourceId}`, updateMenuData);
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.code).toBe(0);

      // 5. 验证菜单更新成功
      const menuTreeAfterUpdateResponse = await client.get('/system/resource/list');
      
      const allMenusAfterUpdate = flattenMenuTree(menuTreeAfterUpdateResponse.body.data);
      const updatedMenu = allMenusAfterUpdate.find((menu: any) => menu.id === testResourceId);
      
      expect(menuTreeAfterUpdateResponse.status).toBe(200);
      expect(menuTreeAfterUpdateResponse.body.code).toBe(0);
      expect(updatedMenu).toBeDefined();
      expect(updatedMenu.name).toBe(updateMenuData.name);
      expect(updatedMenu.path).toBe(updateMenuData.path);
      expect(updatedMenu.icon).toBe(updateMenuData.icon);

      // 6. 删除菜单
      const deleteResponse = await client.delete(`/system/resource/${testResourceId}`);
      
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.code).toBe(0);

      // 7. 验证菜单删除成功
      const menuTreeAfterDeleteResponse = await client.get('/system/resource/list');
      
      const allMenusAfterDelete = flattenMenuTree(menuTreeAfterDeleteResponse.body.data);
      
      // 确认菜单已被删除
      const deletedMenu = allMenusAfterDelete.find((menu: any) => menu.id === testResourceId);
      expect(deletedMenu).toBeUndefined();
    });
  });

  /**
   * 菜单创建验证测试
   * 测试菜单创建时的各种验证逻辑
   */
  describe('Menu Creation Validation', () => {
    it('should handle duplicate menu code error', async () => {
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);
      
      // 先创建一个菜单
      const menuData = {
        name: '重复编码测试菜单',
        code: 'duplicate_code_test_' + Date.now(),
        path: '/duplicate-test',
        type: '1',
        parentId: null
      };

      const createResponse = await client.post('/system/resource', menuData);
      
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.code).toBe(0);
      
      const createdMenuId = createResponse.body.data.id;
      
      // 尝试创建相同编码的菜单（应该失败）
      const duplicateResponse = await client.post('/system/resource', menuData);
      
      expect(duplicateResponse.status).toBe(200);
      expect(duplicateResponse.body.code).toBe(BusinessErrors.CODE_ALREADY_EXISTS.code);
      expect(duplicateResponse.body.message).toContain(BusinessErrors.CODE_ALREADY_EXISTS.error);
      
      // 清理创建的菜单
      await client.delete(`/system/resource/${createdMenuId}`);
    });

    it('should handle menu creation with order field logic', async () => {
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);
      
      // 测试不传入order字段的情况（应该默认为0）
      const menuDataWithoutOrder = {
        name: '测试菜单无Order',
        code: 'test_menu_no_order_' + Date.now(),
        path: '/test-no-order',
        type: '1',
        parentId: null
      };

      const createResponse = await client.post('/system/resource', menuDataWithoutOrder);
      
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.code).toBe(0);
      
      // 清理创建的菜单
      if (createResponse.body.data && createResponse.body.data.id) {
        await client.delete(`/system/resource/${createResponse.body.data.id}`);
      }
      
      // 测试传入order字段的情况
      const menuDataWithOrder = {
        name: '测试菜单有Order',
        code: 'test_menu_with_order_' + Date.now(),
        path: '/test-with-order',
        type: '1',
        parentId: null,
        order: 10
      };

      const createWithOrderResponse = await client.post('/system/resource', menuDataWithOrder);
      
      expect(createWithOrderResponse.status).toBe(200);
      expect(createWithOrderResponse.body.code).toBe(0);
      
      // 清理创建的菜单
      if (createWithOrderResponse.body.data && createWithOrderResponse.body.data.id) {
        await client.delete(`/system/resource/${createWithOrderResponse.body.data.id}`);
      }
    });
  });

  /**
   * 菜单更新权限变更测试
   * 测试菜单更新时的权限变更逻辑
   */
  describe('Menu Update Permission Changes', () => {
    it('should handle permission change logic during menu update', async () => {
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);
      
      // 创建测试菜单
      const menuData = {
        name: '权限变更测试菜单',
        code: 'permission_change_test_' + Date.now(),
        path: '/permission-test',
        type: '1',
        parentId: null,
        enable: true
      };

      const createResponse = await client.post('/system/resource', menuData);
      
      expect(createResponse.status).toBe(200);
      const menuId = createResponse.body.data.id;
      
      // 测试修改code（触发权限变更逻辑）
      const updateCodeData = {
        code: 'permission_change_updated_' + Date.now()
      };

      const updateCodeResponse = await client.put(`/system/resource/${menuId}`, updateCodeData);
      
      expect(updateCodeResponse.status).toBe(200);
      expect(updateCodeResponse.body.code).toBe(0);
      
      // 测试禁用菜单（触发权限变更逻辑）
      const disableData = {
        enable: false
      };

      const disableResponse = await client.put(`/system/resource/${menuId}`, disableData);
      
      expect(disableResponse.status).toBe(200);
      expect(disableResponse.body.code).toBe(0);
      
      // 清理创建的菜单
      await client.delete(`/system/resource/${menuId}`);
    });
  });

  /**
   * 菜单删除限制测试
   * 测试菜单删除时的各种限制逻辑
   */
  describe('Menu Deletion Restrictions', () => {
    it('should prevent deletion of menu with child menus', async () => {
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);
      
      // 创建父菜单
      const parentMenuData = {
        name: '父菜单测试',
        code: 'parent_menu_test_' + Date.now(),
        path: '/parent-test',
        type: '1',
        parentId: null
      };

      const parentResponse = await client.post('/system/resource', parentMenuData);
      
      expect(parentResponse.status).toBe(200);
      const parentMenuId = parentResponse.body.data.id;
      
      // 创建子菜单
      const childMenuData = {
        name: '子菜单测试',
        code: 'child_menu_test_' + Date.now(),
        path: '/child-test',
        type: '1',
        parentId: parentMenuId
      };

      const childResponse = await client.post('/system/resource', childMenuData);
      
      expect(childResponse.status).toBe(200);
      const childMenuId = childResponse.body.data.id;
      
      // 尝试删除有子菜单的父菜单（应该失败）
      const deleteParentResponse = await client.delete(`/system/resource/${parentMenuId}`);
      
      expect(deleteParentResponse.status).toBe(200);
      expect(deleteParentResponse.body.code).toBe(SystemErrors.MENU_HAS_CHILDREN.code);
      expect(deleteParentResponse.body.message).toContain(SystemErrors.MENU_HAS_CHILDREN.error);
      
      // 先删除子菜单
      const deleteChildResponse = await client.delete(`/system/resource/${childMenuId}`);
      
      expect(deleteChildResponse.status).toBe(200);
      expect(deleteChildResponse.body.code).toBe(0);
      
      // 再删除父菜单（应该成功）
      const deleteParentFinalResponse = await client.delete(`/system/resource/${parentMenuId}`);
      
      expect(deleteParentFinalResponse.status).toBe(200);
      expect(deleteParentFinalResponse.body.code).toBe(0);
    });

    it('should handle demo environment delete restrictions', async () => {
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);
      
      // 先创建一个测试菜单
      const testMenuData = {
        name: '演示环境测试菜单',
        code: 'demo_test_menu_' + Date.now(),
        path: '/demo-test',
        type: '1',
        parentId: null,
        order: 0
      };

      const createResponse = await client.post('/system/resource', testMenuData);
      
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.code).toBe(0);
      
      const testMenuId = createResponse.body.data.id;
      
      // 临时设置演示环境
      const originalEnv = process.env.RUN_DEMO;
      process.env.RUN_DEMO = 'true';
      
      try {
        // 尝试删除菜单（应该被阻止）
        const deleteResponse = await client.delete(`/system/resource/${testMenuId}`);
        
        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.code).toBe(SystemErrors.DEMO_MENU_DELETE_FORBIDDEN.code);
        expect(deleteResponse.body.message).toContain(SystemErrors.DEMO_MENU_DELETE_FORBIDDEN.error);
      } finally {
        // 恢复原始环境变量
        if (originalEnv !== undefined) {
          process.env.RUN_DEMO = originalEnv;
        } else {
          delete process.env.RUN_DEMO;
        }
        
        // 清理测试菜单（在非演示环境下）
        await client.delete(`/system/resource/${testMenuId}`);
      }
    });
  });

  /**
   * 错误处理和边界情况测试
   * 测试各种异常情况的处理
   */
  describe('Error Handling and Edge Cases', () => {
    it('should handle unauthorized access to system resources', async () => {
      const client = HttpHelper.createAnonymousClient(app);
      
      // 测试未认证访问
      const endpoints = [
        '/system/resource/list',
        '/system/resource/routers'
      ];
      
      for (const endpoint of endpoints) {
        const response = await client.get(endpoint);
        expect(response.status).toBe(401);
      }
    });

    it('should handle invalid menu data', async () => {
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);
      
      // 测试缺少必要字段的菜单创建（发送 null 值）
      const invalidMenuData = {
        name: null, // null 名称
        code: null, // null 编码
        type: '1'
      };

      const createResponse = await client.post('/system/resource', invalidMenuData);
      
      // 应该返回数据库约束错误
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.code).not.toBe(0);
    });

    it('should handle non-existent menu operations', async () => {
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);
      
      const nonExistentId = 999999;
      
      // 测试更新不存在的菜单
      const updateResponse = await client.put(`/system/resource/${nonExistentId}`, {
        name: '不存在的菜单'
      });
      
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.code).not.toBe(0);
      
      // 测试删除不存在的菜单
      const deleteResponse = await client.delete(`/system/resource/${nonExistentId}`);
      
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.code).not.toBe(0);
    });
  });
});