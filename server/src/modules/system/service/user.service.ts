import { Provide, Inject } from '@midwayjs/core';
import { PrismaClient, User } from '@prisma/client';
import { AdminBusinessError, BusinessErrors, UserDataErrors } from '../../../error/admin.error';
import { CasbinService } from '../../base/service/casbin.service';
import { PermissionService } from './permission.service';
import { UserDto, UpdateUserInfoDto, CreateUserDto, UpdateUserDto } from '../dto/user.dto';
import { Options } from '../../../core/crud_service';
import { IdentifierValidator } from '../../../utils';
import { PaginationUtil } from '../../../utils/pagination.util';
import { PaginationResult } from '../types/pagination.types';
import * as bcrypt from 'bcrypt';

import * as _ from 'lodash';

@Provide()
export class UserService {
  @Inject()
  prisma: PrismaClient;
  @Inject()
  casbinService: CasbinService;
  @Inject()
  permissionService: PermissionService;

  /**
   * 重新加载Casbin策略
   * @deprecated 请使用 PermissionService.updatePermissionsWithAutoReload 方法
   * @returns 返回布尔值，表示是否成功重新加载策略
   */
  async reload() {
    await this.casbinService.enforcer.loadPolicy();
    return true;
  }
  /**
   * 更新用户基础信息（不包含角色信息）
   * @param id 用户ID
   * @param data 要更新的用户数据
   * @returns 返回更新后的用户信息（不包含密码字段）
   */
  async updateUserInfo(id: number, data: UpdateUserInfoDto) {
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
   * @throws AdminBusinessError 当用户标识为空、角色标识列表为空、角色标识为空、角色标识不符合规则、角色标识重复、用户标识与角色标识重复、角色标识与权限标识重复时抛出错误
   */
  async checkNameAndRoles(name: string, roles: string[]) {
    // 1. 基础数据校验
    IdentifierValidator.validateUserNameAndRoles(name, roles);

    // 2. 业务逻辑校验（需要查询数据库）
    await this.checkUserRoleBusinessConflicts(name, roles);
    
    return true;
  }

  /**
   * 检查用户-角色业务冲突（需要查询数据库的校验）
   * @param name 用户标识
   * @param roles 角色标识列表
   * @throws AdminBusinessError 当发现业务冲突时抛出错误
   */
  private async checkUserRoleBusinessConflicts(name: string, roles: string[]) {
    // 用户标识不能跟现有角色标识重复
    const _roleList = await this.casbinService.getAllRolesAndPlicysByDB('role');
    const roleList = _roleList.map(item => item.role);
    if (roleList.includes(name)) {
      throw new AdminBusinessError(BusinessErrors.USER_ROLE_CONFLICT);
    }

    // 角色不能跟权限重复
    const _policyList = await this.casbinService.getAllRolesAndPlicysByDB('policy');
    const policyList = _policyList.map(item => item.policy);
    roles.forEach(item => {
      if (policyList.includes(item)) {
        throw new AdminBusinessError(BusinessErrors.ROLE_PERMISSION_CONFLICT);
      }
    });
  }
  /**
   * 分页查询用户列表
   * @param where 查询条件
   * @param options 查询选项（包含分页、排序等参数）
   * @returns 返回分页查询结果，包含用户列表、总数、当前页码和页面大小
   */
  public async findAll(where: Record<string, any>, options: Partial<Options>): Promise<PaginationResult<UserDto>> {
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
      this.prisma.user.findMany(findManyArgs),
      this.prisma.user.count({ where: queryOptions.where }),
    ]);
    
    // 获取所有用户角色信息
    const roles = await this.casbinService.getAdminGroup();
    
    // 插入roles字段并转换为UserDto类型
    const userDtos: UserDto[] = rows.map((item: User) => {
      // 清理密码字段
      const userWithoutPassword = _.omit(item, ['password']);
      const curRole = roles.find((role: { user: string; roles: string[] }) => role.user === item.username);
      return {
        ...userWithoutPassword,
        roles: curRole?.roles || []
      } as UserDto;
    });
    
    // 使用 PaginationUtil 构建分页结果
    return PaginationUtil.buildPaginationResult(userDtos, count, paginationOptions);
  }

  /**
   * 创建新用户
   * @param data 用户创建数据
   * @returns 创建成功返回true
   * @throws AdminBusinessError 当校验失败时抛出相应错误
   */
  async createUser(data: CreateUserDto) {
    const { username, password, roles, ...userData } = data;
    
    // 数据完整性校验
    await this.checkNameAndRoles(username, roles);

    // 准备创建数据
    const createData = {
      ...userData,
      username,
      password: await bcrypt.hash(password, 10)
    };

    // 使用权限服务的自动重载机制
    return await this.permissionService.updatePermissionsWithAutoReload(async () => {
      await this.prisma.$transaction(async (client) => {
        // 创建新用户
        await client.user.create({ data: createData });
        // 同步该用户的所有角色
        await this.permissionService.syncUserRoles(username, roles, client, { autoReload: false, transaction: true });
      });
      return true;
    });
  }

  /**
   * 更新用户信息
   * @param id 用户ID
   * @param data 用户更新数据
   * @returns 更新成功返回true
   * @throws AdminBusinessError 当用户不存在或校验失败时抛出相应错误
   */
  async updateUser(id: number, data: UpdateUserDto) {
    // 查询用户是否存在
    const registeredUser = await this.prisma.user.findUnique({ where: { id } });
    if (!registeredUser) {
      throw new AdminBusinessError(UserDataErrors.USER_NOT_FOUND);
    }

    const { password, roles, ...userData } = data;
    const targetUsername = registeredUser.username;
    
    // 如果提供了角色信息，进行数据完整性校验
    if (roles !== undefined) {
      await this.checkNameAndRoles(targetUsername, roles);
    }

    // 准备更新数据（不能修改username，因为它在casbin表中作为权限code）
    const updateData: Partial<User> = { ...userData };
    
    if (password) {
      // 更新密码时，同时更新passwordVersion
      updateData.password = await bcrypt.hash(password, 10);
      updateData.passwordVersion = registeredUser.passwordVersion + 1;
    }

    // 使用权限服务的自动重载机制
    return await this.permissionService.updatePermissionsWithAutoReload(async () => {
      await this.prisma.$transaction(async (client) => {
        // 更新用户信息
        await client.user.update({ where: { id }, data: updateData });
        // 如果提供了角色信息，同步用户角色
        if (roles !== undefined) {
          await this.permissionService.syncUserRoles(targetUsername, roles, client, { autoReload: false, transaction: true });
        }
      });
      return true;
    });
  }

  /**
   * 根据ID删除用户
   * @param id 用户ID
   * @returns 删除成功返回true
   * @throws AdminBusinessError 当尝试删除系统用户时抛出错误
   */
  async deleteById(id: number) {
    // 使用权限服务的自动重载机制
    return await this.permissionService.updatePermissionsWithAutoReload(async () => {
      await this.prisma.$transaction(async (client) => {
        const user = await client.user.findUnique({ where: { id }, select: { username: true, system: true } });
        if (user.system) throw new AdminBusinessError(BusinessErrors.SYSTEM_USER_DELETE_FORBIDDEN);
        await client.user.delete({ where: { id } });
        // 清空该用户的所有角色
        await this.permissionService.clearUserRoles(user.username, client);
      });
      return true;
    });
  }

  /**
   * 根据ID获取安全的用户信息（不包含密码）
   * @param id 用户ID
   * @returns 返回用户信息（不包含密码字段）
   */
  async safeUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    // 去掉密码
    const safe = _.omit(user, 'password');
    return safe;
  }

  /**
   * 根据用户名获取安全的用户信息（不包含密码）
   * @param username 用户名
   * @returns 返回用户信息（不包含密码字段）
   */
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
