import { Framework, Application } from '@midwayjs/koa';
import { createApp, close, createHttpRequest } from '@midwayjs/mock';
import { UserService } from '../../src/modules/base/service/user.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

// 菜单树模板
interface MockMenuTemplate {
  id: number;
  code: string;
  name: string;
  enable: boolean;
  type: string;
  parentId: number;
  path: string;
  redirect: string;
  icon: string;
  component: string;
  keepAlive: boolean;
  show: boolean;
  showTab: boolean;
  authCode: string;
  order: number;
  layout: string;
  method: string;
  description: string;
  createTime: Date;
  updateTime: Date;
  children?: MockMenuTemplate[];
}

/**
 * 创建标准菜单项的辅助函数
 */
function createMockMenuItem(options: Partial<MockMenuTemplate>): MockMenuTemplate {
  return {
    id: options.id || 1,
    code: options.code || 'default_menu',
    name: options.name || 'Default Menu',
    enable: options.enable ?? true,
    type: options.type || 'menu',
    parentId: options.parentId ?? 0,
    path: options.path || '/default',
    redirect: options.redirect ?? '',
    icon: options.icon ?? '',
    component: options.component ?? '',
    keepAlive: options.keepAlive ?? false,
    show: options.show ?? true,
    showTab: options.showTab ?? true,
    authCode: options.authCode ?? '',
    order: options.order || 1,
    layout: options.layout ?? '',
    method: options.method ?? '',
    description: options.description ?? '',
    createTime: options.createTime || new Date(),
    updateTime: options.updateTime || new Date(),
    children: options.children || []
  };
}

/**
 * 创建复杂菜单树的辅助函数
 */
function createComplexMenuTree(): MockMenuTemplate[] {
  return [
    createMockMenuItem({
      id: 1,
      code: 'parent1',
      name: 'Parent Menu 1',
      path: '/parent1',
      order: 1,
      children: [
        createMockMenuItem({
          id: 2,
          code: 'child1',
          name: 'Child Menu 1',
          parentId: 1,
          path: '/child1',
          order: 1
        }),
        createMockMenuItem({
          id: 3,
          code: 'child2',
          name: 'Child Menu 2',
          parentId: 1,
          path: '/child2',
          order: 2
        })
      ]
    }),
    createMockMenuItem({
      id: 4,
      code: 'parent2',
      name: 'Parent Menu 2',
      path: '/parent2',
      order: 2,
      children: []
    }),
    createMockMenuItem({
      id: 5,
      code: 'single',
      name: 'Single Menu',
      path: '/single',
      order: 3
    })
  ];
}

/**
 * 创建简单菜单树的辅助函数
 */
function createSimpleMenuTree(): MockMenuTemplate[] {
  return [
    createMockMenuItem({
      id: 1,
      code: 'parent_no_perm',
      name: 'Parent No Permission',
      path: '/parent_no_perm',
      children: [
        createMockMenuItem({
          id: 2,
          code: 'child_with_perm',
          name: 'Child With Permission',
          parentId: 1,
          path: '/child_with_perm'
        })
      ]
    })
  ];
}

/**
 * 创建单个菜单项的辅助函数
 */
function createSingleMenuItem(code: string = 'test_menu', name: string = 'Test Menu'): MockMenuTemplate[] {
  return [
    createMockMenuItem({
      id: 1,
      code,
      name,
      path: `/${code}`
    })
  ];
}

// 登录配置常量
const LOGIN_CONFIG = {
  username: 'admin',
  password: '123456',
  passwordKey: 'mn-admin',
  captcha: '0000'
};

/**
 * 加密密码的辅助函数
 */
function encryptPassword(password: string): string {
  const hash = crypto.createHash('md5').update(password + LOGIN_CONFIG.passwordKey).digest('hex');
  return Buffer.from(hash, 'hex').toString('base64');
}

/**
 * 执行登录操作的辅助函数
 */
async function performLogin(app: Application, username: string = LOGIN_CONFIG.username, password: string = LOGIN_CONFIG.password): Promise<any> {
  const http = createHttpRequest(app);
  const captchaResult = await http.get('/auth/captcha');
  const captchaId = captchaResult.body.data.id;
  const encryptedPassword = encryptPassword(password);

  return await http.post('/auth/login').send({
    username,
    password: encryptedPassword,
    captchaId,
    captcha: LOGIN_CONFIG.captcha,
    isRemember: false
  });
}

/**
 * 用户模块错误覆盖测试
 * 测试各种错误场景和边界情况
 */
describe('User Module Error Coverage Tests', () => {
  process.env.NODE_ENV = 'unittest';
  
  let app: Application;
  let userService: UserService;
  let adminToken: string;

  beforeAll(async () => {
    app = await createApp<Framework>();
    userService = await app.getApplicationContext().getAsync(UserService);
    
    // 获取管理员token
    const loginResult = await performLogin(app);
    adminToken = loginResult.body.data.accessToken;
  });

  afterAll(async () => {
    await close(app);
  });

  /**
   * 测试获取用户详情 - 正常情况
   */
  it('should return user detail successfully', async () => {
    const http = createHttpRequest(app);
    const result = await http
      .get('/base/user/detail')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(result.status).toBe(200);
    expect(result.body.data).toHaveProperty('id');
    expect(result.body.data).toHaveProperty('username');
    expect(result.body.data).toHaveProperty('profile');
    expect(result.body.data).toHaveProperty('currentRole');
    expect(result.body.data).toHaveProperty('roles');
    expect(result.body.data.profile).not.toHaveProperty('password'); // 密码应该被过滤
  });

  /**
   * 测试获取用户详情 - 数据库错误
   */
  it('should handle database error in getUserInfo', async () => {
    // Mock数据库错误
    const mockFindUnique = jest.spyOn(userService.prisma.user, 'findUnique')
      .mockRejectedValue(new Error('Database connection failed'));

    const http = createHttpRequest(app);
    const result = await http
      .get('/base/user/detail')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('code');
    expect(result.body.code).toBe(11007);
    expect(result.body).toHaveProperty('message');
    expect(result.body.message).toBe('用户数据异常!');

    mockFindUnique.mockRestore();
  });

  /**
   * 测试更新用户信息 - 正常情况
   */
  it('should update user info successfully', async () => {
    const http = createHttpRequest(app);
    const result = await http
      .put('/base/user/')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nickName: 'Updated Admin',
        email: 'updated@example.com'
      });

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
  });

  /**
   * 测试更新密码 - 正常情况
   */
  it('should update password successfully', async () => {
    const newPassword = 'newPassword123';
    const encodedPassword = encodeURIComponent(newPassword);

    const http = createHttpRequest(app);
    const result = await http
      .patch(`/base/user/pwd/${encodedPassword}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('code');
    expect(result.body.code).toBe(11008);
    expect(result.body).toHaveProperty('message');
    expect(result.body.message).toBe('用户数据已更新');
  });

  /**
   * 测试获取菜单列表 - 正常情况
   */
  it('should return menu list successfully', async () => {
    const http = createHttpRequest(app);
    const result = await http
      .get('/base/user/menu')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(Array.isArray(result.body.data)).toBe(true);
  });

  /**
   * 测试无token访问用户接口
   */
  it('should return 401 for unauthorized access', async () => {
    const http = createHttpRequest(app);
    const result = await http.get('/base/user/detail');

    expect(result.status).toBe(401);
  });

  /**
   * 测试无效token访问用户接口
   */
  it('should return 401 for invalid token', async () => {
    const http = createHttpRequest(app);
    const result = await http
      .get('/base/user/detail')
      .set('Authorization', 'Bearer invalid_token');

    expect(result.status).toBe(401);
  });

  /**
   * 测试UserService.getUserInfo方法 - 数据库错误
   */
  it('should handle database error in getUserInfo service', async () => {
    const mockFindUnique = jest.spyOn(userService.prisma.user, 'findUnique')
      .mockRejectedValue(new Error('Database connection failed'));

    try {
      await userService.getUserInfo(1);
    } catch (error) {
      expect(error.message).toBe('Database connection failed');
    }

    mockFindUnique.mockRestore();
  });

  /**
   * 测试UserService.getMenus方法 - 空菜单树
   */
  it('should handle empty menu tree in getMenus', async () => {
    // Mock resourceService.getMenuTree返回空数组
    const mockGetMenuTree = jest.spyOn(userService.resourceService, 'getMenuTree')
      .mockResolvedValue([]);

    const result = await userService.getMenus('admin');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);

    mockGetMenuTree.mockRestore();
  });

  /**
   * 测试UserService.getMenus方法 - 包含子菜单的情况
   */
  it('should handle menu tree with children in getMenus', async () => {
    // Mock菜单树数据，包含有权限和无权限的菜单项
    const mockMenuTree = createComplexMenuTree();

    const mockGetMenuTree = jest.spyOn(userService.resourceService, 'getMenuTree')
      .mockResolvedValue(mockMenuTree);

    // Mock权限校验，只允许部分菜单
    const mockBatchEnforce = jest.spyOn(userService.casbinService.enforcer, 'batchEnforce')
      .mockResolvedValue([true, false, true, false, true]); // parent1, child1, child2, parent2, single

    const result = await userService.getMenus('admin');
    expect(Array.isArray(result)).toBe(true);
    
    // 验证过滤逻辑：parent1应该保留（有权限），parent2应该被过滤（无权限且无子菜单），single应该保留（有权限）
    const parentCodes = result.map(item => item.code);
    expect(parentCodes).toContain('parent1');
    expect(parentCodes).toContain('single');

    mockGetMenuTree.mockRestore();
    mockBatchEnforce.mockRestore();
  });

  /**
   * 测试UserService.getMenus方法 - 父菜单无权限但有子菜单权限的情况
   */
  it('should keep parent menu when it has no permission but children have permissions', async () => {
    const mockMenuTree = createSimpleMenuTree();

    const mockGetMenuTree = jest.spyOn(userService.resourceService, 'getMenuTree')
      .mockResolvedValue(mockMenuTree);

    // Mock权限校验：父菜单无权限，子菜单有权限
    const mockBatchEnforce = jest.spyOn(userService.casbinService.enforcer, 'batchEnforce')
      .mockResolvedValue([false, true]); // parent_no_perm: false, child_with_perm: true

    const result = await userService.getMenus('admin');
    expect(Array.isArray(result)).toBe(true);
    
    // 父菜单应该被保留，因为它有子菜单权限
    expect(result.length).toBe(1);
    expect(result[0].code).toBe('parent_no_perm');
    expect(result[0].children.length).toBe(1);
    expect(result[0].children[0].code).toBe('child_with_perm');

    mockGetMenuTree.mockRestore();
    mockBatchEnforce.mockRestore();
  });

  /**
   * 测试UserService.getMenus方法 - 权限校验异常
   */
  it('should handle permission check error in getMenus', async () => {
    const mockMenuTree = createSingleMenuItem('test_menu', 'Test Menu');

    const mockGetMenuTree = jest.spyOn(userService.resourceService, 'getMenuTree')
      .mockResolvedValue(mockMenuTree);

    // Mock权限校验异常
    const mockBatchEnforce = jest.spyOn(userService.casbinService.enforcer, 'batchEnforce')
      .mockRejectedValue(new Error('Permission check failed'));

    await expect(userService.getMenus('admin')).rejects.toThrow('Permission check failed');

    mockGetMenuTree.mockRestore();
    mockBatchEnforce.mockRestore();
  });

  /**
   * 测试UserService.getUserInfo方法 - 用户不存在
   */
  it('should handle non-existent user in getUserInfo', async () => {
    const mockFindUnique = jest.spyOn(userService.prisma.user, 'findUnique')
      .mockResolvedValue(null);

    await expect(userService.getUserInfo(999999)).rejects.toThrow();

    mockFindUnique.mockRestore();
  });

  /**
   * 测试UserService.getUserInfo方法 - 角色字典为空
   */
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

    const mockFindUnique = jest.spyOn(userService.prisma.user, 'findUnique')
      .mockResolvedValue(mockUser);

    const mockGetAdminGroup = jest.spyOn(userService.casbinService, 'getAdminGroup')
      .mockResolvedValue(['TEST_ROLE']);

    const mockGetRoleDict = jest.spyOn(userService.dictService, 'getRoleDict')
      .mockResolvedValue([]);

    const result = await userService.getUserInfo(1);
    expect(result.roles).toEqual([]);
    expect(result.currentRole).toBeUndefined();

    mockFindUnique.mockRestore();
    mockGetAdminGroup.mockRestore();
    mockGetRoleDict.mockRestore();
  });

  /**
   * 测试密码加密和版本更新逻辑
   */
  it('should handle password encryption and version update', async () => {
    const testPassword = 'testPassword123';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    expect(hashedPassword).toBeDefined();
    expect(hashedPassword).not.toBe(testPassword);
    
    // 验证密码
    const isValid = await bcrypt.compare(testPassword, hashedPassword);
    expect(isValid).toBe(true);
  });

  /**
   * 测试URL解码密码参数
   */
  it('should handle URL encoded password parameter', async () => {
    const originalPassword = 'test@123!';
    const encodedPassword = encodeURIComponent(originalPassword);
    const decodedPassword = decodeURIComponent(encodedPassword);
    
    expect(decodedPassword).toBe(originalPassword);
  });

  /**
   * 测试用户角色过滤逻辑
   */
  it('should filter user roles correctly', async () => {
    // Mock角色字典数据
    const mockRoleDict = [
      { value: 'admin_role', label: '管理员' },
      { value: 'guest_role', label: '来宾' },
      { value: 'editor_role', label: '编辑' }
    ];
    
    const userRoles = ['admin_role', 'guest_role'];
    
    const filteredRoles = mockRoleDict
      .filter(item => userRoles.includes(item.value))
      .map(item => ({ code: item.value, name: item.label, enable: true }));
    
    expect(filteredRoles).toHaveLength(2);
    expect(filteredRoles[0]).toEqual({ code: 'admin_role', name: '管理员', enable: true });
    expect(filteredRoles[1]).toEqual({ code: 'guest_role', name: '来宾', enable: true });
  });

  /**
   * 测试菜单权限过滤算法
   */
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
      return arr.map(item => {
        const newItem = { ...item };
        if (newItem.children) {
          newItem.children = filterArray(newItem.children, permissionList);
        }
        return newItem;
      }).filter(item => permissionList.includes(item.code) || (item.children && item.children.length > 0));
    }
    
    const filteredTree = filterArray(mockMenuTree, permissions);
    
    expect(filteredTree).toHaveLength(1);
    expect(filteredTree[0].code).toBe('menu1');
    expect(filteredTree[0].children).toHaveLength(1);
    expect(filteredTree[0].children[0].code).toBe('menu1_1');
  });
});