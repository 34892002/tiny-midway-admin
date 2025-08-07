import { Provide, Inject } from '@midwayjs/core';
import { PrismaClient, Resource } from '@prisma/client';
import { CasbinService } from '../../base/service/casbin.service';
import { AdminBusinessError, SystemErrors } from '../../../error/admin.error';

@Provide()
export class ResourceService {
  @Inject()
  prisma: PrismaClient;
  @Inject()
  casbinService: CasbinService;

  async getAllRouters() {
    return this.prisma.resource.findMany({
      orderBy: {
        order: 'asc',
      },
    });
  }

  async getMenuTree() {
    // 获取所有菜单项
    const menus = await this.prisma.resource.findMany({
      orderBy: {
        order: 'asc',
      },
    });

    // 构建树形结构
    const menuMap = new Map<number, Resource>();
    const rootMenus: Resource[] = [];

    // 将所有菜单项添加到 menuMap 中
    menus.forEach(menu => {
      const menuWithChildren: any = { ...menu, children: [] };
      menuMap.set(menu.id, menuWithChildren);
    });

    // 递归构建树形结构
    const buildTree = (menu: any) => {
      const children = menus.filter(m => m.parentId === menu.id);
      children.forEach(child => {
        const childMenu = menuMap.get(child.id)!;
        menu.children.push(childMenu);
        buildTree(childMenu);
      });
    };

    // 处理根菜单项
    menus.forEach(menu => {
      if (menu.parentId === null) {
        const rootMenu = menuMap.get(menu.id)!;
        rootMenus.push(rootMenu);
        buildTree(rootMenu);
      }
    });

    return rootMenus;
  }

  async createMenu(data: any) {
    try {
      const res = await this.prisma.resource.create({
        data,
      });
      return res;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new Error(`编码 ${data.code} 已经存在，请重新输入！`);
      }
      throw error;
    }
  }

  async updateMenu(id: number, data: any) {
    // 取原来的资源数据
    const oldResource = await this.prisma.resource.findUnique({
      where: { id },
    });
    // 是否修改权限
    const changePermission = ('code' in data && oldResource.code !== data.code) || ('enable' in data && oldResource.enable && !data.enable)
    // 修改code
    if (changePermission) {
      // 使用事务处理
      const item = await this.prisma.$transaction(async client => {
        // 清空旧的权限编码，让用户重新绑定权限
        await client.casbinRule.deleteMany({
          where: { ptype: 'p', v1: oldResource.code }
        });
        // 更新菜单
        return await client.resource.update({
          where: { id },
          data,
        });
      });
      // 更新casbin缓存
      await this.casbinService.enforcer.loadPolicy();
      return item;
    } else {
      return this.prisma.resource.update({
        where: { id },
        data,
      });
    }
  }

  async deleteMenu(id: number) {
    // 判断是否有子菜单
    const count = await this.prisma.resource.count({
      where: { parentId: id },
    });
    // 如果有子菜单，则不能删除
    if (count) {
      throw new AdminBusinessError(SystemErrors.MENU_HAS_CHILDREN);
    }
    // 删除权限
    const resource = await this.prisma.resource.findUnique({
      where: { id },
    });
    // 使用事务处理
    await this.prisma.$transaction(async client => {
      await client.casbinRule.deleteMany({
        where: { ptype: 'p', v1: resource.code }
      });
      await client.resource.delete({
        where: { id }
      });
    });
    // 更新casbin缓存
    await this.casbinService.enforcer.loadPolicy();
    return true;
  }
}
