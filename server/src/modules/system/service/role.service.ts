import { Provide, Inject } from '@midwayjs/core';
import { PrismaClient, Role } from '@prisma/client';
import { AdminBusinessError, BusinessErrors, UserDataErrors } from '../../../error/admin.error';
import { CasbinService } from '../../base/service/casbin.service';
import { PermissionService } from './permission.service';
import { Options } from '../../../core/crud_service';
import { IdentifierValidator } from '../../../utils';
import { PaginationUtil } from '../../../utils/pagination.util';
import { PaginationResult } from '../types/pagination.types';
import { CreateRoleDto, UpdateRoleDto, RoleDto } from '../dto/role.dto';
import * as _ from 'lodash';

@Provide()
export class RoleService {
  @Inject()
  prisma: PrismaClient;
  @Inject()
  casbinService: CasbinService;
  @Inject()
  permissionService: PermissionService;

  /**
   * 重新加载Casbin策略
   * @deprecated 请使用 PermissionService.updatePermissionsWithAutoReload 方法
   * 此方法已被统一权限管理服务取代，将在未来版本中移除
   * @returns 返回布尔值，表示是否成功重新加载策略
   */
  async reload() {
    // 使用统一的权限管理服务进行策略重载
    return await this.permissionService.updatePermissionsWithAutoReload(async () => {
      return true;
    });
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
    const _roleList = await this.casbinService.getAllRolesAndPlicysByDB('role') as Array<{ name: string; role: string }>;
    const roleList = _roleList.map(item => item.role);
    const nameList = _roleList.map(item => item.name);

    policies.forEach((item: string) => {
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
  public async findAll(where: Record<string, any>, options: Partial<Options>): Promise<PaginationResult<RoleDto>> {
    const { select, include } = options;

    // 使用 PaginationUtil 解析分页参数
    const paginationOptions = PaginationUtil.parsePaginationQuery({
      currentPage: options.page,
      pageSize: options.limit,
      sort: options.sort
    });

    // 构建数据库查询条件
    const queryOptions = PaginationUtil.buildDatabaseQuery(where, paginationOptions);

    // 构建查询参数，确保 select 和 include 不会同时使用
    const findManyArgs: any = {
      where: queryOptions.where,
      orderBy: queryOptions.orderBy,
      skip: queryOptions.skip,
      take: queryOptions.take
    };

    // 优先使用 select，如果没有 select 才使用 include
    if (select) {
      findManyArgs.select = select;
    } else if (include) {
      findManyArgs.include = include;
    }

    // 执行并行查询：获取数据和总数
    const [rows, count] = await Promise.all([
      this.prisma.role.findMany(findManyArgs),
      this.prisma.role.count({ where: queryOptions.where }),
    ]);

    // 获取所有角色权限信息
    const policies = await this.casbinService.getAdminPlocy();

    // 插入policies字段并转换为RoleDto类型
    const roleDtos: RoleDto[] = rows.map((item: Role) => {
      const curPolicies = policies.find((policy: { role: string; codes: string[] }) => policy.role === item.code);
      return {
        ...item,
        policies: curPolicies?.codes || []
      } as RoleDto;
    });

    // 使用 PaginationUtil 构建分页结果
    return PaginationUtil.buildPaginationResult(roleDtos, count, paginationOptions);
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
    
    // 使用权限服务的自动重载机制
    return await this.permissionService.updatePermissionsWithAutoReload(async () => {
      await this.prisma.$transaction(async (client) => {
        await client.role.create({ data: create });
        // 同步该角色的所有权限
        await this.permissionService.syncRolePermissions(code, currentPolicies, client, { autoReload: false, transaction: true });
      });
      return true;
    });
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
    
    // 使用权限服务的自动重载机制
    return await this.permissionService.updatePermissionsWithAutoReload(async () => {
      await this.prisma.$transaction(async (client) => {
        await client.role.update({ where: { id }, data: update });
        // 同步该角色的所有权限
        await this.permissionService.syncRolePermissions(code, currentPolicies, client, { autoReload: false, transaction: true });
      });
      return true;
    });
  }
  /**
   * 根据ID删除角色
   * @param id 角色ID
   * @returns 删除成功返回true
   * @throws AdminBusinessError 当尝试删除系统角色时抛出错误
   */
  async deleteById(id: number) {
    // 使用权限服务的自动重载机制
    return await this.permissionService.updatePermissionsWithAutoReload(async () => {
      await this.prisma.$transaction(async (client) => {
        const role = await client.role.findUnique({ where: { id }, select: { system: true, code: true } });
        if (role.system) {
          throw new AdminBusinessError(BusinessErrors.SYSTEM_ROLE_DELETE_FORBIDDEN);
        }
        await client.role.delete({ where: { id } });
        const roleName = role.code;
        // 使用权限服务的清理方法，统一处理角色删除时的权限清理
        await this.permissionService.cleanupRolePermissions(roleName, client);
      });
      return true;
    });
  }
}
