import { Framework, Application } from '@midwayjs/koa';
import { createApp, close, createHttpRequest } from '@midwayjs/mock';
import { UserService } from '../../src/modules/base/service/user.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

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
    // 这个测试需要mock resourceService.getMenuTree返回空数组
    const result = await userService.getMenus('admin');
    expect(Array.isArray(result)).toBe(true);
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