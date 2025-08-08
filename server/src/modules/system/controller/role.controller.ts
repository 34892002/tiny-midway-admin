import { UseGuard, Post, Del, Put, Inject, Controller, Body, Param } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { JwtPassportMiddleware } from '../../../middleware/jwt.middleware';

import { RoleService } from '../service/role.service';
import { Access } from '../../../decorator/access';
import { CasbinGuard } from '../../../guard/casbin';
import { RoleQueryDto, CreateRoleDto, UpdateRoleDto } from '../dto/role.dto';

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
  async page(@Body() query: RoleQueryDto) {
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
    }, {} as Record<string, any>);
    
    const parsedSort = typeof sort === 'string' ? JSON.parse(sort) : sort || { id: 'desc' };
    const data = await this.roleService.findAll(filteredWhere, {
      sort: parsedSort,
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
    @Body() obj: UpdateRoleDto,
  ) {
    return this.roleService.updateOne(+id, obj);
  }
  // 添加角色
  @Access('RoleMgt')
  @Post('/')
  async addUser(@Body() dto: CreateRoleDto) {
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
