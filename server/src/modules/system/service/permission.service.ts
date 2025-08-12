import { Provide, Inject } from '@midwayjs/core';
import { PrismaClient } from '@prisma/client';
import { CasbinService } from '../../base/service/casbin.service';
import { 
  PermissionContext, 
  PermissionUpdateOperation, 
  PermissionSyncOptions
} from '../types/permission.types';

// 定义事务客户端类型，兼容 Prisma 事务和普通客户端
type TransactionClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"> | PrismaClient;

/**
 * 权限管理服务
 * 封装权限操作的通用逻辑，提供自动缓存同步机制
 */
@Provide()
export class PermissionService {
  @Inject()
  private prisma: PrismaClient;
  
  @Inject()
  private casbinService: CasbinService;

  /**
   * 执行权限操作并自动重新加载策略缓存
   * 这是核心方法，确保所有权限更新后都会自动同步缓存
   * 
   * @param operation 要执行的权限操作函数
   * @returns 返回操作结果
   */
  async updatePermissionsWithAutoReload<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      // 执行权限操作
      const result = await operation();
      
      // 自动重新加载策略缓存
      await this.casbinService.enforcer.loadPolicy();
      
      return result;
    } catch (error) {
      // 如果操作失败，确保错误被正确抛出
      throw error;
    }
  }

  /**
   * 同步用户角色
   * 使用增量更新方式，只添加和删除必要的角色记录
   * 
   * @param username 用户名
   * @param roles 新的角色列表
   * @param client Prisma客户端实例（可选，用于事务）
   * @param options 同步选项
   * @returns 返回同步结果
   */
  async syncUserRoles(
    username: string, 
    roles: string[], 
    client?: TransactionClient,
    options: PermissionSyncOptions = { autoReload: true, transaction: true }
  ): Promise<void> {
    const dbClient = client || this.prisma;
    
    try {
      // 使用 CasbinService 的增量更新方法
      await this.casbinService.syncAdminDBRulesIncremental(
        'g', 
        username, 
        roles, 
        '', 
        dbClient
      );
      
      // 如果启用自动重载且不在事务中，立即重载策略
      if (options.autoReload && !client) {
        await this.casbinService.enforcer.loadPolicy();
      }
    } catch (error) {
      throw new Error(`同步用户角色失败: ${error.message}`);
    }
  }

  /**
   * 同步角色权限
   * 使用增量更新方式，只添加和删除必要的权限记录
   * 
   * @param roleCode 角色代码
   * @param permissions 新的权限列表
   * @param client Prisma客户端实例（可选，用于事务）
   * @param options 同步选项
   * @returns 返回同步结果
   */
  async syncRolePermissions(
    roleCode: string, 
    permissions: string[], 
    client?: TransactionClient,
    options: PermissionSyncOptions = { autoReload: true, transaction: true }
  ): Promise<void> {
    const dbClient = client || this.prisma;
    
    try {
      // 使用 CasbinService 的增量更新方法
      await this.casbinService.syncAdminDBRulesIncremental(
        'p', 
        roleCode, 
        permissions, 
        'access', 
        dbClient
      );
      
      // 如果启用自动重载且不在事务中，立即重载策略
      if (options.autoReload && !client) {
        await this.casbinService.enforcer.loadPolicy();
      }
    } catch (error) {
      throw new Error(`同步角色权限失败: ${error.message}`);
    }
  }

  /**
   * 批量执行权限更新操作
   * 在单个事务中执行多个权限操作，最后统一重载策略
   * 
   * @param operations 权限操作列表
   * @returns 返回所有操作的结果
   */
  async batchUpdatePermissions(
    operations: PermissionUpdateOperation[]
  ): Promise<void> {
    if (!operations || operations.length === 0) {
      return;
    }

    try {
      await this.prisma.$transaction(async (client) => {
        for (const operation of operations) {
          switch (operation.type) {
            case 'sync':
              if (operation.target === 'user') {
                await this.syncUserRoles(
                  operation.identifier, 
                  operation.permissions, 
                  client,
                  { autoReload: false, transaction: true }
                );
              } else if (operation.target === 'role') {
                await this.syncRolePermissions(
                  operation.identifier, 
                  operation.permissions, 
                  client,
                  { autoReload: false, transaction: true }
                );
              }
              break;
            // 可以根据需要扩展其他操作类型
            default:
              throw new Error(`不支持的操作类型: ${operation.type}`);
          }
        }
      });

      // 事务完成后统一重载策略
      await this.casbinService.enforcer.loadPolicy();
    } catch (error) {
      throw new Error(`批量更新权限失败: ${error.message}`);
    }
  }

  /**
   * 清除用户的所有角色
   * 
   * @param username 用户名
   * @param client Prisma客户端实例（可选，用于事务）
   * @returns 返回清除结果
   */
  async clearUserRoles(
    username: string, 
    client?: TransactionClient
  ): Promise<void> {
    const dbClient = client || this.prisma;
    
    try {
      await this.casbinService.clearDBRulesByV0('g', username, dbClient);
      
      // 如果不在事务中，立即重载策略
      if (!client) {
        await this.casbinService.enforcer.loadPolicy();
      }
    } catch (error) {
      throw new Error(`清除用户角色失败: ${error.message}`);
    }
  }

  /**
   * 清除角色的所有权限
   * 
   * @param roleCode 角色代码
   * @param client Prisma客户端实例（可选，用于事务）
   * @returns 返回清除结果
   */
  async clearRolePermissions(
    roleCode: string, 
    client?: TransactionClient
  ): Promise<void> {
    const dbClient = client || this.prisma;
    
    try {
      await this.casbinService.clearDBRulesByV0('p', roleCode, dbClient);
      
      // 如果不在事务中，立即重载策略
      if (!client) {
        await this.casbinService.enforcer.loadPolicy();
      }
    } catch (error) {
      throw new Error(`清除角色权限失败: ${error.message}`);
    }
  }

  /**
   * 删除角色时清理相关的所有权限数据
   * 包括角色的权限和用户与该角色的关联
   * 
   * @param roleCode 角色代码
   * @param client Prisma客户端实例（可选，用于事务）
   * @returns 返回清理结果
   */
  async cleanupRolePermissions(
    roleCode: string, 
    client?: TransactionClient
  ): Promise<void> {
    const dbClient = client || this.prisma;
    
    try {
      // 清除该角色的所有权限
      await this.casbinService.clearDBRulesByV0('p', roleCode, dbClient);
      
      // 删除所有用户与该角色的关联
      await this.casbinService.clearDBRulesByV1('g', roleCode, dbClient);
      
      // 如果不在事务中，立即重载策略
      if (!client) {
        await this.casbinService.enforcer.loadPolicy();
      }
    } catch (error) {
      throw new Error(`清理角色权限失败: ${error.message}`);
    }
  }

  /**
   * 获取权限上下文信息
   * 用于权限检查和审计
   * 
   * @param username 用户名
   * @returns 返回权限上下文
   */
  async getPermissionContext(username: string): Promise<PermissionContext | null> {
    try {
      // 获取用户基本信息
      const user = await this.prisma.user.findFirst({
        where: { username },
        select: { id: true, username: true, system: true }
      });

      if (!user) {
        return null;
      }

      // 获取用户角色
      const roles = await this.casbinService.getAdminGroup(username) || [];

      return {
        userId: user.id,
        username: user.username,
        roles,
        isSystem: user.system
      };
    } catch (error) {
      throw new Error(`获取权限上下文失败: ${error.message}`);
    }
  }

  /**
   * 检查权限
   * 封装 CasbinService 的权限检查方法
   * 
   * @param username 用户名
   * @param resource 资源
   * @returns 返回是否有权限
   */
  async checkPermission(
    username: string, 
    resource: string
  ): Promise<boolean> {
    try {
      return await this.casbinService.checkAccess(username, resource);
    } catch (error) {
      // 权限检查失败时，为了安全起见返回 false
      return false;
    }
  }
}