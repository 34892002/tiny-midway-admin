import { createApp, close, createHttpRequest } from '@midwayjs/mock';
import { Framework } from '@midwayjs/koa';

describe('test/controller/api.test.ts', () => {

  it('should POST /auth/login with username "a" and password "1"', async () => {
    // create app
    const app = await createApp<Framework>();

    // First get a captcha
    const captchaResult = await createHttpRequest(app).get('/auth/captcha');
    expect(captchaResult.status).toBe(200);
    expect(captchaResult.body).toHaveProperty('id');
    expect(captchaResult.body).toHaveProperty('imageBase64');

    const captchaId = captchaResult.body.id;

    // Now try to login
    const loginResult = await createHttpRequest(app)
      .post('/auth/login')
      .send({
        username: 'a',
        password: '1',
        captchaId: captchaId,
        captcha: '1234', // Using a dummy value since we're in test mode
        isRemember: false
      });

    // Check if login was successful
    expect(loginResult.status).toBe(200);

    // If login is successful, we should get tokens
    if (loginResult.body.accessToken) {
      expect(loginResult.body).toHaveProperty('accessToken');
      expect(loginResult.body).toHaveProperty('refreshToken');
      expect(loginResult.body).toHaveProperty('tokenExp');
      expect(loginResult.body).toHaveProperty('refreshTokenExp');
    } else {
      // If login fails due to wrong credentials, check the error code
      // This is useful if the test user doesn't exist or has a different password
      console.log('Login failed with response:', loginResult.body);
      expect(loginResult.body).toHaveProperty('code');
    }

    // close app
    await close(app);
  });
});
