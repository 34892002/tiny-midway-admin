import { UseGuard, Post, Del, Put, Inject, Controller, Body, Param } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { JwtPassportMiddleware } from '../../../middleware/jwt.middleware';
import { AdminErrorEnum, AdminBusinessError, SystemErrors, UserDataErrors, AuthErrors } from '../../../error/admin.error';

import { UserService } from '../service/user.service';
import { Access } from '../../../decorator/access';
import { CasbinGuard } from '../../../guard/casbin';

@UseGuard(CasbinGuard)
@Controller('/system/user', { middleware: [JwtPassportMiddleware] })
export class RoleController {
  @Inject()
  ctx: Context;
  @Inject()
  userService: UserService;

  // 查询列表
  @Access('UserMgt')
  @Post('/page')
  async page(@Body() query: any) {
    const { sort = JSON.stringify({ id: 'desc' }), currentPage = 1, pageSize = 20, ...where } = query;
    const filteredWhere = Object.entries(where).reduce((acc, [key, value]) => {
      // 过滤非法值
      const invalidValue = value === undefined || value === null || value === '';
      if (invalidValue) return acc;
      // 判断是否有模糊查询的字段
      if (typeof value === 'string' && value.endsWith('%')) {
        acc[key] = { contains: value.slice(0, -1) };
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});
    const data = await this.userService.findAll(filteredWhere, {
      sort: JSON.parse(sort as string),
      page: Number(currentPage),
      limit: Number(pageSize),
    });
    return data;
  }

  /**
   * 修改用户信息
   * @param id 用户ID
   * @param obj 用户更新数据
   * @returns 更新结果
   */
  @Access('UserMgt')
  @Put('/:id')
  async update(
    @Param('id') id: string,
    @Body() obj: any,
  ) {
    // 演示环境检查（环境保护规则）
    if (process.env.RUN_DEMO === 'true') {
      return SystemErrors.DEMO_ENVIRONMENT_RESTRICTION;
    }

    const userId = Number(id);
    // 获取当前登录用户信息
    const currentUser = this.ctx.state?.user;
    // 获取目标用户信息
    const targetUser = await this.userService.safeUserById(userId);
    if (!targetUser) {
      throw new AdminBusinessError(UserDataErrors.USER_NOT_FOUND);
    }
    
    // 业务规则检查：非系统用户不能修改系统用户
    if (targetUser.system && !currentUser.system) {
      return AuthErrors.PERMISSION_DENIED;
    }

    // 修改了自己的信息，通知前端，踢下线重新登录。
    if (currentUser.id === userId) {
      return AdminErrorEnum.TIMEOUT_USER_DATA;
    }

    return await this.userService.updateUser(userId, obj);
  }

  /**
   * 添加新用户
   * @param dto 用户创建数据
   * @returns 创建结果
   */
  @Access('UserMgt')
  @Post('/')
  async add(@Body() dto) {
    return this.userService.createUser(dto);
  }

  // 删除
  @Access('UserMgt')
  @Del('/:id')
  async del(
    @Param('id') id: string,
  ) {
    return this.userService.deleteById(+id);
  }
}
