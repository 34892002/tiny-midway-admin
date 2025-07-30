import { createApp, close, createHttpRequest } from '@midwayjs/mock';
import { Framework } from '@midwayjs/koa';

describe('test/base/api.template.test.ts', () => {

  it('should POST /auth/login with username "admin"', async () => {
    // create app
    const app = await createApp<Framework>();
    const http = createHttpRequest(app);
    // First get a captcha
    const captchaResult = await http.get('/auth/captcha');
    expect(captchaResult.status).toBe(200);
    expect(captchaResult.body.data).toHaveProperty('id');

    const captchaId = captchaResult.body.data.id;

    // Now try to login (using frontend-encrypted password)
    // web password hex 
    const crypto = require('crypto');
    const pwd = '123456';
    // web\src\config\config.default.js key 'mn-admin'
    const pwdKey = 'mn-admin';
    const hash = crypto.createHash('md5').update(pwd + pwdKey).digest('hex');
    const base64 = Buffer.from(hash, 'hex').toString('base64');
    const loginResult = await http.post('/auth/login')
      .send({
        username: 'admin',
        password: base64, // Frontend encrypted password for '123456'
        captchaId: captchaId,
        captcha: '0000', // Using a dummy value since we're in test mode
        isRemember: false
      });

    // Check if login was successful
    expect(loginResult.status).toBe(200);
    expect(loginResult.body.code).toBe(0); // 成功状态码
    expect(loginResult.body.message).toBe('OK');

    // Verify that we get the expected tokens
    expect(loginResult.body.data).toHaveProperty('accessToken');
    expect(loginResult.body.data).toHaveProperty('refreshToken');
    expect(loginResult.body.data).toHaveProperty('tokenExp');
    expect(loginResult.body.data).toHaveProperty('refreshTokenExp');
    
    // Verify token format (should be JWT)
    expect(loginResult.body.data.accessToken).toMatch(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
    expect(loginResult.body.data.refreshToken).toMatch(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);

    // close app
    await close(app);
  });
});
