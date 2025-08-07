import { Catch, MidwayHttpError } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { AdminBusinessError } from '../error/admin.error';

@Catch()
export class DefaultErrorFilter {
  async catch(err: any, ctx: Context) {
    // 记录系统错误日志
    ctx.logger.error('System Error:', err, {
      path: ctx.path,
      method: ctx.method,
      userAgent: ctx.get('user-agent'),
      ip: ctx.ip,
      stack: err.stack
    });

    // 处理 Midway HTTP 错误
    if (err instanceof MidwayHttpError) {
      const httpStatus = err.status || 500;
      
      // 对于特定的 HTTP 状态码，直接设置响应状态
      const directStatusCodes = [401, 403, 500];
      if (directStatusCodes.includes(httpStatus)) {
        ctx.status = httpStatus;
        return { 
          message: err.message,
          status: httpStatus
        };
      }
    }

    // 处理 AdminBusinessError
    if (err instanceof AdminBusinessError) {
      return {
        code: err.businessCode,
        error: 'Business Error',
        message: err.businessMessage,
        status: 200
      };
    }

    // 处理其他类型的错误
    const status = err.status || err.code || 500;
    const message = err.message || 'Internal Server Error';

    // 对于未分类的错误，返回统一格式
    return { 
      code: 9999, 
      error: 'System Error', 
      message: message,
      status: +status
    };
  }
}
