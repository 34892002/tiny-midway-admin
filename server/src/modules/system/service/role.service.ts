import { Provide, Inject } from '@midwayjs/core';
import { PrismaClient } from '@prisma/client';
import { MidwayError } from '@midwayjs/core';
import { CasbinService } from '../../base/service/casbin.service';
import { Options } from '../../../core/crud_service';

// type GetListTypeString = 'role' | 'policy';
import * as _ from 'lodash';

@Provide()
export class RoleService {
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
  async checkCodeAndPolicys(code: string, policys: any[]) {
    if (!code) throw new MidwayError('角色标识不能为空', '5002');
    // 检查policys是否为空,成员是否为空
    if (!policys?.length) throw new MidwayError('权限标识列表不能为空', '5002');
    if (!policys.every(item => item)) throw new MidwayError('权限标识不能为空', '5002');
    // 不能以数字开头，只能包含大小写英文字母、数字和下划线
    const regex = /^(?!^\d)[a-zA-Z0-9_\:]+$/;
    policys.forEach(item => {
      if (!regex.test(item)) throw new MidwayError(`权限标识 ${item} 不符合规则`, '5002');
    });
    // 权限重复检查
    if (policys.length !== new Set(policys).size) throw new MidwayError('权限标识不能重复', '5002');
    // 权限不能跟角色重复
    const _List = await this.casbinService.getAllRolesAndPlicysByDB('role')
    const roleList = _List.map(item => item.role)
    const nameList = _List.map(item => item.name)
    policys.forEach(item => {
      if (nameList.includes(item)) throw new MidwayError('权限标识不能跟用户标识重复', '5002');
      if (roleList.includes(item)) throw new MidwayError('权限标识不能跟角色标识重复', '5002');
    });
  }

  public async findAll(where:any, options: Partial<Options>): Promise<{ records: any[]; total: number; currentPage: number; pageSize: number }> {
    const { select, include, sort = { id: 'desc' }, page = 1, limit = 20 } = options;
    const orderBy = typeof sort === 'string' ? JSON.parse(sort) : sort;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
    const [rows, count] = await Promise.all([
      this.prisma.role.findMany({ where, select, include, orderBy, skip, take } as any),
      this.prisma.role.count({ where }),
    ]);
    const policys = await this.casbinService.getAdminPlocy();
    // 插入policys字段
    rows.forEach(item => {
      const curPolicy = policys.find(policy => policy.role === item.code);
      if (curPolicy?.codes) item['policys'] = curPolicy.codes
    });
    return { records: rows, total: count, currentPage: page, pageSize: limit };
  }
  
  async createOne(_data: any) {
    const curPolicys = _data.policys;
    const code = _data.code;
    await this.checkCodeAndPolicys(code, curPolicys);
    const create = _.pick(_data, ['name', 'code']);
    try {
      await this.prisma.$transaction(async client => {
        await client.role.create({ data: create });
        // 同步该角色的所有权限
        await this.casbinService.syncAdminDBRulesIncremental('p', code, curPolicys, 'access', client);
      });
    } catch (error) {
      throw error;
    } finally {
      await this.reload();
    }

    return true;
  }

  async updateOne(id: number, _data: any) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new MidwayError('角色不存在', '5002');
    }
    // 系统内置账号不能修改系统属性
    if (_data.system !== role.system) throw new MidwayError('用户不能修改系统属性', '5002');
    
    const curPolicys = _data.policys;
    const code = role.code; // 使用现有的code，不允许修改
    await this.checkCodeAndPolicys(code, curPolicys);
    
    // code唯一且不会被修改，所以update中排除code
    const update = _.omit(_data, ['code', 'policys']);
    try {
      await this.prisma.$transaction(async client => {
        await client.role.update({ where: { id }, data: update });
        // 同步该角色的所有权限
        await this.casbinService.syncAdminDBRulesIncremental('p', code, curPolicys, 'access', client);
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
      const user = await client.role.findUnique({ where: { id }, select: { system: true } });
      if (user.system) throw new MidwayError('系统角色不能删除', '5002');
      const role = await client.role.delete({ where: { id } });
      const roleName = role.code;
      // 清空该角色的所有权限
      await this.casbinService.clearDBRulesByV0('p', roleName, client);
      // 删除所有用户关联的该角色
      await this.casbinService.clearDBRulesByV1('g', roleName, client);
    });
    return await this.reload();
  }
}
