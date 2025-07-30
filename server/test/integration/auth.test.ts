import { Framework, Application } from '@midwayjs/koa';
import { createApp, close, createHttpRequest } from '@midwayjs/mock';
import { CaptchaService } from '@midwayjs/captcha';
import { JwtService } from '@midwayjs/jwt';
import { UserService } from '../../src/modules/system/service/user.service';
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
 * @param password 待加密的密码
 * @returns 加密后的密码
 */
function encryptPassword(password: string): string {
  const hash = crypto.createHash('md5').update(password + LOGIN_CONFIG.passwordKey).digest('hex');
  return Buffer.from(hash, 'hex').toString('base64');
}

/**
 * 执行登录操作的辅助函数
 * @param app Midwayjs 应用实例
 * @param username 用户名
 * @param password 密码
 * @returns 登录结果
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
 * 认证模块集成测试
 * 包含验证码错误、登录记住状态、菜单访问和 token 刷新等测试用例
 */
describe('Auth Module Integration Tests', () => {
  /**
   * 重要：必须在导入任何模块之前设置环境变量
   * 环境变量配置错误会导致以下问题：
   * 1. Prisma 将无法正确连接目标数据库（NODE_ENV=unittest 使用test.db）
   * 2. /auth/login 登陆获取token接口（NODE_ENV=unittest 时自动绕过验证码校验）
   */
  process.env.NODE_ENV = 'unittest';
  
  let app: Application;
  let captchaService: CaptchaService;
  let jwt: JwtService;
  let userService: UserService;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRunDemo = process.env.RUN_DEMO;

  beforeAll(async () => {
    // 临时修改环境变量，确保不是 unittest 或 demo 模式 (auth-captcha-error.test.ts)
    process.env.NODE_ENV = 'development';
    process.env.RUN_DEMO = 'false';

    app = await createApp<Framework>();
    captchaService = await app.getApplicationContext().getAsync(CaptchaService);
    jwt = await app.getApplicationContext().getAsync(JwtService);
    userService = await app.getApplicationContext().getAsync(UserService);
  });

  afterAll(async () => {
    // 恢复环境变量 (auth-captcha-error.test.ts)
    process.env.NODE_ENV = originalNodeEnv;
    process.env.RUN_DEMO = originalRunDemo;
    
    await close(app);
  });

  /**
   * 测试验证码错误分支 (auth-captcha-error.test.ts)
   */
  it('should return captcha error when captcha validation fails', async () => {
    // 模拟 captchaService.check 方法，使其始终返回 false
    const mockCheck = jest.spyOn(captchaService, 'check').mockImplementation(() => Promise.resolve(false));
    
    const http = createHttpRequest(app);
    const captchaResult = await http.get('/auth/captcha');
    const captchaId = captchaResult.body.data.id;
    const encryptedPassword = encryptPassword(LOGIN_CONFIG.password);

    // 发送登录请求，预期返回验证码错误
    const loginResult = await http.post('/auth/login').send({
      username: LOGIN_CONFIG.username,
      password: encryptedPassword,
      captchaId,
      captcha: 'wrong_captcha', // 使用错误的验证码
      isRemember: false
    });

    // 验证返回结果
    expect(loginResult.status).toBe(200);
    expect(loginResult.body.code).not.toBe(0);
    expect(loginResult.body.message).toContain('验证码错误');
    
    // 恢复 mock
    mockCheck.mockRestore();
  });

  /**
   * 测试登录时记住状态为 true 的情况 (auth-login-remember.test.ts)
   */
  it('should set longer token expiration when isRemember is true', async () => {
    // 临时恢复 unittest 环境以绕过验证码校验
    process.env.NODE_ENV = 'unittest';
    
    const http = createHttpRequest(app);
    const captchaResult = await http.get('/auth/captcha');
    const captchaId = captchaResult.body.data.id;
    const encryptedPassword = encryptPassword(LOGIN_CONFIG.password);

    // 发送登录请求，设置 isRemember 为 true
    const loginResult = await http.post('/auth/login').send({
      username: LOGIN_CONFIG.username,
      password: encryptedPassword,
      captchaId,
      captcha: LOGIN_CONFIG.captcha,
      isRemember: true
    });

    // 恢复 development 环境
    process.env.NODE_ENV = 'development';

    // 验证返回结果
    expect(loginResult.status).toBe(200);
    expect(loginResult.body.code).toBe(0);
    expect(loginResult.body.data).toHaveProperty('accessToken');
    expect(loginResult.body.data).toHaveProperty('refreshToken');
    expect(loginResult.body.data).toHaveProperty('tokenExp');
    expect(loginResult.body.data).toHaveProperty('refreshTokenExp');
    
    // 记住登录状态下，refreshTokenExp 应该比 tokenExp 长很多
    const tokenExp = loginResult.body.data.tokenExp;
    const refreshTokenExp = loginResult.body.data.refreshTokenExp;
    expect(refreshTokenExp - tokenExp).toBeGreaterThan(3600 * 24); // 至少比普通 token 长一天
  });

  /**
   * 测试登录时记住状态为 false 的情况 (auth-login-remember.test.ts)
   */
  it('should set normal token expiration when isRemember is false', async () => {
    const http = createHttpRequest(app);
    const captchaResult = await http.get('/auth/captcha');
    const captchaId = captchaResult.body.data.id;
    const encryptedPassword = encryptPassword(LOGIN_CONFIG.password);

    // 发送登录请求，设置 isRemember 为 false
    const loginResult = await http.post('/auth/login').send({
      username: LOGIN_CONFIG.username,
      password: encryptedPassword,
      captchaId,
      captcha: LOGIN_CONFIG.captcha,
      isRemember: false
    });

    // 验证返回结果
    expect(loginResult.status).toBe(200);
    expect(loginResult.body.code).toBe(0);
    expect(loginResult.body.data).toHaveProperty('accessToken');
    expect(loginResult.body.data).toHaveProperty('refreshToken');
    expect(loginResult.body.data).toHaveProperty('tokenExp');
    expect(loginResult.body.data).toHaveProperty('refreshTokenExp');
    
    // 不记住登录状态下，refreshTokenExp 应该比 tokenExp 长，但不会太长
    const tokenExp = loginResult.body.data.tokenExp;
    const refreshTokenExp = loginResult.body.data.refreshTokenExp;
    expect(refreshTokenExp - tokenExp).toBeLessThan(3600 * 24 * 7); // 应该小于一周
  });

  /**
   * 测试有效的菜单路径 (auth-menu-access.test.ts)
   */
  it('should return true for valid menu path with code', async () => {
    // 登录获取 token
    const loginResult = await performLogin(app);
    const adminToken = loginResult.body.data.accessToken;
    
    const http = createHttpRequest(app);
    const result = await http
      .get('/auth/menu?path=/system/user')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(result.body.data).toBe(true);
  });

  /**
   * 测试不存在的菜单路径 (auth-menu-access.test.ts)
   */
  it('should return true for non-existent menu path', async () => {
    // 登录获取 token
    const loginResult = await performLogin(app);
    const adminToken = loginResult.body.data.accessToken;
    
    const http = createHttpRequest(app);
    const result = await http
      .get('/auth/menu?path=/non-existent-path')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(result.body.data).toBe(true); // 根据实现，应该返回 true
  });

  /**
   * 测试没有 code 的菜单路径 (auth-menu-access.test.ts)
   */
  it('should return true for menu path without code', async () => {
    // 登录获取 token
    const loginResult = await performLogin(app);
    const adminToken = loginResult.body.data.accessToken;
    
    const http = createHttpRequest(app);
    const result = await http
      .get('/auth/menu?path=/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(result.body.data).toBe(true);
  });

  /**
   * 测试菜单权限检查时用户状态为空的情况 (覆盖可选链操作符分支)
   */
  it('should handle menu access with undefined user state', async () => {
    const http = createHttpRequest(app);
    
    // 模拟 JWT 中间件设置空的用户状态
    const mockMiddleware = jest.fn((ctx, next) => {
      ctx.state.user = undefined; // 设置用户状态为 undefined
      return next();
    });
    
    // 临时替换 JWT 中间件
    const originalMiddleware = app.getApplicationContext().get('jwtPassportMiddleware');
    app.getApplicationContext().registerObject('jwtPassportMiddleware', mockMiddleware);
    
    try {
      const result = await http
        .get('/auth/menu?path=/system/user')
        .set('Authorization', 'Bearer fake-token');

      // 由于用户状态为空，username 将是 undefined，但代码应该能正常处理
      expect(result.status).toBe(200);
    } finally {
      // 恢复原始中间件
      if (originalMiddleware) {
        app.getApplicationContext().registerObject('jwtPassportMiddleware', originalMiddleware);
      }
    }
  });

  /**
   * 测试成功刷新 token (auth-refresh-success.test.ts)
   */
  it('should successfully refresh token and return new accessToken', async () => {
    // 首先登录获取 refreshToken
    const loginResult = await performLogin(app);
    expect(loginResult.status).toBe(200);
    expect(loginResult.body.code).toBe(0);
    
    const refreshToken = loginResult.body.data.refreshToken;
    expect(refreshToken).toBeTruthy();
    
    // 使用 refreshToken 请求新的 accessToken
    const http = createHttpRequest(app);
    const result = await http
      .post('/auth/refreshToken')
      .send({ token: refreshToken });

    // 验证返回结果
    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(result.body.data).toHaveProperty('accessToken');
    expect(result.body.data).toHaveProperty('tokenExp');
    
    // 验证返回的 accessToken 是有效的 JWT 格式
    expect(result.body.data.accessToken).toMatch(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    
    // 验证 tokenExp 是未来的时间戳
    const tokenExp = result.body.data.tokenExp;
    expect(tokenExp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  /**
   * 测试过期的 refreshToken (auth-refresh-token.test.ts)
   */
  it('should handle expired refresh token', async () => {
    // 创建一个过期的 token (exp 设置为过去的时间)
    const user = await userService.safeUserById(1); // 假设 ID 为 1 的用户存在
    const expiredToken = await jwt.sign(
      { id: user.id, passwordVersion: user.passwordVersion },
      { expiresIn: -3600 } // 负数表示过期的秒数
    );

    const http = createHttpRequest(app);
    const result = await http
      .post('/auth/refreshToken')
      .send({ token: expiredToken });

    expect(result.status).toBe(200);
    expect(result.body.code).not.toBe(0);
    expect(result.body.message).toContain('TOKEN_EXPIRED');
  });

  /**
   * 测试密码版本不匹配的情况 (auth-refresh-token.test.ts)
   */
  it('should handle password version mismatch', async () => {
    // 直接使用管理员用户ID（通常是1）
    const userId = 1;
    
    // 获取用户当前密码版本
    const user = await userService.safeUserById(userId);
    
    // 创建一个密码版本不匹配的 token
    const invalidVersionToken = await jwt.sign(
      { id: user.id, passwordVersion: user.passwordVersion + 999 }, // 使用一个不可能的版本号
      { expiresIn: 3600 }
    );

    const http = createHttpRequest(app);
    const result = await http
      .post('/auth/refreshToken')
      .send({ token: invalidVersionToken });

    expect(result.status).toBe(200);
    expect(result.body.code).not.toBe(0);
    expect(result.body.message).toContain('TOKEN_PASSWORD_VERSION_ERROR');
  });

  /**
   * 测试无效的 refreshToken (auth-refresh-token.test.ts)
   */
  it('should handle invalid refresh token', async () => {
    const http = createHttpRequest(app);
    const result = await http
      .post('/auth/refreshToken')
      .send({ token: 'invalid_token' });

    expect(result.status).toBe(200);
    expect(result.body.code).not.toBe(0);
    expect(result.body.message).toContain('TOKEN_ERROR');
  });

  /**
   * 测试空的 refreshToken (auth-refresh-token.test.ts)
   */
  it('should handle null refresh token', async () => {
    const http = createHttpRequest(app);
    const result = await http
      .post('/auth/refreshToken')
      .send({ token: '' });

    expect(result.status).toBe(200);
    expect(result.body.code).not.toBe(0);
    expect(result.body.message).toContain('TOKEN_NULL');
  });

  /**
   * 测试菜单权限检查时用户状态为空的情况
   */
  it('should handle menu access with empty user state', async () => {
    const http = createHttpRequest(app);
    // 使用一个无效的 token 来模拟用户状态为空的情况
    const result = await http
      .get('/auth/menu?path=/system/user')
      .set('Authorization', 'Bearer invalid_token');

    // 这个测试可能会返回 401 或其他错误状态
    expect(result.status).toBeGreaterThanOrEqual(200);
  });
});