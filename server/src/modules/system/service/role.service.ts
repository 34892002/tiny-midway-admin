import { Provide, Inject } from '@midwayjs/core';
import { PrismaClient } from '@prisma/client';
import { AdminBusinessError, BusinessErrors, UserDataErrors } from '../../../error/admin.error';
import { CasbinService } from '../../base/service/casbin.service';
import { Options } from '../../../core/crud_service';
import { IdentifierValidator } from '../../../utils';
import { CreateRoleDto, UpdateRoleDto } from '../dto/role.dto';
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
  /**
   * 校验角色代码和权限标识的合法性
   *
   * @param code 角色代码
   * @param policies 权限标识列表
   * @throws AdminBusinessError 当校验失败时抛出相应错误
   */
  async checkCodeAndPolicies(code: string, policies: string[]) {
    // 1. 基础数据校验
    IdentifierValidator.validateRoleCodeAndPolicies(code, policies);

    // 2. 业务逻辑校验（需要查询数据库）
    await this.checkRolePolicyBusinessConflicts(policies);
  }

  /**
   * 检查角色-权限业务冲突（需要查询数据库的校验）
   * @param policies 权限标识列表
   * @throws AdminBusinessError 当发现业务冲突时抛出错误
   */
  private async checkRolePolicyBusinessConflicts(policies: string[]) {
    // 权限不能跟角色重复
    const _roleList = await this.casbinService.getAllRolesAndPlicysByDB('role');
    const roleList = _roleList.map(item => item.role);
    const nameList = _roleList.map(item => item.name);
    
    policies.forEach(item => {
      if (nameList.includes(item)) {
        throw new AdminBusinessError(BusinessErrors.PERMISSION_USER_CONFLICT);
      }
      if (roleList.includes(item)) {
        throw new AdminBusinessError(BusinessErrors.PERMISSION_ROLE_CONFLICT);
      }
    });
  }

  /**
   * 分页查询角色列表
   * @param where 查询条件
   * @param options 查询选项（包含分页、排序等参数）
   * @returns 返回分页查询结果，包含角色列表、总数、当前页码和页面大小
   */
  public async findAll(where: any, options: Partial<Options>): Promise<{ records: any[]; total: number; currentPage: number; pageSize: number }> {
    const { select, include, sort = { id: 'desc' }, page = 1, limit = 20 } = options;
    const orderBy = typeof sort === 'string' ? JSON.parse(sort) : sort;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
    const [rows, count] = await Promise.all([
      this.prisma.role.findMany({ where, select, include, orderBy, skip, take } as any),
      this.prisma.role.count({ where }),
    ]);
    const policies = await this.casbinService.getAdminPlocy();
    // 插入policies字段
    rows.forEach(item => {
      const curPolicy = policies.find(policy => policy.role === item.code);
      if (curPolicy?.codes) item['policies'] = curPolicy.codes
    });
    return { records: rows, total: count, currentPage: page, pageSize: limit };
  }

  /**
   * 创建新角色
   * @param data 角色数据（包含角色信息和权限列表）
   * @returns 创建成功返回true
   * @throws AdminBusinessError 当校验失败时抛出相应错误
   */
  async createOne(data: CreateRoleDto) {
    const currentPolicies = data.policies;
    const code = data.code;
    await this.checkCodeAndPolicies(code, currentPolicies);
    const create = _.pick(data, ['name', 'code']);
    try {
      await this.prisma.$transaction(async (client) => {
        await client.role.create({ data: create });
        // 同步该角色的所有权限
        await this.casbinService.syncAdminDBRulesIncremental('p', code, currentPolicies, 'access', client);
      });
    } finally {
      await this.reload();
    }

    return true;
  }

  /**
   * 更新角色信息
   * @param id 角色ID
   * @param data 角色数据（包含角色信息和权限列表）
   * @returns 更新成功返回true
   * @throws AdminBusinessError 当校验失败或角色不存在时抛出相应错误
   */
  async updateOne(id: number, data: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new AdminBusinessError(UserDataErrors.ROLE_NOT_FOUND);
    }
    // 系统内置账号不能修改系统属性
    if (data.system !== undefined && data.system !== role.system) {
      throw new AdminBusinessError(BusinessErrors.SYSTEM_PROPERTY_MODIFY_FORBIDDEN);
    }

    const currentPolicies = data.policies;
    const code = role.code; // 使用现有的code，不允许修改
    await this.checkCodeAndPolicies(code, currentPolicies);

    // code唯一且不会被修改，所以update中排除code
    const update = _.omit(data, ['code', 'policies']);
    try {
      await this.prisma.$transaction(async (client) => {
        await client.role.update({ where: { id }, data: update });
        // 同步该角色的所有权限
        await this.casbinService.syncAdminDBRulesIncremental('p', code, currentPolicies, 'access', client);
      });
    } finally {
      await this.reload();
    }

    return true;
  }
  /**
   * 根据ID删除角色
   * @param id 角色ID
   * @returns 删除成功返回true
   * @throws AdminBusinessError 当尝试删除系统角色时抛出错误
   */
  async deleteById(id: number) {
    try {
      await this.prisma.$transaction(async (client) => {
        const role = await client.role.findUnique({ where: { id }, select: { system: true } });
        if (role.system) {
          throw new AdminBusinessError(BusinessErrors.SYSTEM_ROLE_DELETE_FORBIDDEN);
        }
        const deletedRole = await client.role.delete({ where: { id } });
        const roleName = deletedRole.code;
        // 清空该角色的所有权限
        await this.casbinService.clearDBRulesByV0('p', roleName, client);
        // 删除所有用户关联的该角色
        await this.casbinService.clearDBRulesByV1('g', roleName, client);
      });
      return true;
    } finally {
      await this.reload();
    }
  }
}
