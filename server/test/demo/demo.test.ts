import { Framework, Application } from '@midwayjs/koa';
import { createApp, close } from '@midwayjs/mock';
import { DemoService } from '../../src/modules/demo/service/demo.service';
import { Demo } from '@prisma/client';

// 集成测试

/**
 * 模块覆盖测试
 * 测试各种错误场景和边界情况
 */
describe('User Module Error Coverage Tests', () => {
  process.env.NODE_ENV = 'unittest';
  
  let app: Application;
  let demoService: DemoService;
//   let adminToken: string;

  beforeAll(async () => {
    app = await createApp<Framework>();
    demoService = await app.getApplicationContext().getAsync(DemoService);
  });

  afterAll(async () => {
    await close(app);
  });

  /**
   * 测试获取my数据
   */
  it('should return my detail successfully', async () => {
    const result = await demoService.my();
    expect(result).toHaveProperty('hello');
  });
  /**
   * 测试获取model数据
   */
  it('should return model detail successfully', async () => {
    const model = (demoService as any).model;
    const first = await model.findFirst() as Demo;
    expect(first.desc).toEqual("这是一个例子");
  });
});