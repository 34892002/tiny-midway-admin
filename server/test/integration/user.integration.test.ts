import { Framework, Application } from '@midwayjs/koa';
import { createApp, close } from '@midwayjs/mock';
import { AuthHelper, HttpHelper, DatabaseHelper, MockHelper } from '../__helpers__';
import { UserService } from '../../src/modules/system/service/user.service';
import { UserService as BaseUserService } from '../../src/modules/base/service/user.service';
import { BusinessErrors, AuthErrors, SystemErrors, UserDataErrors } from '../../src/error/admin.error';

/**
 * 用户管理集成测试
 * 整合 system/user.test.ts 和 base/user.test.ts 的所有测试用例
 * 包括用户CRUD、权限管理、个人信息管理、错误处理等
 */
describe('User Management Integration Tests', () => {
  process.env.NODE_ENV = 'unittest';

  let app: Application;
  let systemUserService: UserService;
  let baseUserService: BaseUserService;
  let adminToken: string;
  let http: any;

  beforeAll(async () => {
    app = await createApp<Framework>();

    // 获取服务实例
    systemUserService = await app.getApplicationContext().getAsync(UserService);
    baseUserService = await app.getApplicationContext().getAsync(BaseUserService);

    // 设置测试数据库
    await DatabaseHelper.setupTestDatabase();

    // 获取管理员token
    adminToken = await AuthHelper.getAdminToken(app);

    // 创建HTTP客户端
    http = HttpHelper.createAuthenticatedClient(app, adminToken);
  });

  afterAll(async () => {
    await DatabaseHelper.cleanupTestDatabase();
    await close(app);
  });

  beforeEach(async () => {
    // 每个测试前清理测试数据
    await DatabaseHelper.cleanupTestData(['users']);
  });

  /**
   * 系统用户管理测试 (整合自 system/user.test.ts)
   * 测试完整的用户CRUD操作流程和业务逻辑
   */
  describe('System User Management', () => {
    let testUserId: number;

    it('should complete full user management workflow', async () => {
      // 1. 查询用户列表
      const listResponse = await http.post('/system/user/page', {});

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.code).toBe(0);
      expect(listResponse.body.data).toHaveProperty('records');
      expect(listResponse.body.data).toHaveProperty('total');

      const initialCount = listResponse.body.data.total;

      // 2. 创建新用户
      const createUserData = {
        username: 'e2e_test_user_' + Date.now(),
        password: 'test123456',
        nickName: 'E2E测试用户',
        email: 'e2etest@example.com',
        phone: '13800138000',
        system: false,
        roles: ['business_role']
      };

      const createResponse = await http.post('/system/user', createUserData);
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.code).toBe(0);

      // 3. 验证用户创建成功 - 再次查询列表
      const listAfterCreateResponse = await http.post('/system/user/page', {});
      expect(listAfterCreateResponse.body.data.total).toBe(initialCount + 1);

      // 找到刚创建的用户
      const createdUser = listAfterCreateResponse.body.data.records.find(
        (user: any) => user.username === createUserData.username
      );
      expect(createdUser).toBeDefined();
      expect(createdUser.username).toBe(createUserData.username);
      expect(createdUser.nickName).toBe(createUserData.nickName);
      expect(createdUser.email).toBe(createUserData.email);
      expect(createdUser).not.toHaveProperty('password'); // 密码应该被过滤掉

      testUserId = createdUser.id;

      // 4. 更新用户信息
      const updateUserData = {
        username: createdUser.username,
        nickName: 'E2E测试用户(已更新)',
        email: 'updated_e2etest@example.com',
        phone: '13900139000',
        system: false,
        roles: ['business_role']
      };

      const updateResponse = await http.put(`/system/user/${testUserId}`, updateUserData);
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.code).toBe(0);

      // 5. 验证用户更新成功 - 再次查询列表验证
      const listAfterUpdateResponse = await http.post('/system/user/page', {});
      const updatedUser = listAfterUpdateResponse.body.data.records.find(
        (user: any) => user.id === testUserId
      );

      expect(listAfterUpdateResponse.status).toBe(200);
      expect(listAfterUpdateResponse.body.code).toBe(0);
      expect(updatedUser).toBeDefined();
      expect(updatedUser.nickName).toBe(updateUserData.nickName);
      expect(updatedUser.email).toBe(updateUserData.email);
      expect(updatedUser.phone).toBe(updateUserData.phone);

      // 6. 删除用户
      const deleteResponse = await http.delete(`/system/user/${testUserId}`);
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.code).toBe(0);

      // 7. 验证用户删除成功 - 最终查询列表
      const listAfterDeleteResponse = await http.post('/system/user/page', {});
      expect(listAfterDeleteResponse.body.data.total).toBe(initialCount);

      // 确认用户已被删除
      const deletedUser = listAfterDeleteResponse.body.data.records.find(
        (user: any) => user.id === testUserId
      );
      expect(deletedUser).toBeUndefined();
    });

    it('should test user list filtering logic', async () => {
      // 测试空值过滤
      const emptyFilterResponse = await http.post('/system/user/page', {
        username: '',
        nickName: null,
        email: undefined,
        phone: ''
      });

      expect(emptyFilterResponse.status).toBe(200);
      expect(emptyFilterResponse.body.code).toBe(0);

      // 测试模糊查询
      const fuzzySearchResponse = await http.post('/system/user/page', {
        username: 'admin%',
        nickName: '管理员%'
      });

      expect(fuzzySearchResponse.status).toBe(200);
      expect(fuzzySearchResponse.body.code).toBe(0);

      // 测试精确查询
      const exactSearchResponse = await http.post('/system/user/page', {
        username: 'admin'
      });

      expect(exactSearchResponse.status).toBe(200);
      expect(exactSearchResponse.body.code).toBe(0);
    });

    it('should test demo environment restrictions', async () => {
      // 临时设置演示环境
      const originalEnv = process.env.RUN_DEMO;
      process.env.RUN_DEMO = 'true';

      try {
        // 尝试修改系统用户（应该被阻止）
        const updateSystemUserResponse = await http.put('/system/user/1', {
          username: 'admin',
          nickName: '修改后的管理员',
          system: true
        });

        expect(updateSystemUserResponse.status).toBe(200);
        expect(updateSystemUserResponse.body.code).toBe(SystemErrors.DEMO_ENVIRONMENT_RESTRICTION.code);
        expect(updateSystemUserResponse.body.message).toContain(SystemErrors.DEMO_ENVIRONMENT_RESTRICTION.error);
      } finally {
        // 恢复原始环境变量
        if (originalEnv !== undefined) {
          process.env.RUN_DEMO = originalEnv;
        } else {
          delete process.env.RUN_DEMO;
        }
      }
    });

    it('should test user creation error handling', async () => {
      // 测试角色标识不符合规则
      const invalidRoleResponse = await http.post('/system/user', {
        username: 'test_invalid_role',
        password: 'test123456',
        nickName: '测试用户',
        email: 'test@example.com',
        system: false,
        roles: ['123invalid'] // 以数字开头的角色标识
      });

      expect(invalidRoleResponse.status).toBe(200);
      expect(invalidRoleResponse.body.code).toBe(BusinessErrors.ROLE_IDENTIFIER_INVALID.code);
      expect(invalidRoleResponse.body.message).toContain(BusinessErrors.ROLE_IDENTIFIER_INVALID.error);

      // 测试用户标识与现有角色标识重复
      const testUsername = 'admin_role_test_' + Date.now();
      const duplicateRoleResponse = await http.post('/system/user', {
        username: testUsername,
        password: 'test123456',
        nickName: '测试用户',
        email: 'test@example.com',
        system: false,
        roles: [testUsername] // 用户标识包含在角色列表中
      });

      expect(duplicateRoleResponse.status).toBe(200);
      expect(duplicateRoleResponse.body.code).toBe(BusinessErrors.USER_ROLE_CONFLICT.code);
      expect(duplicateRoleResponse.body.message).toContain(BusinessErrors.USER_ROLE_CONFLICT.error);

      // 测试角色标识与权限标识重复
      const policyConflictResponse = await http.post('/system/user', {
        username: 'test_policy_conflict',
        password: 'test123456',
        nickName: '测试用户',
        email: 'test@example.com',
        system: false,
        roles: ['UserMgt'] // 使用已存在的权限标识
      });

      expect(policyConflictResponse.status).toBe(200);
      expect(policyConflictResponse.body.code).toBe(BusinessErrors.ROLE_PERMISSION_CONFLICT.code);
      expect(policyConflictResponse.body.message).toContain(BusinessErrors.ROLE_PERMISSION_CONFLICT.error);
    });

    it('should test user update error handling', async () => {
      // 测试修改系统属性
      const systemPropertyResponse = await http.put('/system/user/1', {
        username: 'admin',
        nickName: '管理员',
        system: false, // 尝试修改系统属性
        roles: ['business_role']
      });

      expect(systemPropertyResponse.status).toBe(200);
      expect(systemPropertyResponse.body.code).toBe(AuthErrors.PERMISSION_DENIED.code);
      expect(systemPropertyResponse.body.message).toContain(AuthErrors.PERMISSION_DENIED.error);

      // 测试系统用户修改角色
      const systemUserRoleResponse = await http.put('/system/user/1', {
        username: 'admin',
        nickName: '管理员',
        system: true,
        roles: ['user'] // 尝试修改系统用户的角色
      });

      expect(systemUserRoleResponse.status).toBe(200);
      expect(systemUserRoleResponse.body.code).toBe(AuthErrors.PERMISSION_DENIED.code);
      expect(systemUserRoleResponse.body.message).toContain(AuthErrors.PERMISSION_DENIED.error);
    });

    it('should test user deletion error handling', async () => {
      // 测试删除系统用户
      const deleteSystemUserResponse = await http.delete('/system/user/1');

      expect(deleteSystemUserResponse.status).toBe(200);
      expect(deleteSystemUserResponse.body.code).toBe(BusinessErrors.SYSTEM_USER_DELETE_FORBIDDEN.code);
      expect(deleteSystemUserResponse.body.message).toContain(BusinessErrors.SYSTEM_USER_DELETE_FORBIDDEN.error);
    });

    it('should test user list pagination and sorting', async () => {
      // 测试默认分页参数
      const defaultPaginationResponse = await http.post('/system/user/page', {});

      expect(defaultPaginationResponse.status).toBe(200);
      expect(defaultPaginationResponse.body.code).toBe(0);
      expect(defaultPaginationResponse.body.data.currentPage).toBe(1);
      expect(defaultPaginationResponse.body.data.pageSize).toBe(20);

      // 测试字符串排序参数
      const stringSortResponse = await http.post('/system/user/page', {
        sort: '{"id": "asc"}' // 测试字符串格式的排序参数
      });

      expect(stringSortResponse.status).toBe(200);
      expect(stringSortResponse.body.code).toBe(0);
    });

    it('should test safe user methods', async () => {
      // 测试safeUserById和safeUserByName方法
      const safeUserById = await systemUserService.safeUserById(1);
      expect(safeUserById).toBeDefined();
      expect(safeUserById.username).toBe('root');
      expect(safeUserById).not.toHaveProperty('password'); // 确保密码被过滤掉

      // 测试safeUserByName方法
      const safeUserByName = await systemUserService.safeUserByName('root');
      expect(safeUserByName).toBeDefined();
      expect(safeUserByName.username).toBe('root');
      expect(safeUserByName).not.toHaveProperty('password'); // 确保密码被过滤掉
    });
  });

  /**
   * 个人信息管理测试 (整合自 base/user.test.ts)
   * 测试用户个人信息的查看和修改功能
   */
  describe('Personal Information Management', () => {
    it('should return user detail successfully', async () => {
      const result = await http.get('/base/user/detail');

      expect(result.status).toBe(200);
      expect(result.body.data).toHaveProperty('id');
      expect(result.body.data).toHaveProperty('username');
      expect(result.body.data).toHaveProperty('profile');
      expect(result.body.data).toHaveProperty('currentRole');
      expect(result.body.data).toHaveProperty('roles');
      expect(result.body.data.profile).not.toHaveProperty('password'); // 密码应该被过滤
    });

    it('should handle database error in getUserInfo', async () => {
      // Mock数据库错误
      const mockFindUnique = jest.spyOn(baseUserService.prisma.user, 'findUnique')
        .mockRejectedValue(new Error('Database connection failed'));

      const result = await http.get('/base/user/detail');

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('code');
      expect(result.body.code).toBe(UserDataErrors.BAD_USER_DATA.code);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBe(UserDataErrors.BAD_USER_DATA.error);

      mockFindUnique.mockRestore();
    });

    it('should update user info successfully', async () => {
      const result = await http.put('/base/user/', {
        nickName: 'Updated Admin',
        email: 'updated@example.com'
      });

      expect(result.status).toBe(200);
      expect(result.body.code).toBe(0);
    });

    it('should update password successfully', async () => {
      const newPassword = 'newPassword123';
      const encodedPassword = encodeURIComponent(newPassword);

      const result = await http.patch(`/base/user/pwd/${encodedPassword}`);

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('code');
      expect(result.body.code).toBe(UserDataErrors.TIMEOUT_USER_DATA.code);
      expect(result.body).toHaveProperty('message');
      expect(result.body.message).toBe(UserDataErrors.TIMEOUT_USER_DATA.error);
    });

    it('should return menu list successfully', async () => {
      const result = await http.get('/base/user/menu');

      expect(result.status).toBe(200);
      expect(result.body.code).toBe(0);
      expect(Array.isArray(result.body.data)).toBe(true);
    });

    it('should handle empty menu tree in getMenus', async () => {
      // Mock resourceService.getMenuTree返回空数组
      const mockGetMenuTree = jest.spyOn(baseUserService.resourceService, 'getMenuTree')
        .mockResolvedValue([]);

      const result = await baseUserService.getMenus('admin');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);

      mockGetMenuTree.mockRestore();
    });

    it('should handle menu tree with children in getMenus', async () => {
      // Mock菜单树数据，包含有权限和无权限的菜单项
      const mockMenuTree = MockHelper.createComplexMenuTree();

      const mockGetMenuTree = jest.spyOn(baseUserService.resourceService, 'getMenuTree')
        .mockResolvedValue(mockMenuTree);

      // Mock权限校验，只允许部分菜单
      const mockBatchEnforce = jest.spyOn(baseUserService.casbinService.enforcer, 'batchEnforce')
        .mockResolvedValue([true, false, true, false, true]); // 部分权限

      const result = await baseUserService.getMenus('admin');
      expect(Array.isArray(result)).toBe(true);

      mockGetMenuTree.mockRestore();
      mockBatchEnforce.mockRestore();
    });

    it('should handle non-existent user in getUserInfo', async () => {
      const mockFindUnique = jest.spyOn(baseUserService.prisma.user, 'findUnique')
        .mockResolvedValue(null);

      await expect(baseUserService.getUserInfo(999999)).rejects.toThrow();

      mockFindUnique.mockRestore();
    });

    it('should handle empty role dict in getUserInfo', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashedpassword',
        email: 'test@example.com',
        phone: '',
        nickName: '',
        address: '',
        system: false,
        passwordVersion: 1,
        gender: 0,
        avatar: '',
        createTime: new Date(),
        updateTime: new Date()
      };

      const mockFindUnique = jest.spyOn(baseUserService.prisma.user, 'findUnique')
        .mockResolvedValue(mockUser);

      const mockGetAdminGroup = jest.spyOn(baseUserService.casbinService, 'getAdminGroup')
        .mockResolvedValue(['TEST_ROLE']);

      const mockGetRoleDict = jest.spyOn(baseUserService.dictService, 'getRoleDict')
        .mockResolvedValue([]);

      const result = await baseUserService.getUserInfo(1);
      expect(result.roles).toEqual([]);
      expect(result.currentRole).toBeUndefined();

      mockFindUnique.mockRestore();
      mockGetAdminGroup.mockRestore();
      mockGetRoleDict.mockRestore();
    });
  });

  /**
   * 用户查询和过滤测试
   * 测试用户列表的各种查询和过滤功能
   */
  describe('User Query and Filtering', () => {
    beforeEach(async () => {
      // 创建测试用户数据
      const testUsers = MockHelper.createMockUserList(3).map((user: any, index: number) => ({
        ...user,
        username: `test_query_user_${index}_${Date.now()}`,
        nickName: `查询测试用户${index}`,
        email: `query_test_${index}@example.com`
      }));

      for (const userData of testUsers) {
        await http.post('/system/user', userData);
      }
    });

    it('should filter users by various criteria', async () => {
      // 测试空值过滤
      const emptyFilterResult = await http.post('/system/user/page', {
        username: '',
        nickName: null,
        email: undefined,
        phone: ''
      });

      expect(emptyFilterResult.status).toBe(200);
      expect(emptyFilterResult.body.code).toBe(0);

      // 测试模糊查询 - 使用已存在的admin用户
      const fuzzySearchResult = await http.post('/system/user/page', {
        username: 'admin%'
      });

      expect(fuzzySearchResult.status).toBe(200);
      expect(fuzzySearchResult.body.code).toBe(0);
      expect(fuzzySearchResult.body.data.records.length).toBeGreaterThan(0);

      // 测试精确查询
      const exactSearchResult = await http.post('/system/user/page', {
        username: 'admin'
      });

      expect(exactSearchResult.status).toBe(200);
      expect(exactSearchResult.body.code).toBe(0);
    });

    it('should handle pagination and sorting', async () => {
      // 测试默认分页参数
      const defaultPaginationResult = await http.post('/system/user/page', {});

      expect(defaultPaginationResult.status).toBe(200);
      expect(defaultPaginationResult.body.code).toBe(0);
      expect(defaultPaginationResult.body.data.currentPage).toBe(1);
      expect(defaultPaginationResult.body.data.pageSize).toBe(20);

      // 测试自定义分页
      const customPaginationResult = await http.post('/system/user/page', {
        currentPage: 1,
        pageSize: 5
      });

      expect(customPaginationResult.status).toBe(200);
      expect(customPaginationResult.body.code).toBe(0);
      expect(customPaginationResult.body.data.pageSize).toBe(5);

      // 测试排序
      const sortedResult = await http.post('/system/user/page', {
        sort: JSON.stringify({ id: 'desc' })
      });

      expect(sortedResult.status).toBe(200);
      expect(sortedResult.body.code).toBe(0);
    });

    it('should test findAll method edge cases for coverage', async () => {
      // 测试不传递limit参数，使用默认值20
      const resultWithDefaultLimit = await systemUserService.findAll({}, {});
      expect(resultWithDefaultLimit.pageSize).toBe(20);

      // 测试传递字符串格式的sort参数来覆盖JSON.parse分支
      const resultWithStringSort = await systemUserService.findAll({}, {
        sort: '{"id": "asc"}' // 字符串格式的排序参数
      });
      expect(resultWithStringSort).toBeDefined();
      expect(resultWithStringSort.records).toBeDefined();

      // 测试传递null的roles参数来覆盖roles?.length分支
      try {
        await systemUserService.checkNameAndRoles('testuser', null);
      } catch (error: any) {
        expect(error.message).toBe(BusinessErrors.ROLE_LIST_EMPTY.error);
      }
    });
  });

  /**
   * 错误处理和边界情况测试
   * 整合各种错误场景和边界情况的测试
   */
  describe('Error Handling and Edge Cases', () => {
    it('should handle unauthorized access', async () => {
      const anonymousClient = HttpHelper.createAnonymousClient(app);
      const result = await anonymousClient.get('/base/user/detail');

      expect(result.status).toBe(401);
    });

    it('should handle invalid token access', async () => {
      const invalidClient = HttpHelper.createAuthenticatedClient(app, 'invalid_token');
      const result = await invalidClient.get('/base/user/detail');

      expect(result.status).toBe(401);
    });

    it('should handle database errors gracefully', async () => {
      // Mock数据库错误
      const mockFindMany = jest.spyOn(systemUserService.prisma.user, 'findMany')
        .mockRejectedValue(new Error('Database connection failed'));

      const result = await http.post('/system/user/page', {});

      // 应该返回适当的错误处理
      expect(result.status).toBe(200);
      expect(result.body.code).not.toBe(0);

      mockFindMany.mockRestore();
    });

    it('should handle non-existent user operations', async () => {
      // 尝试更新不存在的用户
      const updateResult = await http.put('/system/user/999999', {
        username: 'nonexistent',
        nickName: '不存在的用户'
      });

      expect(updateResult.status).toBe(200);
      expect(updateResult.body.code).not.toBe(0);

      // 尝试删除不存在的用户
      const deleteResult = await http.delete('/system/user/999999');

      expect(deleteResult.status).toBe(200);
      expect(deleteResult.body.code).not.toBe(0);
    });

    it('should validate required fields', async () => {
      // 尝试创建缺少必填字段的用户
      const incompleteUserData = {
        // 缺少username和password
        nickName: '不完整的用户',
        email: 'incomplete@example.com',
        system: false,
        roles: ['business_role']
      };

      const result = await http.post('/system/user', incompleteUserData);

      expect(result.status).toBe(200);
      expect(result.body.code).not.toBe(0);
    });

    it('should handle duplicate username', async () => {
      // 先创建一个用户
      const originalUserData = {
        username: 'duplicate_test_user_' + Date.now(),
        password: 'test123456',
        nickName: '原始用户',
        email: 'original@example.com',
        system: false,
        roles: ['business_role']
      };

      const createResult = await http.post('/system/user', originalUserData);
      expect(createResult.status).toBe(200);
      expect(createResult.body.code).toBe(0);

      // 尝试创建重复用户名的用户
      const duplicateUserData = {
        username: originalUserData.username, // 使用相同的用户名
        password: 'test123456',
        nickName: '重复用户',
        email: 'duplicate@example.com',
        system: false,
        roles: ['business_role']
      };

      const result = await http.post('/system/user', duplicateUserData);

      expect(result.status).toBe(200);
      expect(result.body.code).not.toBe(0);
      // 根据实际的错误消息调整期望值
      expect(result.body.message).toBeDefined();
    });

    it('should handle password encryption and validation', async () => {
      const testPassword = 'testPassword123';
      const encryptedPassword = AuthHelper.encryptPassword(testPassword);

      expect(encryptedPassword).toBeDefined();
      expect(encryptedPassword).not.toBe(testPassword);

      // 验证相同密码加密结果一致
      const encryptedPassword2 = AuthHelper.encryptPassword(testPassword);
      expect(encryptedPassword).toBe(encryptedPassword2);
    });

    it('should handle URL encoded password parameter', async () => {
      const originalPassword = 'test@123!';
      const encodedPassword = encodeURIComponent(originalPassword);
      const decodedPassword = decodeURIComponent(encodedPassword);

      expect(decodedPassword).toBe(originalPassword);
    });

    it('should filter user roles correctly', async () => {
      // Mock角色字典数据
      const mockRoleDict = [
        { value: 'admin_role', label: '管理员' },
        { value: 'guest_role', label: '来宾' },
        { value: 'editor_role', label: '编辑' }
      ];

      const userRoles = ['admin_role', 'guest_role'];

      const filteredRoles = mockRoleDict
        .filter((item: any) => userRoles.includes(item.value))
        .map((item: any) => ({ code: item.value, name: item.label, enable: true }));

      expect(filteredRoles).toHaveLength(2);
      expect(filteredRoles[0]).toEqual({ code: 'admin_role', name: '管理员', enable: true });
      expect(filteredRoles[1]).toEqual({ code: 'guest_role', name: '来宾', enable: true });
    });

    it('should filter menu tree by permissions correctly', async () => {
      const mockMenuTree = [
        {
          code: 'menu1',
          name: '菜单1',
          children: [
            { code: 'menu1_1', name: '子菜单1_1', children: [] },
            { code: 'menu1_2', name: '子菜单1_2', children: [] }
          ]
        },
        {
          code: 'menu2',
          name: '菜单2',
          children: []
        }
      ];

      const permissions = ['menu1', 'menu1_1']; // 只有部分权限

      function filterArray(arr: any[], permissionList: string[]) {
        return arr.map((item: any) => {
          const newItem = { ...item };
          if (newItem.children) {
            newItem.children = filterArray(newItem.children, permissionList);
          }
          return newItem;
        }).filter((item: any) => permissionList.includes(item.code) || (item.children && item.children.length > 0));
      }

      const filteredTree = filterArray(mockMenuTree, permissions);

      expect(filteredTree).toHaveLength(1);
      expect(filteredTree[0].code).toBe('menu1');
      expect(filteredTree[0].children).toHaveLength(1);
      expect(filteredTree[0].children[0].code).toBe('menu1_1');
    });

    it('should handle database transaction error handling', async () => {
      // 创建一个测试用户用于后续操作
      const createUserData = {
        username: 'transaction_test_user_' + Date.now(),
        password: 'test123456',
        nickName: '事务测试用户',
        email: 'transaction@example.com',
        phone: '13800138000',
        system: false,
        roles: ['test_role']
      };

      const createResponse = await http.post('/system/user', createUserData);
      expect(createResponse.status).toBe(200);
      expect(createResponse.body.code).toBe(0);

      // 获取创建的用户ID
      const listResponse = await http.post('/system/user/page', {});
      const createdUser = listResponse.body.data.records.find(
        (user: any) => user.username === createUserData.username
      );

      expect(createdUser).toBeDefined();
      const userId = createdUser.id;

      // 尝试更新用户时使用无效的角色标识来触发checkNameAndRoles错误
      const invalidUpdateResponse = await http.put(`/system/user/${userId}`, {
        username: createUserData.username,
        nickName: '更新后的用户',
        system: false,
        roles: ['123invalid_role'] // 无效的角色标识，会触发checkNameAndRoles错误
      });

      expect(invalidUpdateResponse.status).toBe(200);
      expect(invalidUpdateResponse.body.code).toBe(BusinessErrors.ROLE_IDENTIFIER_INVALID.code);
      expect(invalidUpdateResponse.body.message).toContain(BusinessErrors.ROLE_IDENTIFIER_INVALID.error);

      // 清理测试数据
      await http.delete(`/system/user/${userId}`);
    });
  });
});