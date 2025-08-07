import { Framework, Application } from '@midwayjs/koa';
import { createApp, close } from '@midwayjs/mock';
import { AuthHelper, HttpHelper, DatabaseHelper } from '../__helpers__';
import { CaptchaService } from '@midwayjs/captcha';
import { JwtService } from '@midwayjs/jwt';
import { UserService } from '../../src/modules/system/service/user.service';
import { AuthErrors } from '../../src/error/admin.error';

/**
 * 认证模块集成测试
 * 整合所有认证相关的测试用例，包括登录、token管理、验证码和菜单权限
 * 重构自 role/auth.test.ts，使用统一的测试工具库，消除代码重复
 */
describe('Authentication Integration Tests', () => {
  process.env.NODE_ENV = 'unittest';

  let app: Application;
  let captchaService: CaptchaService;
  let jwtService: JwtService;
  let userService: UserService;

  // 保存原始环境变量
  const originalNodeEnv = process.env.NODE_ENV;
  const originalRunDemo = process.env.RUN_DEMO;

  beforeAll(async () => {
    // 设置测试环境
    process.env.RUN_DEMO = 'false';

    app = await createApp<Framework>();

    // 获取服务实例
    captchaService = await app.getApplicationContext().getAsync(CaptchaService);
    jwtService = await app.getApplicationContext().getAsync(JwtService);
    userService = await app.getApplicationContext().getAsync(UserService);

    // 设置测试数据库
    await DatabaseHelper.setupTestDatabase();
  });

  afterAll(async () => {
    // 恢复环境变量
    process.env.NODE_ENV = originalNodeEnv;
    process.env.RUN_DEMO = originalRunDemo;

    await DatabaseHelper.cleanupTestDatabase();
    await close(app);
  });

  /**
   * 基础登录认证测试
   * 整合自 role/auth.test.ts，使用统一的 AuthHelper 工具库
   */
  describe('Login Authentication', () => {
    it('should login successfully with valid credentials', async () => {
      const loginResult = await AuthHelper.performLogin(app);

      expect(loginResult.status).toBe(200);
      expect(loginResult.body.code).toBe(0);
      expect(loginResult.body.data).toHaveProperty('accessToken');
      expect(loginResult.body.data).toHaveProperty('refreshToken');
      expect(loginResult.body.data).toHaveProperty('tokenExp');
      expect(loginResult.body.data).toHaveProperty('refreshTokenExp');

      // 验证 token 格式正确
      expect(AuthHelper.validateToken(loginResult.body.data.accessToken)).toBe(true);
      expect(AuthHelper.validateToken(loginResult.body.data.refreshToken)).toBe(true);
      expect(AuthHelper.isLoginSuccessful(loginResult)).toBe(true);
    });

    it('should fail login with invalid credentials', async () => {
      const loginResult = await AuthHelper.performLogin(app, {
        username: 'admin',
        password: 'wrongpassword'
      });

      expect(loginResult.status).toBe(200);
      expect(loginResult.body.code).toBe(AuthErrors.USR_PWD_ERROR.code);
      expect(loginResult.body.message).toBe(AuthErrors.USR_PWD_ERROR.error);
      expect(AuthHelper.isLoginSuccessful(loginResult)).toBe(false);
    });

    it('should fail login with non-existent user', async () => {
      // 测试用户不存在的情况，覆盖 auth.service.ts 第19行的逻辑
      const loginResult = await AuthHelper.performLogin(app, {
        username: 'non_existent_user_' + Date.now(),
        password: 'anypassword'
      });

      expect(loginResult.status).toBe(200);
      expect(loginResult.body.code).toBe(AuthErrors.USR_PWD_ERROR.code);
      expect(loginResult.body.message).toBe(AuthErrors.USR_PWD_ERROR.error);
      expect(AuthHelper.isLoginSuccessful(loginResult)).toBe(false);
    });

    it('should return captcha error when captcha validation fails', async () => {
      // Mock验证码校验失败以测试验证码错误分支
      const mockCheck = jest.spyOn(captchaService, 'check')
        .mockImplementation(() => Promise.resolve(false));

      // 临时设置为非unittest环境以启用验证码校验
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      try {
        const loginResult = await AuthHelper.performLogin(app, {
          captcha: 'wrong_captcha'
        });

        expect(loginResult.status).toBe(200);
        expect(loginResult.body.code).toBe(AuthErrors.CAPTCHA_ERROR.code);
        expect(loginResult.body.message).toBe(AuthErrors.CAPTCHA_ERROR.error);
        expect(AuthHelper.isLoginSuccessful(loginResult)).toBe(false);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
        mockCheck.mockRestore();
      }
    });

    it('should set longer token expiration when isRemember is true', async () => {
      const loginResult = await AuthHelper.performLogin(app, {
        isRemember: true
      });

      expect(loginResult.status).toBe(200);
      expect(loginResult.body.code).toBe(0);

      const tokenInfo = AuthHelper.extractTokenInfo(loginResult);

      // 记住登录状态下，refreshTokenExp 应该比 tokenExp 长很多（至少一天）
      expect(tokenInfo.refreshTokenExp - tokenInfo.tokenExp).toBeGreaterThan(3600 * 24);
    });

    it('should set normal token expiration when isRemember is false', async () => {
      const loginResult = await AuthHelper.performLogin(app, {
        isRemember: false
      });

      expect(loginResult.status).toBe(200);
      expect(loginResult.body.code).toBe(0);

      const tokenInfo = AuthHelper.extractTokenInfo(loginResult);

      // 不记住登录状态下，refreshTokenExp 应该比 tokenExp 长，但不会太长（小于一周）
      expect(tokenInfo.refreshTokenExp - tokenInfo.tokenExp).toBeLessThan(3600 * 24 * 7);
    });
  });

  /**
   * Token 管理测试
   * 整合自 role/auth.test.ts 的 token 刷新相关测试
   */
  describe('Token Management', () => {
    it('should successfully refresh token with valid refreshToken', async () => {
      // 首先登录获取 refreshToken
      const loginResult = await AuthHelper.performLogin(app);
      const tokenInfo = AuthHelper.extractTokenInfo(loginResult);

      // 使用 refreshToken 请求新的 accessToken
      const refreshResult = await AuthHelper.refreshToken(app, tokenInfo.refreshToken);

      expect(refreshResult.status).toBe(200);
      expect(refreshResult.body.code).toBe(0);
      expect(refreshResult.body.data).toHaveProperty('accessToken');
      expect(refreshResult.body.data).toHaveProperty('tokenExp');

      // 验证返回的 accessToken 是有效的 JWT 格式
      expect(AuthHelper.validateToken(refreshResult.body.data.accessToken)).toBe(true);

      // 验证 tokenExp 是未来的时间戳
      expect(refreshResult.body.data.tokenExp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should handle expired refresh token', async () => {
      // 创建一个过期的 token
      const user = await userService.safeUserById(1);
      const expiredToken = await jwtService.sign(
        { id: user.id, passwordVersion: user.passwordVersion },
        { expiresIn: -3600 } // 负数表示过期
      );

      const refreshResult = await AuthHelper.refreshToken(app, expiredToken);

      expect(refreshResult.status).toBe(200);
      expect(refreshResult.body.code).not.toBe(0);
      expect(refreshResult.body.message).toBe('TOKEN_EXPIRED');
    });

    it('should handle password version mismatch', async () => {
      const user = await userService.safeUserById(1);

      // 创建一个密码版本不匹配的 token
      const invalidVersionToken = await jwtService.sign(
        { id: user.id, passwordVersion: user.passwordVersion + 999 },
        { expiresIn: 3600 }
      );

      const refreshResult = await AuthHelper.refreshToken(app, invalidVersionToken);

      expect(refreshResult.status).toBe(200);
      expect(refreshResult.body.code).not.toBe(0);
      expect(refreshResult.body.message).toBe('TOKEN_PASSWORD_VERSION_ERROR');
    });

    it('should handle invalid refresh token', async () => {
      const refreshResult = await AuthHelper.refreshToken(app, 'invalid_token');

      expect(refreshResult.status).toBe(200);
      expect(refreshResult.body.code).not.toBe(0);
      expect(refreshResult.body.message).toBe('TOKEN_ERROR');
    });

    it('should handle null or empty refresh token', async () => {
      const refreshResult = await AuthHelper.refreshToken(app, '');

      expect(refreshResult.status).toBe(200);
      expect(refreshResult.body.code).not.toBe(0);
      expect(refreshResult.body.message).toBe('TOKEN_NULL');
    });
  });

  /**
   * 验证码管理测试
   * 整合验证码相关的测试用例
   */
  describe('Captcha Management', () => {
    it('should generate captcha successfully', async () => {
      const captchaResult = await AuthHelper.getCaptcha(app);

      expect(captchaResult.status).toBe(200);
      expect(captchaResult.body.code).toBe(0);
      expect(captchaResult.body.data).toHaveProperty('id');
      expect(captchaResult.body.data).toHaveProperty('imageBase64');

      // 验证验证码ID格式
      expect(typeof captchaResult.body.data.id).toBe('string');
      expect(captchaResult.body.data.id.length).toBeGreaterThan(0);
    });

    it('should validate captcha correctly in unittest environment', async () => {
      // 在unittest环境下，验证码校验应该被自动绕过
      const loginResult = await AuthHelper.performLogin(app, {
        captcha: 'any_value' // 在unittest环境下应该被忽略
      });

      expect(loginResult.status).toBe(200);
      expect(loginResult.body.code).toBe(0);
      expect(AuthHelper.isLoginSuccessful(loginResult)).toBe(true);
    });
  });

  /**
   * 菜单权限测试
   * 整合自 role/auth.test.ts 的菜单访问权限测试
   */
  describe('Menu Permission', () => {
    let adminToken: string;

    beforeEach(async () => {
      adminToken = await AuthHelper.getAdminToken(app);
    });

    it('should return true for valid menu path with code', async () => {
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);
      const result = await client.get('/auth/menu', { query: { path: '/system/user' } });

      expect(result.status).toBe(200);
      expect(result.body.code).toBe(0);
      expect(result.body.data).toBe(true);
    });

    it('should return true for non-existent menu path', async () => {
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);
      const result = await client.get('/auth/menu', { query: { path: '/non-existent-path' } });

      expect(result.status).toBe(200);
      expect(result.body.code).toBe(0);
      expect(result.body.data).toBe(true); // 根据实现，不存在的路径返回 true
    });

    it('should return true for menu path without code', async () => {
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);
      const result = await client.get('/auth/menu', { query: { path: '/dashboard' } });

      expect(result.status).toBe(200);
      expect(result.body.code).toBe(0);
      expect(result.body.data).toBe(true);
    });

    it('should handle menu access with invalid token', async () => {
      const client = HttpHelper.createAuthenticatedClient(app, 'invalid_token');
      const result = await client.get('/auth/menu', { query: { path: '/system/user' } });

      expect(result.status).toBe(401);
    });

    it('should handle menu access without authentication', async () => {
      const client = HttpHelper.createAnonymousClient(app);
      const result = await client.get('/auth/menu', { query: { path: '/system/user' } });

      expect(result.status).toBe(401);
    });
  });

  /**
   * 登出功能测试
   */
  describe('Logout', () => {
    it('should logout successfully with valid token', async () => {
      const adminToken = await AuthHelper.getAdminToken(app);
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);
      const logoutResult = await client.post('/auth/logout');

      expect(logoutResult.status).toBe(200);
      expect(logoutResult.body.code).toBe(0);
    });

    it('should handle logout without token', async () => {
      const client = HttpHelper.createAnonymousClient(app);
      const logoutResult = await client.post('/auth/logout');

      // 登出端点可能不需要认证，或者返回成功状态
      expect([200, 401]).toContain(logoutResult.status);
      if (logoutResult.status === 200) {
        expect(logoutResult.body.code).toBe(0);
      }
    });
  });

  /**
   * 认证中间件测试
   * 验证需要认证的端点是否正确保护
   */
  describe('Authentication Middleware', () => {
    it('should protect endpoints requiring authentication', async () => {
      const client = HttpHelper.createAnonymousClient(app);

      // 测试需要认证的端点
      const protectedEndpoints = [
        '/system/user/page',
        '/system/role/page',
        '/system/resource/list',
        '/base/user/detail'
      ];

      for (const endpoint of protectedEndpoints) {
        const result = await client.get(endpoint);
        // 某些端点可能返回业务错误而不是401，这也是有效的保护
        if (result.status === 200) {
          // 如果返回200，应该是业务层的错误响应
          expect(result.body.code).not.toBe(0);
        } else {
          expect(result.status).toBe(401);
        }
      }
    });

    it('should allow access with valid token', async () => {
      const adminToken = await AuthHelper.getAdminToken(app);
      const client = HttpHelper.createAuthenticatedClient(app, adminToken);

      const result = await client.get('/system/resource/list');
      expect(result.status).toBe(200);
      expect(result.body.code).toBe(0);
    });

    it('should reject access with expired token', async () => {
      // 创建一个过期的 token
      const user = await userService.safeUserById(1);
      const expiredToken = await jwtService.sign(
        { id: user.id, passwordVersion: user.passwordVersion },
        { expiresIn: -3600 }
      );

      const client = HttpHelper.createAuthenticatedClient(app, expiredToken);
      const result = await client.get('/system/resource/list');

      expect(result.status).toBe(401);
    });
  });
});