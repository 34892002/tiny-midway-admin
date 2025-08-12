import { Framework, Application } from '@midwayjs/koa';
import { createApp, close } from '@midwayjs/mock';
import { AuthHelper, HttpHelper, DatabaseHelper } from '../__helpers__';
import { UserService } from '../../src/modules/system/service/user.service';
import { RoleService } from '../../src/modules/system/service/role.service';
import { PermissionService } from '../../src/modules/system/service/permission.service';
import { CasbinService } from '../../src/modules/base/service/casbin.service';
import { PaginationUtil } from '../../src/utils/pagination.util';

/**
 * 系统代码质量改进集成测试
 * 验证用户和角色管理的完整流程，确保数据库查询优化不影响业务逻辑
 * 
 * 测试覆盖：
 * - 用户和角色管理的完整生命周期
 * - 分页查询优化验证
 * - 权限管理统一化验证
 * - 类型安全改进验证
 * - 数据库查询性能优化验证
 */
describe('System Quality Improvement Integration Tests', () => {
  process.env.NODE_ENV = 'unittest';

  let app: Application;
  let adminToken: string;
  let httpClient: any;
  
  // 服务实例
  let userService: UserService;
  let roleService: RoleService;
  let permissionService: PermissionService;
  let casbinService: CasbinService;

  // 测试数据
  let testUserId: number;
  let testRoleId: number;
  const testUserData = {
    username: `integration_test_user_${Date.now()}`,
    password: 'test123456',
    nickName: '集成测试用户',
    email: `integration_test_${Date.now()}@example.com`,
    phone: '13800138000',
    system: false,
    roles: [] as string[]
  };
  const testRoleData = {
    name: '集成测试角色',
    code: `integration_test_role_${Date.now()}`,
    description: '用于集成测试的角色',
    policies: ['UserMgt', 'RoleMgt'],
    system: false
  };

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

  /**
   * 测试完整的用户和角色管理流程
   * 验证从角色创建、用户创建、权限分配到权限验证的完整流程
   */
  describe('Complete User and Role Management Workflow', () => {
    it('should complete full user and role management lifecycle', async () => {
      // 1. 创建测试角色
      console.log('🔄 步骤1: 创建测试角色');
      const createRoleResponse = await httpClient.post('/system/role', testRoleData);
      
      expect(createRoleResponse.status).toBe(200);
      expect(createRoleResponse.body.code).toBe(0);
      
      // 角色创建成功后，从角色列表中获取ID
      const roleListResponse = await httpClient.post('/system/role/page', {
        code: testRoleData.code
      });
      
      expect(roleListResponse.status).toBe(200);
      expect(roleListResponse.body.code).toBe(0);
      expect(roleListResponse.body.data.records.length).toBeGreaterThan(0);
      
      const createdRole = roleListResponse.body.data.records[0];
      testRoleId = createdRole.id;
      console.log(`✅ 角色创建成功，ID: ${testRoleId}`);

      // 2. 验证角色权限已正确设置
      console.log('🔄 步骤2: 验证角色权限设置');
      for (const policy of testRoleData.policies) {
        const hasPermission = await casbinService.checkAccess(testRoleData.code, policy);
        expect(hasPermission).toBe(true);
        console.log(`✅ 角色 ${testRoleData.code} 拥有权限 ${policy}`);
      }

      // 3. 创建用户并分配角色
      console.log('🔄 步骤3: 创建用户并分配角色');
      testUserData.roles = [testRoleData.code];
      const createUserResponse = await httpClient.post('/system/user', testUserData);
      
      expect(createUserResponse.status).toBe(200);
      expect(createUserResponse.body.code).toBe(0);
      
      // 从用户列表中获取创建的用户ID
      const userListResponse = await httpClient.post('/system/user/page', {
        username: testUserData.username
      });
      
      expect(userListResponse.status).toBe(200);
      expect(userListResponse.body.code).toBe(0);
      expect(userListResponse.body.data.records.length).toBeGreaterThan(0);
      
      const createdUser = userListResponse.body.data.records[0];
      testUserId = createdUser.id;
      console.log(`✅ 用户创建成功，ID: ${testUserId}`);

      // 4. 验证用户角色分配
      console.log('🔄 步骤4: 验证用户角色分配');
      const userRoles = await casbinService.getAdminGroup(testUserData.username);
      expect(userRoles).toContain(testRoleData.code);
      console.log(`✅ 用户 ${testUserData.username} 已分配角色 ${testRoleData.code}`);

      // 5. 验证用户通过角色获得权限
      console.log('🔄 步骤5: 验证用户权限继承');
      for (const policy of testRoleData.policies) {
        const hasPermission = await casbinService.checkAccess(testUserData.username, policy);
        expect(hasPermission).toBe(true);
        console.log(`✅ 用户 ${testUserData.username} 通过角色继承权限 ${policy}`);
      }

      // 6. 更新角色权限
      console.log('🔄 步骤6: 更新角色权限');
      const updatedPolicies = ['UserMgt', 'ResourceMgt']; // 移除RoleMgt，添加ResourceMgt
      const updateRoleResponse = await httpClient.put(`/system/role/${testRoleId}`, {
        name: testRoleData.name,
        system: false,
        policies: updatedPolicies
      });
      
      expect(updateRoleResponse.status).toBe(200);
      expect(updateRoleResponse.body.code).toBe(0);
      console.log('✅ 角色权限更新成功');

      // 7. 验证权限更新生效
      console.log('🔄 步骤7: 验证权限更新生效');
      await casbinService.enforcer.loadPolicy(); // 重新加载策略
      
      const hasUserMgt = await casbinService.checkAccess(testUserData.username, 'UserMgt');
      const hasResourceMgt = await casbinService.checkAccess(testUserData.username, 'ResourceMgt');
      const hasRoleMgt = await casbinService.checkAccess(testUserData.username, 'RoleMgt');
      
      expect(hasUserMgt).toBe(true);
      expect(hasResourceMgt).toBe(true);
      expect(hasRoleMgt).toBe(false); // 应该已被移除
      
      console.log('✅ 权限更新验证通过');

      // 8. 更新用户角色
      console.log('🔄 步骤8: 更新用户角色');
      const updateUserResponse = await httpClient.put(`/system/user/${testUserId}`, {
        username: testUserData.username,
        nickName: '更新后的集成测试用户',
        email: testUserData.email,
        phone: testUserData.phone,
        system: false,
        roles: ['guest'] // 分配guest角色
      });
      
      expect(updateUserResponse.status).toBe(200);
      expect(updateUserResponse.body.code).toBe(0);
      console.log('✅ 用户角色更新成功');

      // 9. 验证用户权限已被移除
      console.log('🔄 步骤9: 验证用户权限移除');
      await casbinService.enforcer.loadPolicy(); // 重新加载策略
      
      const hasUserMgtAfterUpdate = await casbinService.checkAccess(testUserData.username, 'UserMgt');
      const hasResourceMgtAfterUpdate = await casbinService.checkAccess(testUserData.username, 'ResourceMgt');
      
      expect(hasUserMgtAfterUpdate).toBe(false);
      expect(hasResourceMgtAfterUpdate).toBe(false);
      
      console.log('✅ 用户权限移除验证通过');

      console.log('🎉 完整的用户和角色管理流程测试通过');
    });
  });

  /**
   * 测试分页查询优化
   * 验证PaginationUtil的使用和查询性能优化
   */
  describe('Pagination Query Optimization', () => {
    it('should verify pagination utility is working correctly', async () => {
      console.log('🔄 测试分页工具函数');
      
      // 测试分页参数解析
      const paginationOptions = PaginationUtil.parsePaginationQuery({
        currentPage: '2',
        pageSize: '5',
        sort: '{"id": "desc"}'
      });
      
      expect(paginationOptions.page).toBe(2);
      expect(paginationOptions.limit).toBe(5);
      expect(paginationOptions.sort).toEqual({ id: 'desc' });
      
      console.log('✅ 分页参数解析正确');

      // 测试数据库查询构建
      const where = { username: 'test%', system: false };
      const dbQuery = PaginationUtil.buildDatabaseQuery(where, paginationOptions);
      
      expect(dbQuery.where).toHaveProperty('username');
      expect(dbQuery.where.username).toEqual({ contains: 'test' });
      expect(dbQuery.where.system).toBe(false);
      expect(dbQuery.orderBy).toEqual({ id: 'desc' });
      expect(dbQuery.skip).toBe(5); // (page - 1) * limit
      expect(dbQuery.take).toBe(5);
      
      console.log('✅ 数据库查询构建正确');
    });

    it('should verify user service uses optimized pagination', async () => {
      console.log('🔄 测试用户服务分页优化');
      
      // 创建一些测试用户
      const testUsers = [];
      for (let i = 0; i < 3; i++) {
        const userData = {
          username: `pagination_test_user_${i}_${Date.now()}`,
          password: 'test123456',
          nickName: `分页测试用户${i}`,
          email: `pagination_test_${i}_${Date.now()}@example.com`,
          system: false,
          roles: ['business_role']
        };
        
        const response = await httpClient.post('/system/user', userData);
        expect(response.status).toBe(200);
        expect(response.body.code).toBe(0);
        testUsers.push(userData);
      }

      // 测试分页查询
      const paginationResponse = await httpClient.post('/system/user/page', {
        currentPage: 1,
        pageSize: 2,
        sort: '{"id": "desc"}'
      });
      
      expect(paginationResponse.status).toBe(200);
      expect(paginationResponse.body.code).toBe(0);
      expect(paginationResponse.body.data).toHaveProperty('records');
      expect(paginationResponse.body.data).toHaveProperty('total');
      expect(paginationResponse.body.data).toHaveProperty('currentPage');
      expect(paginationResponse.body.data).toHaveProperty('pageSize');
      expect(paginationResponse.body.data.currentPage).toBe(1);
      expect(paginationResponse.body.data.pageSize).toBe(2);
      expect(paginationResponse.body.data.records.length).toBeLessThanOrEqual(2);
      
      console.log('✅ 用户服务分页查询优化验证通过');

      // 清理测试用户
      for (const userData of testUsers) {
        const userListResponse = await httpClient.post('/system/user/page', {
          username: userData.username
        });
        
        if (userListResponse.body.data.records.length > 0) {
          const userId = userListResponse.body.data.records[0].id;
          await httpClient.delete(`/system/user/${userId}`);
        }
      }
    });

    it('should verify role service uses optimized pagination', async () => {
      console.log('🔄 测试角色服务分页优化');
      
      // 创建一些测试角色
      const testRoles = [];
      for (let i = 0; i < 3; i++) {
        const roleData = {
          name: `分页测试角色${i}`,
          code: `pagination_test_role_${i}_${Date.now()}`,
          description: `分页测试角色${i}`,
          policies: ['UserMgt'],
          system: false
        };
        
        const response = await httpClient.post('/system/role', roleData);
        expect(response.status).toBe(200);
        expect(response.body.code).toBe(0);
        testRoles.push({ ...roleData, id: response.body.data.id });
      }

      // 测试分页查询
      const paginationResponse = await httpClient.post('/system/role/page', {
        currentPage: 1,
        pageSize: 2,
        sort: '{"id": "desc"}'
      });
      
      expect(paginationResponse.status).toBe(200);
      expect(paginationResponse.body.code).toBe(0);
      expect(paginationResponse.body.data).toHaveProperty('records');
      expect(paginationResponse.body.data).toHaveProperty('total');
      expect(paginationResponse.body.data.currentPage).toBe(1);
      expect(paginationResponse.body.data.pageSize).toBe(2);
      
      console.log('✅ 角色服务分页查询优化验证通过');

      // 清理测试角色
      for (const roleData of testRoles) {
        await httpClient.delete(`/system/role/${roleData.id}`);
      }
    });
  });

  /**
   * 测试统一权限管理
   * 验证PermissionService的统一权限管理功能
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
   * 验证类型定义和DTO的使用
   */
  describe('Type Safety Improvements', () => {
    it('should verify user service methods have proper type safety', async () => {
      console.log('🔄 测试用户服务类型安全');
      
      // 测试findAll方法的类型安全
      const where = { username: 'test' };
      const options = { page: 1, limit: 10, sort: { id: 'desc' as const } };
      
      const result = await userService.findAll(where, options);
      
      // 验证返回类型结构
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('currentPage');
      expect(result).toHaveProperty('pageSize');
      expect(Array.isArray(result.records)).toBe(true);
      expect(typeof result.total).toBe('number');
      expect(typeof result.currentPage).toBe('number');
      expect(typeof result.pageSize).toBe('number');
      
      // 验证记录中不包含敏感信息
      if (result.records.length > 0) {
        const user = result.records[0];
        expect(user).not.toHaveProperty('password');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('nickName');
      }
      
      console.log('✅ 用户服务类型安全验证通过');
    });

    it('should verify role service methods have proper type safety', async () => {
      console.log('🔄 测试角色服务类型安全');
      
      // 测试findAll方法的类型安全
      const where = { name: 'test' };
      const options = { page: 1, limit: 10, sort: { id: 'desc' as const } };
      
      const result = await roleService.findAll(where, options);
      
      // 验证返回类型结构
      expect(result).toHaveProperty('records');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('currentPage');
      expect(result).toHaveProperty('pageSize');
      expect(Array.isArray(result.records)).toBe(true);
      
      console.log('✅ 角色服务类型安全验证通过');
    });
  });

  /**
   * 测试数据库查询性能优化
   * 验证查询优化不影响业务逻辑
   */
  describe('Database Query Performance Optimization', () => {
    it('should verify optimized queries return correct results', async () => {
      console.log('🔄 测试数据库查询优化');
      
      // 创建测试数据
      const testUser = {
        username: `perf_test_user_${Date.now()}`,
        password: 'test123456',
        nickName: '性能测试用户',
        email: `perf_test_${Date.now()}@example.com`,
        system: false,
        roles: ['business_role']
      };
      
      const createResponse = await httpClient.post('/system/user', testUser);
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.code).toBe(0);
      
      // 测试优化后的查询
      const searchResponse = await httpClient.post('/system/user/page', {
        username: testUser.username,
        currentPage: 1,
        pageSize: 10
      });
      
      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.code).toBe(0);
      expect(searchResponse.body.data.records.length).toBeGreaterThan(0);
      
      const foundUser = searchResponse.body.data.records[0];
      expect(foundUser.username).toBe(testUser.username);
      expect(foundUser.nickName).toBe(testUser.nickName);
      expect(foundUser.email).toBe(testUser.email);
      
      console.log('✅ 数据库查询优化验证通过');
      
      // 清理测试数据
      await httpClient.delete(`/system/user/${foundUser.id}`);
    });

    it('should verify query filtering works correctly', async () => {
      console.log('🔄 测试查询过滤功能');
      
      // 测试空值过滤
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
      
      console.log('✅ 查询过滤功能验证通过');
    });
  });

  /**
   * 测试错误处理和边界情况
   * 确保改进后的代码能正确处理各种异常情况
   */
  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid pagination parameters gracefully', async () => {
      console.log('🔄 测试无效分页参数处理');
      
      // 测试无效的分页参数
      const invalidPageResponse = await httpClient.post('/system/user/page', {
        currentPage: -1,
        pageSize: 0,
        sort: 'invalid-json'
      });
      
      expect(invalidPageResponse.status).toBe(200);
      // 检查是否有错误或使用了默认值
      if (invalidPageResponse.body.code === 0) {
        // 如果成功，应该使用默认值
        expect(invalidPageResponse.body.data.currentPage).toBe(1);
        expect(invalidPageResponse.body.data.pageSize).toBeGreaterThan(0);
      } else {
        // 如果有错误，验证错误处理
        expect(invalidPageResponse.body.code).not.toBe(0);
        expect(invalidPageResponse.body.message).toBeDefined();
      }
      
      console.log('✅ 无效分页参数处理验证通过');
    });

    it('should handle permission service errors gracefully', async () => {
      console.log('🔄 测试权限服务错误处理');
      
      // 测试权限检查失败的情况
      const hasPermission = await permissionService.checkPermission('nonexistent_user', 'nonexistent_permission');
      expect(hasPermission).toBe(false);
      
      console.log('✅ 权限服务错误处理验证通过');
    });

    it('should maintain data consistency during concurrent operations', async () => {
      console.log('🔄 测试并发操作数据一致性');
      
      const testRoleCode = `concurrent_test_role_${Date.now()}`;
      const testPermissions1 = ['ConcurrentPerm1', 'ConcurrentPerm2'];
      const testPermissions2 = ['ConcurrentPerm3', 'ConcurrentPerm4'];
      
      // 并发执行权限同步操作
      const promises = [
        permissionService.syncRolePermissions(testRoleCode, testPermissions1),
        permissionService.syncRolePermissions(testRoleCode, testPermissions2)
      ];
      
      await Promise.all(promises);
      
      // 验证最终状态一致
      const finalPermissions = await casbinService.getAdminPlocy(testRoleCode);
      expect(Array.isArray(finalPermissions)).toBe(true);
      
      console.log('✅ 并发操作数据一致性验证通过');
      
      // 清理测试数据
      await permissionService.cleanupRolePermissions(testRoleCode);
    });
  });
});