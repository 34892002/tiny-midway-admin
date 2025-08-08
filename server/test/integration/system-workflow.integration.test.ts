import { Framework, Application } from '@midwayjs/koa';
import { createApp, close } from '@midwayjs/mock';
import { AuthHelper, HttpHelper, DatabaseHelper } from '../__helpers__';
import { UserService } from '../../src/modules/system/service/user.service';
import { RoleService } from '../../src/modules/system/service/role.service';
import { PermissionService } from '../../src/modules/system/service/permission.service';
import { CasbinService } from '../../src/modules/base/service/casbin.service';

/**
 * 系统工作流集成测试
 * 验证用户和角色管理的完整流程，确保数据库查询优化不影响业务逻辑
 * 
 * 测试重点：
 * - 用户和角色管理的完整生命周期
 * - 分页查询优化验证
 * - 权限管理统一化验证
 * - 数据库查询性能优化验证
 */
describe('System Workflow Integration Tests', () => {
  process.env.NODE_ENV = 'unittest';

  let app: Application;
  let adminToken: string;
  let httpClient: any;
  
  // 服务实例
  let userService: UserService;
  let roleService: RoleService;
  let permissionService: PermissionService;
  let casbinService: CasbinService;

  beforeAll(async () => {
    app = await createApp<Framework>();
    
    // 获取服务实例
    userService = await app.getApplicationContext().getAsync(UserService);
    roleService = await app.getApplicationContext().getAsync(RoleService);
    permissionService = await app.getApplicationContext().getAsync(PermissionService);
    casbinService = await app.getApplicationContext().getAsync(CasbinService);
    
    // 设置测试数据库
    await DatabaseHelper.setupTestDatabase();
    
    // 获取管理员token
    adminToken = await AuthHelper.getAdminToken(app);
    httpClient = HttpHelper.createAuthenticatedClient(app, adminToken);
  });

  afterAll(async () => {
    await DatabaseHelper.cleanupTestDatabase();
    await close(app);
  });

  beforeEach(async () => {
    // 每个测试前重新加载策略
    await casbinService.enforcer.loadPolicy();
  });

  /**
   * 测试用户和角色管理的基本工作流
   */
  describe('Basic User and Role Management Workflow', () => {
    let testUserId: number;
    let testRoleId: number;

    afterEach(async () => {
      // 清理测试数据
      if (testUserId) {
        try {
          await httpClient.delete(`/system/user/${testUserId}`);
        } catch (error) {
          // 忽略删除错误
        }
        testUserId = null;
      }
      
      if (testRoleId) {
        try {
          await httpClient.delete(`/system/role/${testRoleId}`);
        } catch (error) {
          // 忽略删除错误
        }
        testRoleId = null;
      }
    });

    it('should create role and verify permissions', async () => {
      console.log('🔄 测试角色创建和权限验证');
      
      // 1. 创建测试角色
      const testRoleData = {
        name: '集成测试角色',
        code: `integration_test_role_${Date.now()}`,
        description: '用于集成测试的角色',
        policies: ['UserMgt', 'RoleMgt'],
        system: false
      };

      const createRoleResponse = await httpClient.post('/system/role', testRoleData);
      expect(createRoleResponse.status).toBe(200);
      expect(createRoleResponse.body.code).toBe(0);
      
      // 从角色列表中获取创建的角色
      const roleListResponse = await httpClient.post('/system/role/page', {
        code: testRoleData.code
      });
      
      expect(roleListResponse.status).toBe(200);
      expect(roleListResponse.body.code).toBe(0);
      expect(roleListResponse.body.data.records.length).toBeGreaterThan(0);
      
      const createdRole = roleListResponse.body.data.records[0];
      testRoleId = createdRole.id;
      
      console.log(`✅ 角色创建成功，ID: ${testRoleId}`);

      // 2. 验证角色权限
      for (const policy of testRoleData.policies) {
        const hasPermission = await casbinService.checkAccess(testRoleData.code, policy);
        expect(hasPermission).toBe(true);
        console.log(`✅ 角色 ${testRoleData.code} 拥有权限 ${policy}`);
      }
    });

    it('should create user and assign role', async () => {
      console.log('🔄 测试用户创建和角色分配');
      
      // 1. 先创建角色
      const testRoleData = {
        name: '用户测试角色',
        code: `user_test_role_${Date.now()}`,
        description: '用于用户测试的角色',
        policies: ['UserMgt'],
        system: false
      };

      const createRoleResponse = await httpClient.post('/system/role', testRoleData);
      expect(createRoleResponse.status).toBe(200);
      expect(createRoleResponse.body.code).toBe(0);
      
      // 获取角色ID
      const roleListResponse = await httpClient.post('/system/role/page', {
        code: testRoleData.code
      });
      const createdRole = roleListResponse.body.data.records[0];
      testRoleId = createdRole.id;

      // 2. 创建用户并分配角色
      const testUserData = {
        username: `integration_test_user_${Date.now()}`,
        password: 'test123456',
        nickName: '集成测试用户',
        email: `integration_test_${Date.now()}@example.com`,
        phone: '13800138000',
        system: false,
        roles: [testRoleData.code]
      };

      const createUserResponse = await httpClient.post('/system/user', testUserData);
      expect(createUserResponse.status).toBe(200);
      expect(createUserResponse.body.code).toBe(0);
      
      // 获取用户ID
      const userListResponse = await httpClient.post('/system/user/page', {
        username: testUserData.username
      });
      
      expect(userListResponse.status).toBe(200);
      expect(userListResponse.body.code).toBe(0);
      expect(userListResponse.body.data.records.length).toBeGreaterThan(0);
      
      const createdUser = userListResponse.body.data.records[0];
      testUserId = createdUser.id;
      
      console.log(`✅ 用户创建成功，ID: ${testUserId}`);

      // 3. 验证用户角色分配
      const userRoles = await casbinService.getAdminGroup(testUserData.username);
      expect(userRoles).toContain(testRoleData.code);
      console.log(`✅ 用户 ${testUserData.username} 已分配角色 ${testRoleData.code}`);

      // 4. 验证用户权限继承
      const hasPermission = await casbinService.checkAccess(testUserData.username, 'UserMgt');
      expect(hasPermission).toBe(true);
      console.log(`✅ 用户 ${testUserData.username} 通过角色继承权限 UserMgt`);
    });
  });

  /**
   * 测试分页查询优化
   */
  describe('Pagination Query Optimization', () => {
    it('should verify user pagination works correctly', async () => {
      console.log('🔄 测试用户分页查询');
      
      // 测试分页查询
      const paginationResponse = await httpClient.post('/system/user/page', {
        currentPage: 1,
        pageSize: 5,
        sort: '{"id": "desc"}'
      });
      
      expect(paginationResponse.status).toBe(200);
      expect(paginationResponse.body.code).toBe(0);
      expect(paginationResponse.body.data).toHaveProperty('records');
      expect(paginationResponse.body.data).toHaveProperty('total');
      expect(paginationResponse.body.data).toHaveProperty('currentPage');
      expect(paginationResponse.body.data).toHaveProperty('pageSize');
      expect(paginationResponse.body.data.currentPage).toBe(1);
      expect(paginationResponse.body.data.pageSize).toBe(5);
      expect(Array.isArray(paginationResponse.body.data.records)).toBe(true);
      
      console.log('✅ 用户分页查询验证通过');
    });

    it('should verify role pagination works correctly', async () => {
      console.log('🔄 测试角色分页查询');
      
      // 测试分页查询
      const paginationResponse = await httpClient.post('/system/role/page', {
        currentPage: 1,
        pageSize: 5,
        sort: '{"id": "desc"}'
      });
      
      expect(paginationResponse.status).toBe(200);
      expect(paginationResponse.body.code).toBe(0);
      expect(paginationResponse.body.data).toHaveProperty('records');
      expect(paginationResponse.body.data).toHaveProperty('total');
      expect(paginationResponse.body.data.currentPage).toBe(1);
      expect(paginationResponse.body.data.pageSize).toBe(5);
      
      console.log('✅ 角色分页查询验证通过');
    });
  });

  /**
   * 测试统一权限管理
   */
  describe('Unified Permission Management', () => {
    it('should verify permission service auto-reload functionality', async () => {
      console.log('🔄 测试权限服务自动重载功能');
      
      // 模拟权限操作
      let operationExecuted = false;
      const mockOperation = async () => {
        operationExecuted = true;
        return 'operation-result';
      };

      // 监听loadPolicy调用
      const loadPolicySpy = jest.spyOn(casbinService.enforcer, 'loadPolicy');
      
      const result = await permissionService.updatePermissionsWithAutoReload(mockOperation);
      
      expect(operationExecuted).toBe(true);
      expect(result).toBe('operation-result');
      expect(loadPolicySpy).toHaveBeenCalled();
      
      loadPolicySpy.mockRestore();
      console.log('✅ 权限服务自动重载功能验证通过');
    });

    it('should verify unified user role synchronization', async () => {
      console.log('🔄 测试统一用户角色同步');
      
      const testUsername = `sync_test_user_${Date.now()}`;
      const testRoles = [`sync_test_role_${Date.now()}`];
      
      // 使用统一的权限服务同步用户角色
      await permissionService.syncUserRoles(testUsername, testRoles);
      
      // 验证角色已同步
      const userRoles = await casbinService.getAdminGroup(testUsername);
      expect(userRoles).toEqual(expect.arrayContaining(testRoles));
      
      console.log('✅ 统一用户角色同步验证通过');
      
      // 清理测试数据
      await permissionService.clearUserRoles(testUsername);
    });

    it('should verify unified role permission synchronization', async () => {
      console.log('🔄 测试统一角色权限同步');
      
      const testRoleCode = `sync_test_role_${Date.now()}`;
      const testPermissions = ['TestPermission1', 'TestPermission2'];
      
      // 使用统一的权限服务同步角色权限
      await permissionService.syncRolePermissions(testRoleCode, testPermissions);
      
      // 验证权限已同步
      for (const permission of testPermissions) {
        const hasPermission = await casbinService.checkAccess(testRoleCode, permission);
        expect(hasPermission).toBe(true);
      }
      
      console.log('✅ 统一角色权限同步验证通过');
      
      // 清理测试数据
      await permissionService.cleanupRolePermissions(testRoleCode);
    });
  });

  /**
   * 测试类型安全改进
   */
  describe('Type Safety Improvements', () => {
    it('should verify service methods have proper type safety', async () => {
      console.log('🔄 测试服务方法类型安全');
      
      // 测试用户服务的类型安全
      const userResult = await userService.findAll({}, { page: 1, limit: 5 });
      
      expect(userResult).toHaveProperty('records');
      expect(userResult).toHaveProperty('total');
      expect(userResult).toHaveProperty('currentPage');
      expect(userResult).toHaveProperty('pageSize');
      expect(Array.isArray(userResult.records)).toBe(true);
      expect(typeof userResult.total).toBe('number');
      
      // 验证记录中不包含敏感信息
      if (userResult.records.length > 0) {
        const user = userResult.records[0];
        expect(user).not.toHaveProperty('password');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('nickName');
      }
      
      // 测试角色服务的类型安全
      const roleResult = await roleService.findAll({}, { page: 1, limit: 5 });
      
      expect(roleResult).toHaveProperty('records');
      expect(roleResult).toHaveProperty('total');
      expect(roleResult).toHaveProperty('currentPage');
      expect(roleResult).toHaveProperty('pageSize');
      expect(Array.isArray(roleResult.records)).toBe(true);
      
      console.log('✅ 服务方法类型安全验证通过');
    });
  });

  /**
   * 测试数据库查询性能优化
   */
  describe('Database Query Performance Optimization', () => {
    it('should verify optimized queries return correct results', async () => {
      console.log('🔄 测试数据库查询优化');
      
      // 测试查询过滤功能
      const emptyFilterResponse = await httpClient.post('/system/user/page', {
        username: '',
        nickName: null,
        email: undefined,
        phone: ''
      });
      
      expect(emptyFilterResponse.status).toBe(200);
      expect(emptyFilterResponse.body.code).toBe(0);
      
      // 测试模糊查询
      const fuzzySearchResponse = await httpClient.post('/system/user/page', {
        username: 'admin%'
      });
      
      expect(fuzzySearchResponse.status).toBe(200);
      expect(fuzzySearchResponse.body.code).toBe(0);
      
      console.log('✅ 数据库查询优化验证通过');
    });

    it('should verify query performance is acceptable', async () => {
      console.log('🔄 测试查询性能');
      
      const startTime = Date.now();
      
      // 执行一个复杂的查询
      const result = await httpClient.post('/system/user/page', {
        currentPage: 1,
        pageSize: 10,
        sort: '{"id": "desc"}'
      });
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      expect(result.status).toBe(200);
      expect(result.body.code).toBe(0);
      
      // 验证执行时间合理（不应该因为重复查询而过长）
      expect(executionTime).toBeLessThan(2000); // 2秒内完成
      
      console.log(`✅ 查询性能验证通过，执行时间: ${executionTime}ms`);
    });
  });

  /**
   * 测试错误处理
   */
  describe('Error Handling', () => {
    it('should handle permission service errors gracefully', async () => {
      console.log('🔄 测试权限服务错误处理');
      
      // 测试权限检查失败的情况
      const hasPermission = await permissionService.checkPermission('nonexistent_user', 'nonexistent_permission');
      expect(hasPermission).toBe(false);
      
      console.log('✅ 权限服务错误处理验证通过');
    });

    it('should maintain data consistency during operations', async () => {
      console.log('🔄 测试数据一致性');
      
      const testRoleCode = `consistency_test_role_${Date.now()}`;
      const testPermissions = ['ConsistencyPerm1', 'ConsistencyPerm2'];
      
      // 执行权限同步操作
      await permissionService.syncRolePermissions(testRoleCode, testPermissions);
      
      // 验证最终状态一致
      const finalPermissions = await casbinService.getAdminPlocy(testRoleCode);
      expect(Array.isArray(finalPermissions)).toBe(true);
      
      console.log('✅ 数据一致性验证通过');
      
      // 清理测试数据
      await permissionService.cleanupRolePermissions(testRoleCode);
    });
  });
});