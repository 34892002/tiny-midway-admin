import { UseGuard, Inject, Controller, Get, Post, Put, Del, Body, Param } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { ResourceService } from '../service/resource.service';
import { JwtPassportMiddleware } from '../../../middleware/jwt.middleware';
import { Access } from '../../../decorator/access';
import { CasbinGuard } from '../../../guard/casbin';
import { SystemErrors } from '../../../error/admin.error';

@UseGuard(CasbinGuard)
@Controller('/system/resource', { middleware: [JwtPassportMiddleware] })
export class ResourceController {
  @Inject()
  ctx: Context;
  @Inject()
  resourceService: ResourceService;


  @Access('ResourceMgt')
  @Get('/list')
  async getMenu() {
    // 获取所有菜单项
    return await this.resourceService.getMenuTree();
  }

  @Access('ResourceMgt')
  @Get('/routers')
  async getAllRouters() {
    // 获取所有路由
    return await this.resourceService.getAllRouters();
  }

  @Access('ResourceMgt')
  @Post('/')
  async createMenu(@Body() data: any) {
    // 没有order默认给0
    if (!data?.data) data.order = 0;
    const menus = await this.resourceService.createMenu(data);
    return menus;
  }

  @Access('ResourceMgt')
  @Put('/:id')
  async updateMenu(
    @Param('id') id: string,
    @Body() data: any
  ) {
    delete data.children;
    const menus = await this.resourceService.updateMenu(+id, data);
    return menus;
  }

  @Access('ResourceMgt')
  @Del('/:id')
  async deleteMenu(@Param('id') id: string) {
    if (process.env.RUN_DEMO === 'true') {
      return SystemErrors.DEMO_MENU_DELETE_FORBIDDEN
    }
    const menus = await this.resourceService.deleteMenu(+id);
    return menus;
  }
}
