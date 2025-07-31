import { Framework, Application } from '@midwayjs/koa';
import { createApp, close } from '@midwayjs/mock';
import { DictService } from '../../src/modules/data/service/dict.service';
import { Dict } from '@prisma/client';

// 集成测试

/**
 * 模块覆盖测试
 * 测试各种错误场景和边界情况
 */
describe('User Module Error Coverage Tests', () => {
  process.env.NODE_ENV = 'unittest';
  
  let app: Application;
  let dictService: DictService;
//   let adminToken: string;

  beforeAll(async () => {
    app = await createApp<Framework>();
    dictService = await app.getApplicationContext().getAsync(DictService);
  });

  afterAll(async () => {
    await close(app);
  });

  /**
   * 测试获取my数据
   */
  it('should return my detail successfully', async () => {
    const result = await dictService.my();
    expect(result).toHaveProperty('hello');
  });
  /**
   * 测试获取model数据
   */
  it('should return model detail successfully', async () => {
    const model = (dictService as any).model;
    const first = await model.findFirst() as Dict;
    expect(first.name).toEqual("性别");
  });
});