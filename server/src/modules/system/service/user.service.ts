import { Provide, Inject } from '@midwayjs/core';
import { PrismaClient } from '@prisma/client';
import { MidwayError } from '@midwayjs/core';
import { CasbinService } from '../../base/service/casbin.service';
import { UserDto } from '../dto/user';
import { AdminErrorEnum } from '../../../error/admin.error';
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
  async updateOne(id: number, _data: UserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    const updatePwd = user && _data.password;
    if (user) {
      // 修改用户信息不会上传 passwordVersion
      // 系统内置账号不能修改系统属性
      if (_data.system !== user.system) throw new MidwayError('用户不能修改系统属性', '5002');
      if (user.system) {
        // 系统内置账号不能修改角色属性
        const roles = await this.casbinService.getAdminGroup(user.username);
        const isEqual = _.isEqual(_data.roles, roles);
        if (!isEqual) throw new MidwayError('系统用户不能修改角色', '5002');
      }
      // 如果修改密码才有值，否则取旧密码
      if (updatePwd) {
        _data.password = await bcrypt.hash(_data.password, 10);
        _data.passwordVersion = user.passwordVersion + 1;
      } else {
        _data.password = user.password;
      }
    } else {
      // 新增用户
      _data.password = await bcrypt.hash(_data.password, 10);
    }
    const curRoles = _data.roles;
    const create = _.omit(_data, ['roles']);
    // 不能修改username，因为它在casbin表中作为权限code
    const update = _.omit(_data, ['username', 'roles']);
    const name = _data.username;
    await this.checkNameAndRoles(name, curRoles);
    try {
      await this.prisma.$transaction(async client => {
        await client.user.upsert({ where: { id }, update, create });
        // 同步该用户的所有角色
        await this.casbinService.syncAdminDBRulesIncremental('g', name, curRoles, '', client);
      });
    } catch (error) {
      throw error;
    } finally {
      await this.reload();
    }

    if (updatePwd) {
      // 修改了密码，踢下线，重新登录
      return AdminErrorEnum.TIMEOUT_USER_DATA;
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
}
