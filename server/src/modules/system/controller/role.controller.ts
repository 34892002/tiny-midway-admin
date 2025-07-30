import { UseGuard, Post, Del, Put, Inject, Controller, Body, Param } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { JwtPassportMiddleware } from '../../../middleware/jwt.middleware';

import { RoleService } from '../service/role.service';
import { Access } from '../../../decorator/access';
import { CasbinGuard } from '../../../guard/casbin';

@UseGuard(CasbinGuard)
@Controller('/system/role', { middleware: [JwtPassportMiddleware] })
export class RoleController {
  @Inject()
  ctx: Context;
  @Inject()
  roleService: RoleService;

  // 查询角色列表
  @Access('RoleMgt')
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
    const data = await this.roleService.findAll(filteredWhere, {
      sort: JSON.parse(sort as string),
      page: Number(currentPage),
      limit: Number(pageSize),
    });
    return data;
  }
  // 修改角色
  @Access('RoleMgt')
  @Put('/:id')
  async updateRole(
    @Param('id') id: string,
    @Body() obj: any,
  ) {
    return this.roleService.updateOne(+id, obj);
  }
  // 添加角色
  @Access('RoleMgt')
  @Post('/')
  async addUser(@Body() dto: any) {
    return this.roleService.createOne(dto);
  }
  // 删除角色
  @Access('RoleMgt')
  @Del('/:id')
  async delPolicy(
    @Param('id') id: string,
  ) {
    return this.roleService.deleteById(+id);
  }
}
