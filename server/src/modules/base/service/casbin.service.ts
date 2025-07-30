import { Provide, Scope, ScopeEnum, Config, Init, Inject } from '@midwayjs/core';
import { PrismaAdapter } from 'casbin-prisma-adapter';
import * as casbin from 'casbin';
import { PrismaClient } from '@prisma/client';

type GetListTypeString = 'role' | 'policy';

export interface IncrementalUpdateResult {
  added: number;
  removed: number;
  unchanged: number;
}

export enum RuleAction {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum RulePossession {
  ANY = 'any',
  OWN = 'own',
  'ANY|OWN' = 'any|own',
}

export enum RuleResource {
  PROJECT_DATA = 'project_obj',
  SHCEMA_DATA = 'shcema_obj',
  USER_DATA = 'user_obj',
  COMMON_DATA = 'common_obj',
}

/**
 * casbin权限校验参数，
 * @isEnabled 是否启用，默认true，fasle则不校验或者使用自定义校验
 * @resource 操作资源(obj)
 * @action 操作(ation)
 * @possession 所有权标识，own表示只能操作自己的 obj
 * @isOwn 只有包含own时才回调，返回false则是无权限
 * @description  sub 取自 ctx，配置项在 userRolesContext
 */
export type RuleOptions = {
  isEnabled: boolean;
  resource: RuleResource;
  action: RuleAction;
  possession: RulePossession;
  isOwn: ((ctx: any) => boolean) | ((ctx: any) => Promise<boolean>);
};

// 单例模式
@Provide()
@Scope(ScopeEnum.Singleton)
export class CasbinService {
  @Inject('prisma')
  prismaClient: PrismaClient;

  @Config('casbin')
  casbinCfg;

  // TODO: 调用一次savePolicy，数据库的策略表会全部删除再插入一遍，真的难绷，少用慎用。
  enforcer: casbin.Enforcer;

  @Init()
  async init() {
    // 使用远程数据库的策略
    const policyAdapter = await PrismaAdapter.newAdapter();
    this.enforcer = await casbin.newEnforcer(this.casbinCfg.modelPath, policyAdapter);

    /***  ===== demo ===== */
    // Check the permission.
    // this.enforcer.enforce('alice', 'data1', 'read');
    // Modify the policy.
    // await e.addPolicy(...);
    // await e.removePolicy(...);
    // Save the policy back to DB.
    // await this.enforcer.savePolicy();

    // return this.enforcer;
  }

  /**
   * 根据数据库获取所有角色或策略
   *
   * @param type 类型，'role' 表示获取角色，'policy' 表示获取策略
   * @returns 返回根据类型对应的角色或策略列表
   */
  async getAllRolesAndPlicysByDB(type: GetListTypeString) {
    const ptype = type === 'role' ? 'g' : 'p';
    const data = await this.prismaClient.casbinRule.findMany({
      where: { ptype },
      select: {
        v0: true,
        v1: true,
      },
    });
    if (type === 'role') {
      return data.map(item => ({ name: item.v0, role: item.v1 }));
    } else {
      return data.map(item => ({ role: item.v0, policy: item.v1 }));
    }
  }

  // 校验权限
  async checkAccess(sub: string, obj: string) {
    return this.enforcer.enforce(sub, obj, 'access');
  }

  async getAdminPlocy(name: string = '') {
    const act = 'access'
    const plist = await this.enforcer.getPolicy();
    const accessList = plist.filter(arr => arr[2] === act);
    const result = [];
    accessList.forEach(item => {
      const [role, code] = item;
      const cur = result.find(item => item.role === role)
      if (cur) {
        cur.codes.push(code);
      } else {
        result.push({ role, codes: [code] });
      }
    });
    if (name) {
      const found = result.find(item => item.role === name);
      return found ? found.codes : undefined;
    }
    return result;
  }

  async getAdminGroup(name: string = '') {
    const glist = await this.enforcer.getGroupingPolicy();
    const result = [];
    glist.forEach(item => {
      const [user, role] = item;
      const cur = result.find(item => item.user === user)
      if (cur) {
        cur.roles.push(role);
      } else {
        result.push({ user, roles: [role] });
      }
    });
    if (name) {
      const found = result.find(item => item.user === name);
      return found ? found.roles : undefined;
    }
    return result;
  }

  async addAdminPolices(role: string, codes: string[], save: boolean = true) {
    if (!role) return Promise.reject('角色不能为空');
    if (!codes.length) return true;
    const act = 'access'
    // 转换为 casbin 需要的格式
    const policys = codes.map(code => [role, code, act]);
    const res = await this.enforcer.addPolicies(policys);
    if (save && res) {
      await this.enforcer.savePolicy();
    }
    return res;
  }

  async addAdminRole(username: string, roles: string[], save: boolean = true) {
    if (!username) return Promise.reject('用户名不能为空');
    if (!roles.length) return true;
    // 转换为 casbin 需要的格式
    const policys = roles.map(role => [username, role]);
    const res = await this.enforcer.addGroupingPolicies(policys);
    if (save && res) {
      await this.enforcer.savePolicy();
    }
    return;
  }

  async removeAdminRole(username: string, roles: string[], save: boolean = true) {
    if (!username) return Promise.reject('用户名不能为空');
    if (!roles.length) return true;
    // 转换为 casbin 需要的格式
    const policys = roles.map(role => [username, role]);
    const res = await this.enforcer.removeGroupingPolicies(policys);
    if (save && res) {
      await this.enforcer.savePolicy();
    }
    return;
  }

  async removeAdminPolicy(role: string, codes: string[], save: boolean = true) {
    if (!role) return Promise.reject('角色不能为空');
    if (!codes.length) return true;
    const act = 'access'
    // 转换为 casbin 需要的格式
    const policys = codes.map(code => [role, code, act]);
    const res = await this.enforcer.removePolicies(policys);
    if (save && res) {
      await this.enforcer.savePolicy();
    }
    return;
  }

  async diffAdminRole(username: string, roles: string[]) {
    // 获取该用户所有的角色
    const userRoles = await this.getAdminGroup();
    const curRoles = userRoles.find(item => item.user === username)?.roles || [];
    // 获取需要增加和删除的角色
    const addRoles = roles.filter(item => !curRoles.includes(item));
    const removeRoles = curRoles.filter(item => !roles.includes(item));
    return { addRoles, removeRoles };
  }

  async diffAdminPolicy(role: string, codes: string[]) {
    // 获取该角色所有的权限
    const rolePolicys = await this.getAdminPlocy();
    const curCodes = rolePolicys.find(item => item.role === role)?.codes || [];
    // 获取需要增加和删除的权限
    const addCodes = codes.filter(item => !curCodes.includes(item));
    const removeCodes = curCodes.filter(item => !codes.includes(item));
    return { addCodes, removeCodes };
  }

  async syncAdminRoleAndSave(username: string, roles: string[], save: boolean = true) {
    const { addRoles, removeRoles } = await this.diffAdminRole(username, roles);
    // 如果要操作的list全部为空则直接返回true
    if (!addRoles.length && !removeRoles.length) return true;
    // 不马上保存到数据库，等操作完成之后调用 savePolicy 保存
    await this.removeAdminRole(username, removeRoles, false);
    await this.addAdminRole(username, addRoles, false);
    return save ? await this.enforcer.savePolicy() : false;
  }

  async syncAdminPolicyAndSave(role: string, codes: string[], save: boolean = true) {
    const { addCodes, removeCodes } = await this.diffAdminPolicy(role, codes);
    // 如果要操作的list全部为空则直接返回true
    if (!addCodes.length && !removeCodes.length) return true;
    // 不马上保存到数据库，等操作完成之后调用 savePolicy 保存
    await this.removeAdminPolicy(role, removeCodes, false);
    await this.addAdminPolices(role, addCodes, false);
    return save ? await this.enforcer.savePolicy() : false;
  }

  async syncAdminLoadAndSave(username: string, roles: string[], role: string, codes: string[]) {
    // 从数据库载入最新的策略
    await this.enforcer.loadPolicy();
    // 同步角色和权限
    const save1 = await this.syncAdminRoleAndSave(username, roles, false);
    const save2 = await this.syncAdminPolicyAndSave(role, codes, false);
    if (save1 && save2) {
      return true;
    } else {
      return await this.enforcer.savePolicy();
    }
  }



  async clearDBRulesByV0(
    ptype: string,
    v0: string,
    client: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"> = this.prismaClient,
  ) {
    if (!v0) return Promise.reject('name标识不能为空');
    await client.casbinRule.deleteMany({
      where: {
        ptype,
        v0,
      },
    });
  }


  async clearDBRulesByV1(
    ptype: string,
    v1: string,
    client: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"> = this.prismaClient,
  ) {
    // 如果code为空，则会清空所有用户，所以需要限制，code为空就报错
    // 假设 role-a = [read,write] role-b = [read,write]
    // 删除 delete p,read
    // 则 role-a = [read] role-b = [write]
    // if (!code) throw new MidwayError('权限标识不能为空', '5002');
    if (!v1) return Promise.reject('code标识不能为空');
    await client.casbinRule.deleteMany({
      where: {
        ptype,
        v1,
      },
    });
  }

  /**
   * 批量删除权限规则
   * 
   * @param ptype 权限类型 ('p' 表示策略, 'g' 表示角色)
   * @param v0 主体标识 (用户名或角色名)
   * @param v1List 要删除的权限列表
   * @param client Prisma客户端实例
   * @returns 返回删除的记录数量
   */
  private async batchRemoveRules(
    ptype: string,
    v0: string,
    v1List: string[],
    client: any
  ): Promise<number> {
    if (!v1List.length) return 0;

    try {
      const deleteResult = await client.casbinRule.deleteMany({
        where: {
          ptype,
          v0,
          v1: { in: v1List }
        }
      });

      return deleteResult.count;
    } catch (error) {
      throw new Error(`批量删除权限规则失败: ${error.message}`);
    }
  }

  /**
   * 批量添加权限规则
   * 
   * @param ptype 权限类型 ('p' 表示策略, 'g' 表示角色)
   * @param v0 主体标识 (用户名或角色名)
   * @param v1List 要添加的权限列表
   * @param v2 权限操作类型 (如 'access')
   * @param client Prisma客户端实例
   * @returns 返回添加的记录数量
   */
  private async batchAddRules(
    ptype: string,
    v0: string,
    v1List: string[],
    v2: string,
    client: any
  ): Promise<number> {
    if (!v1List.length) return 0;

    try {
      const createData = v1List.map(v1 => {
        const data: any = { ptype, v0, v1 };
        if (v2) data.v2 = v2;
        return data;
      });

      const createResult = await client.casbinRule.createMany({
        data: createData
      });

      return createResult.count;
    } catch (error) {
      throw new Error(`批量添加权限规则失败: ${error.message}`);
    }
  }

  /**
   * 增量更新权限规则 - 只添加和删除必要的权限记录
   * 
   * @param ptype 权限类型 ('p' 表示策略, 'g' 表示角色)
   * @param v0 主体标识 (用户名或角色名)
   * @param newV1List 新的权限列表
   * @param v2 权限操作类型 (如 'access')
   * @param client Prisma客户端实例
   * @returns 返回操作结果统计
   */
  async syncAdminDBRulesIncremental(
    ptype: string,
    v0: string,
    newV1List: string[],
    v2: string = '',
    client: any = this.prismaClient,
  ): Promise<IncrementalUpdateResult> {
    try {
      // 参数验证
      this.validateIncrementalUpdateParams(ptype, v0, newV1List, client);

      // 检查是否已经在事务中（事务客户端没有$transaction方法）
      const isInTransaction = !client.$transaction;

      if (isInTransaction) {
        // 已经在事务中，直接使用传入的客户端
        return await this.executeIncrementalUpdate(ptype, v0, newV1List, v2, client);
      } else {
        // 不在事务中，创建新事务
        return await client.$transaction(async (tx) => {
          return await this.executeIncrementalUpdate(ptype, v0, newV1List, v2, tx);
        });
      }
    } catch (error) {
      throw new Error(`增量更新权限规则失败: ${error.message}`);
    }
  }

  private async executeIncrementalUpdate(
    ptype: string,
    v0: string,
    newV1List: string[],
    v2: string,
    tx: any
  ): Promise<IncrementalUpdateResult> {
    try {
      // 1. 获取现有权限规则
      const existingRules = await tx.casbinRule.findMany({
        where: { ptype, v0 },
        select: { v1: true }
      });
      const existingV1List = existingRules.map(rule => rule.v1);

      // 2. 计算权限差异
      const toAdd = newV1List.filter(v1 => !existingV1List.includes(v1));
      const toRemove = existingV1List.filter(v1 => !newV1List.includes(v1));
      const unchanged = existingV1List.filter(v1 => newV1List.includes(v1));

      // 3. 边界情况处理 - 如果没有变化，直接返回
      if (toAdd.length === 0 && toRemove.length === 0) {
        return {
          added: 0,
          removed: 0,
          unchanged: unchanged.length
        };
      }

      // 4. 使用批量操作方法执行删除和添加
      const removedCount = await this.batchRemoveRules(ptype, v0, toRemove, tx);
      const addedCount = await this.batchAddRules(ptype, v0, toAdd, v2, tx);

      // 返回操作结果统计
      return {
        added: addedCount,
        removed: removedCount,
        unchanged: unchanged.length
      };
    } catch (error) {
      throw new Error(`事务执行失败: ${error.message}`);
    }
  }

  /**
   * 验证增量更新方法的参数
   * 
   * @param ptype 权限类型
   * @param v0 主体标识
   * @param newV1List 新的权限列表
   * @param client Prisma客户端实例
   */
  private validateIncrementalUpdateParams(ptype: string, v0: string, newV1List: string[], client?: any): void {
    // 客户端验证
    if (client !== undefined && client !== null) {
      if (typeof client !== 'object' || (!client.$transaction && !client.casbinRule)) {
        throw new Error('client必须是有效的PrismaClient实例');
      }
    } else if (client === null || client === undefined) {
      throw new Error('client参数不能为空');
    }

    // 基础参数验证
    if (ptype === null || ptype === undefined || typeof ptype !== 'string' || ptype.trim() === '') {
      throw new Error('ptype不能为空且必须是字符串');
    }

    if (v0 === null || v0 === undefined || typeof v0 !== 'string' || v0.trim() === '') {
      throw new Error('v0不能为空且必须是字符串');
    }

    if (!Array.isArray(newV1List)) {
      throw new Error('newV1List必须是数组');
    }

    // 权限类型验证
    const validPtypes = ['p', 'g'];
    if (!validPtypes.includes(ptype)) {
      throw new Error(`ptype必须是以下值之一: ${validPtypes.join(', ')}`);
    }

    // 权限列表内容验证
    for (let i = 0; i < newV1List.length; i++) {
      const v1 = newV1List[i];
      if (v1 === null || v1 === undefined || typeof v1 !== 'string' || v1.trim() === '') {
        throw new Error(`newV1List[${i}]不能为空且必须是字符串`);
      }
    }

    // 检查重复项
    const uniqueV1List = [...new Set(newV1List)];
    if (uniqueV1List.length !== newV1List.length) {
      throw new Error('newV1List中不能包含重复项');
    }
  }
}
