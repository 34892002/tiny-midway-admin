import { Inject, Guard, IGuard, Config, getPropertyMetadata } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { CasbinService } from '../modules/base/service/casbin.service';
import { PrismaClient } from '@prisma/client';
import { ACCESS_META_KEY } from '../decorator/access';

@Guard()
export class CasbinGuard implements IGuard<Context> {
  @Config('casbin')
  casbinConfig;

  @Inject()
  casbinService: CasbinService;
  @Inject('prisma')
  prismaClient: PrismaClient;

  /**
   * 权限检查方法
   * @param ctx 上下文对象
   * @param supplierClz 控制器类
   * @param methodName 方法名
   * @returns 是否有权限
   */
  async canActivate(
    ctx: Context, supplierClz, methodName: string
  ): Promise<boolean> {
    const act = 'access';
    const code = getPropertyMetadata<string>(ACCESS_META_KEY, supplierClz, methodName);
    const currentUser = ctx.state?.user;
    const username = currentUser?.username;
    
    // 未登录用户使用guest权限
    const subject = username ? username : 'guest';
    
    // 基础权限检查
    const hasBasicPermission = await this.casbinService.enforcer.enforce(
      subject, // 用户名或guest
      code, // 权限代码
      act, // 操作
    );
    
    // 如果没有基础权限，直接拒绝
    if (!hasBasicPermission) {
      return false;
    }
    
    return true;
  }
}
