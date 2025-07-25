import { createApp, close, createHttpRequest } from '@midwayjs/mock';
import { Framework } from '@midwayjs/koa';

describe('test/controller/home.test.ts', () => {

  it('should GET /', async () => {
    // create app
    const app = await createApp<Framework>();

    // make request
    const result = await createHttpRequest(app).get('/');

    // use expect by jest
    expect(result.status).toBe(200);
    const responseBody = JSON.parse(result.text);
    expect(responseBody.code).toBe(0);
    expect(responseBody.message).toBe('OK');
    expect(responseBody.data).toHaveProperty('msg', 'Hello, MidwayJS + Casbin + Prisma = ❤️');

    // close app
    await close(app);
  });

});
