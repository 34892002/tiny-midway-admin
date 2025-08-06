import { Provide, Inject } from '@midwayjs/core';
import { PrismaClient } from '@prisma/client';
import { MidwayError } from '@midwayjs/core';
import { CasbinService } from '../../base/service/casbin.service';
import { UserDto } from '../dto/user';
import { Options } from '../../../core/crud_service';
import * as bcrypt from 'bcrypt';

import * as _ from 'lodash';

@Provide()
export class UserService {
  @Inject()
  prisma: PrismaClient;
  @Inject()
  casbinService: CasbinService;

  /**
   * 重新加载Casbin策略
   *
   * @returns 返回布尔值，表示是否成功重新加载策略
   */
  async reload() {
    await this.casbinService.enforcer.loadPolicy();
    return true;
  }
  async updateUserInfo(id: number, data: any) {
    const res = await this.prisma.user.update({
      where: {
        id,
      },
      data,
    });
    return _.omit(res, ['password']);
  }
  /**
   * 校验用户标识和角色标识的合法性
   *
   * @param name 用户标识
   * @param roles 角色标识列表
   * @returns 校验成功返回true，否则抛出错误
   * @throws MidwayError 当用户标识为空、角色标识列表为空、角色标识为空、角色标识不符合规则、角色标识重复、用户标识与角色标识重复、角色标识与权限标识重复时抛出错误
   */
  async checkNameAndRoles(name: string, roles: string[]) {
    if (!name) throw new MidwayError('用户标识不能为空', '5002');
    if (!roles?.length) throw new MidwayError('角色标识列表不能为空', '5002');
    if (!roles.every(item => item)) throw new MidwayError('角色标识不能为空', '5002');
    const regex = /^(?!^\d)[a-zA-Z0-9_]+$/;
    if (!roles.every(item => regex.test(item))) throw new MidwayError('角色标识不符合规则', '5002');
    if (roles.length !== new Set(roles).size) throw new MidwayError('角色标识不能重复', '5002');
    // 用户标识不能跟提交的角色标识重复
    if (roles.includes(name)) throw new MidwayError('用户标识不能跟角色标识重复', '5002');
    // 用户标识不能跟角色标识重复
    const _roleList = await this.casbinService.getAllRolesAndPlicysByDB('role');
    const roleList = _roleList.map(item => item.role);
    if (roleList.includes(name)) throw new MidwayError('用户标识不能跟角色标识重复', '5002');
    // 角色不能跟权限重复
    // 权限不能跟角色重复
    const _List = await this.casbinService.getAllRolesAndPlicysByDB('policy')
    const policyList = _List.map(item => item.policy)
    roles.forEach(item => {
      if (policyList.includes(item)) throw new MidwayError('角色标识不能跟权限标识重复', '5002');
    });
    return true;
  }
  public async findAll(where:any, options: Partial<Options>): Promise<{ records: any[]; total: number; currentPage: number; pageSize: number }> {
    const { select, include, sort = { id: 'desc' }, page = 1, limit = 20 } = options;
    const orderBy = typeof sort === 'string' ? JSON.parse(sort) : sort;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
    const [rows, count] = await Promise.all([
      this.prisma.user.findMany({ where, select, include, orderBy, skip, take } as any),
      this.prisma.user.count({ where }),
    ]);
    const roles = await this.casbinService.getAdminGroup();
    // 插入roles字段
    rows.forEach((item: any) => {
      //清理密码字段
      delete item.password;
      const curRole = roles.find(role => role.user === item.username);
      if (curRole?.roles) item.roles = curRole.roles
    });
    return { records: rows, total: count, currentPage: page, pageSize: limit };
  }

  /**
   * 更新用户信息
   * @param id 用户ID
   * @param _data 用户数据
   * @returns 更新结果
   */
  async updateOne(id: number, _data: UserDto) {
    // 不信任controller提交信息，直接查询数据库
    const registeredUser = await this.prisma.user.findUnique({ where: { id } });
    // 新建用户数据
    let create = _.omit(_data, ['roles']);
    // 更新用户数据，不能修改username，因为它在casbin表中作为权限code
    let update = _.omit(_data, ['username', 'roles']);
    // 角色列表
    let curRoles = _data.roles;
    // 操作用户名
    let targetUsername = ''
    
    if (registeredUser) {
      // 修改用户
      // 使用查询到的信息
      targetUsername = registeredUser.username;
      if (_data.password) {
        // 老用户修改密码，更新passwordVersion
        update.password = await bcrypt.hash(_data.password, 10);
        update.passwordVersion = registeredUser.passwordVersion + 1;
      }
      
    } else {
      // 新增用户
      // 使用参数提交的信息
      targetUsername = _data.username;
      create.password = await bcrypt.hash(_data.password, 10);
    }

    // 数据完整性校验
    await this.checkNameAndRoles(targetUsername, curRoles);
    
    try {
      await this.prisma.$transaction(async client => {
        await client.user.upsert({ where: { id }, update, create });
        // 同步该用户的所有角色
        await this.casbinService.syncAdminDBRulesIncremental('g', targetUsername, curRoles, '', client);
      });
    } catch (error) {
      throw error;
    } finally {
      await this.reload();
    }

    return true;
  }
  
  async deleteById(id: number) {
    await this.prisma.$transaction(async client => {
      const user = await client.user.findUnique({ where: { id }, select: { username: true, system: true } });
      if (user.system) throw new MidwayError('系统用户不能删除', '5002');
      await client.user.delete({ where: { id } });
      // 清空该用户的所有角色
      await this.casbinService.clearDBRulesByV0('g', user.username, client);
    });
    return await this.reload();
  }

  async safeUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    // 去掉密码
    const safe = _.omit(user, 'password');
    return safe;
  }

  async safeUserByName(username: string) {
    const user = await this.prisma.user.findFirst({
      where: { username },
    });
    // 去掉密码 
    const safe = _.omit(user, 'password');
    return safe;
  }

  /**
   * 获取用户的角色列表
   * @param username 用户名
   * @returns 返回用户的角色数组
   */
  async getUserRoles(username: string): Promise<string[]> {
    try {
      const roles = await this.casbinService.getAdminGroup(username);
      return roles || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 检查用户是否具有指定的角色
   * @param username 用户名
   * @param targetRoles 目标角色列表
   * @returns 返回布尔值，表示用户是否具有指定角色中的任意一个
   */
  async hasRoles(username: string, targetRoles: string[]): Promise<boolean> {
    try {
      // 参数校验
      if (!username || !targetRoles || targetRoles.length === 0) {
        return false;
      }

      // 获取用户的所有角色
      const userRoles = await this.getUserRoles(username);
      
      // 如果没有角色，返回false
      if (!userRoles || userRoles.length === 0) {
        return false;
      }
      
      // 检查是否包含指定角色中的任意一个（严格匹配，区分大小写）
      return userRoles.some(role => targetRoles.includes(role));
    } catch (error) {
      // 如果查询出错，为了安全起见返回false
      return false;
    }
  }

  /**
   * 检查用户是否具有管理员角色
   * @param username 用户名
   * @returns 返回布尔值，表示用户是否具有管理员权限
   */
  async hasAdminRole(username: string): Promise<boolean> {
    const roles = ['business_role'];
    return this.hasRoles(username, roles);
  }

  /**
   * 检查用户是否具有超级管理员角色
   * @param username 用户名
   * @returns 返回布尔值，表示用户是否具有超级管理员权限
   */
  async hasRootRole(username: string): Promise<boolean> {
    const roles = ['admin_role'];
    return this.hasRoles(username, roles);
  }
}
