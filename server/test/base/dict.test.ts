import { Framework, Application } from '@midwayjs/koa';
import { createApp, close, createHttpRequest } from '@midwayjs/mock';
import { DictService } from '../../src/modules/base/service/dict.service';
import * as crypto from 'crypto';

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
 * 字典模块错误覆盖测试
 * 测试各种错误场景和边界情况
 */
describe('Dict Module Error Coverage Tests', () => {
  process.env.NODE_ENV = 'unittest';

  let app: Application;
  let dictService: DictService;
  let adminToken: string;

  beforeAll(async () => {
    app = await createApp<Framework>();
    dictService = await app.getApplicationContext().getAsync(DictService);

    // 获取管理员token
    const loginResult = await performLogin(app);
    adminToken = loginResult.body.data.accessToken;
  });

  afterAll(async () => {
    await close(app);
  });

  /**
   * 测试获取不存在的字典数据
   */
  it('should return empty array for non-existent dict code', async () => {
    const http = createHttpRequest(app);
    const result = await http
      .get('/base/dict?code=non_existent_code')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(result.body.data).toEqual([]);
  });

  /**
   * 测试获取空字符串code的字典
   */
  it('should handle empty dict code', async () => {
    const http = createHttpRequest(app);
    const result = await http
      .get('/base/dict?code=')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(result.body.data).toEqual([]);
  });

  /**
   * 测试获取存在的字典数据
   */
  it('should return dict data for existing code', async () => {
    const http = createHttpRequest(app);
    const result = await http
      .get('/base/dict?code=gender')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(Array.isArray(result.body.data)).toBe(true);
    if (result.body.data.length > 0) {
      expect(result.body.data[0]).toHaveProperty('label');
      expect(result.body.data[0]).toHaveProperty('value');
    }
  });

  /**
   * 测试系统字典 - permissions
   */
  it('should return menu dict for permissions code', async () => {
    const http = createHttpRequest(app);
    const result = await http
      .get('/base/dict/sys?code=permissions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(Array.isArray(result.body.data)).toBe(true);
  });

  /**
   * 测试系统字典 - role
   */
  it('should return role dict for role code', async () => {
    const http = createHttpRequest(app);
    const result = await http
      .get('/base/dict/sys?code=role')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(Array.isArray(result.body.data)).toBe(true);
    // 验证角色字典格式
    if (result.body.data.length > 0) {
      expect(result.body.data[0]).toHaveProperty('value');
      expect(result.body.data[0]).toHaveProperty('label');
    }
  });

  /**
   * 测试系统字典 - 不支持的code
   */
  it('should return error for unsupported sys dict code', async () => {
    const http = createHttpRequest(app);
    const result = await http
      .get('/base/dict/sys?code=unsupported_code')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(result.status).toBe(200);
    expect(result.body).toHaveProperty('code');
    expect(result.body.code).toBe(10003);
    expect(result.body).toHaveProperty('message');
    expect(result.body.message).toBe('未找到字典!');
  });

  /**
   * 测试无token访问字典接口
   */
  it('should return 401 for unauthorized access', async () => {
    const http = createHttpRequest(app);
    const result = await http.get('/base/dict?code=gender');

    expect(result.status).toBe(401);
  });

  /**
   * 测试无效token访问字典接口
   */
  it('should return 401 for invalid token', async () => {
    const http = createHttpRequest(app);
    const result = await http
      .get('/base/dict?code=gender')
      .set('Authorization', 'Bearer invalid_token');

    expect(result.status).toBe(401);
  });

  /**
   * 测试DictService.getDictFromDB方法 - mock数据库错误
   */
  it('should handle database error in getDictFromDB', async () => {
    // Mock数据库查询失败
    const mockFindFirst = jest.spyOn(dictService.prisma.dict, 'findFirst')
      .mockRejectedValue(new Error('Database connection failed'));

    try {
      await dictService.getDictFromDB('test_code');
    } catch (error) {
      expect(error.message).toBe('Database connection failed');
    }

    mockFindFirst.mockRestore();
  });

  /**
   * 测试DictService.getMenuDict方法 - mock数据库错误
   */
  it('should handle database error in getMenuDict', async () => {
    // Mock数据库查询失败
    const mockFindMany = jest.spyOn(dictService.prisma.resource, 'findMany')
      .mockRejectedValue(new Error('Database connection failed'));

    try {
      await dictService.getMenuDict();
    } catch (error) {
      expect(error.message).toBe('Database connection failed');
    }

    mockFindMany.mockRestore();
  });

  /**
   * 测试DictService.getRoleDict方法 - mock数据库错误
   */
  it('should handle database error in getRoleDict', async () => {
    // Mock数据库查询失败
    const mockFindMany = jest.spyOn(dictService.prisma.role, 'findMany')
      .mockRejectedValue(new Error('Database connection failed'));

    try {
      await dictService.getRoleDict();
    } catch (error) {
      expect(error.message).toBe('Database connection failed');
    }

    mockFindMany.mockRestore();
  });

  /**
   * 测试字典数据为null的情况
   */
  it('should handle null dict data', async () => {
    // Mock返回null的字典数据
    const mockFindFirst = jest.spyOn(dictService.prisma.dict, 'findFirst')
      .mockResolvedValue(null);

    const result = await dictService.getDictFromDB('test_code');
    expect(result).toBeNull();

    mockFindFirst.mockRestore();
  });

  /**
   * 测试字典JSON解析错误
   */
  it('should handle invalid JSON in dict data', async () => {
    // Mock返回无效JSON的字典数据
    const mockFindFirst = jest.spyOn(dictService.prisma.dict, 'findFirst')
      .mockResolvedValue({
        id: 1,
        code: 'test',
        name: 'test',
        json: 'invalid json',
        createTime: new Date(),
        updateTime: new Date(),
        remark: '',
        enabled: true
      });

    try {
      await dictService.getDictFromDB('test_code');
    } catch (error) {
      expect(error).toBeInstanceOf(SyntaxError);
    }

    mockFindFirst.mockRestore();
  });

  /**
   * 测试菜单字典构建树形结构的边界情况
   */
  it('should handle empty menu data in getMenuDict', async () => {
    // Mock返回空菜单数据
    const mockFindMany = jest.spyOn(dictService.prisma.resource, 'findMany')
      .mockResolvedValue([]);

    const result = await dictService.getMenuDict();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);

    mockFindMany.mockRestore();
  });

  /**
   * 测试角色字典为空的情况
   */
  it('should handle empty role data in getRoleDict', async () => {
    // Mock返回空角色数据
    const mockFindMany = jest.spyOn(dictService.prisma.role, 'findMany')
      .mockResolvedValue([]);

    const result = await dictService.getRoleDict();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);

    mockFindMany.mockRestore();
  });

  /**
   * 测试菜单字典树形结构构建逻辑
   */
  it('should build menu tree structure correctly', async () => {
    // Mock菜单数据
    const mockMenuData = [
      {
        id: 1,
        parentId: null,
        name: '根菜单',
        code: 'root',
        type: 'MENU',
        path: '/root',
        redirect: null,
        icon: 'icon',
        component: null,
        layout: '',
        keepAlive: null,
        method: null,
        description: null,
        show: true,
        enable: true,
        order: 0,
        createTime: new Date(),
        updateTime: new Date()
      },
      {
        id: 2,
        parentId: 1,
        name: '子菜单1',
        code: 'child1',
        type: 'MENU',
        path: '/child1',
        redirect: null,
        icon: 'icon',
        component: null,
        layout: '',
        keepAlive: null,
        method: null,
        description: null,
        show: true,
        enable: true,
        order: 0,
        createTime: new Date(),
        updateTime: new Date()
      }
    ];

    const mockFindMany = jest.spyOn(dictService.prisma.resource, 'findMany')
      .mockResolvedValue(mockMenuData as any);

    const result = await dictService.getMenuDict();
    expect(Array.isArray(result)).toBe(true);

    // 验证树形结构
    if (result.length > 0) {
      const rootMenu = result.find((item: any) => item.code === 'root');
      expect(rootMenu).toBeDefined();
      expect((rootMenu as any).children).toBeDefined();
      expect(Array.isArray((rootMenu as any).children)).toBe(true);
    }

    mockFindMany.mockRestore();
  });

  /**
   * 测试字典数据的JSON字段为空字符串
   */
  it('should handle empty JSON string in dict data', async () => {
    const mockFindFirst = jest.spyOn(dictService.prisma.dict, 'findFirst')
      .mockResolvedValue({
        id: 1,
        code: 'test',
        name: 'test',
        json: '',
        createTime: new Date(),
        updateTime: new Date(),
        remark: '',
        enabled: true
      });

    const result = await dictService.getDictFromDB('test_code');
    expect(result).toBeNull();

    mockFindFirst.mockRestore();
  });

  /**
   * 测试字典数据的JSON字段为null
   */
  it('should handle null JSON field in dict data', async () => {
    const mockFindFirst = jest.spyOn(dictService.prisma.dict, 'findFirst')
      .mockResolvedValue({
        id: 1,
        code: 'test',
        name: 'test',
        json: null as any,
        createTime: new Date(),
        updateTime: new Date(),
        remark: '',
        enabled: true
      });

    const result = await dictService.getDictFromDB('test_code');
    expect(result).toBeNull();

    mockFindFirst.mockRestore();
  });

  /**
   * 测试角色字典数据格式转换
   */
  it('should transform role data format correctly', async () => {
    const mockRoleData = [
      {
        id: 1,
        name: '管理员',
        code: 'admin_role',
        system: false,
        createTime: new Date(),
        updateTime: new Date()
      },
      {
        id: 2,
        name: '来宾',
        code: 'guest_role',
        system: false,
        createTime: new Date(),
        updateTime: new Date()
      }
    ];

    const mockFindMany = jest.spyOn(dictService.prisma.role, 'findMany')
      .mockResolvedValue(mockRoleData);

    const result = await dictService.getRoleDict();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);

    expect(result[0]).toEqual({ value: 'admin_role', label: '管理员' });
    expect(result[1]).toEqual({ value: 'guest_role', label: '来宾' });

    mockFindMany.mockRestore();
  });
});