import { Framework, Application } from '@midwayjs/koa';
import { createApp, close } from '@midwayjs/mock';
import { NotFoundFilter } from '../../src/filter/notfound.filter';
import { httpError } from '@midwayjs/core';

describe('NotFoundFilter Tests', () => {
  let app: Application;
  let filter: NotFoundFilter;

  beforeAll(async () => {
    app = await createApp<Framework>();
    filter = new NotFoundFilter();
  });

  afterAll(async () => {
    await close(app);
  });

  it('should handle NotFoundError correctly', async () => {
    // 创建一个 NotFoundError 实例
    const notFoundError = new httpError.NotFoundError('Page not found');
    
    // 模拟 Context 对象
    const mockContext = {
      status: 404,
      body: null
    } as any;

    // 调用 catch 方法
    const result = await filter.catch(notFoundError, mockContext);

    // 验证返回结果
    expect(result).toEqual({
      error: 'Not Found',
      message: 'Page not found'
    });
  });

  it('should handle NotFoundError with different message', async () => {
    const customMessage = 'Custom not found message';
    const notFoundError = new httpError.NotFoundError(customMessage);
    
    const mockContext = {
      status: 404,
      body: null
    } as any;

    const result = await filter.catch(notFoundError, mockContext);

    expect(result).toEqual({
      error: 'Not Found',
      message: customMessage
    });
  });

  it('should handle NotFoundError with empty message', async () => {
    const notFoundError = new httpError.NotFoundError('');
    
    const mockContext = {
      status: 404,
      body: null
    } as any;

    const result = await filter.catch(notFoundError, mockContext);

    expect(result).toEqual({
      error: 'Not Found',
      message: notFoundError.message // 使用实际的错误消息
    });
  });

  it('should handle MidwayHttpError parameter types', async () => {
    // 测试 MidwayHttpError 类型的参数处理
    const mockError = {
      message: 'Test error message',
      status: 404,
      name: 'NotFoundError'
    } as any;
    
    const mockContext = {
      status: 404,
      body: null
    } as any;

    const result = await filter.catch(mockError, mockContext);

    expect(result).toEqual({
      error: 'Not Found',
      message: 'Test error message'
    });
  });

  it('should handle undefined message', async () => {
    const mockError = {
      message: undefined,
      status: 404,
      name: 'NotFoundError'
    } as any;
    
    const mockContext = {
      status: 404,
      body: null
    } as any;

    const result = await filter.catch(mockError, mockContext);

    expect(result).toEqual({
      error: 'Not Found',
      message: undefined
    });
  });
});