import { createApp, close } from '@midwayjs/mock';
import { Framework } from '@midwayjs/koa';
import { Application } from '@midwayjs/koa';
import { PermissionService } from '../../../src/modules/system/service/permission.service';
import { CasbinService } from '../../../src/modules/base/service/casbin.service';
import { PrismaClient } from '@prisma/client';
import { PermissionUpdateOperation } from '../../../src/modules/system/types/permission.types';

describe('PermissionService', () => {
  let app: Application;
  let permissionService: PermissionService;
  let casbinService: CasbinService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createApp<Framework>();
    permissionService = await app.getApplicationContext().getAsync(PermissionService);
    casbinService = await app.getApplicationContext().getAsync(CasbinService);
    prisma = await app.getApplicationContext().getAsync('prisma');
  });

  afterAll(async () => {
    await close(app);
  });

  describe('updatePermissionsWithAutoReload', () => {
    it('应该执行操作并自动重新加载策略', async () => {
      // 模拟一个简单的操作
      const mockOperation = jest.fn().mockResolvedValue('success');
      const loadPolicySpy = jest.spyOn(casbinService.enforcer, 'loadPolicy').mockResolvedValue();

      const result = await permissionService.updatePermissionsWithAutoReload(mockOperation);

      expect(mockOperation).toHaveBeenCalled();
      expect(loadPolicySpy).toHaveBeenCalled();
      expect(result).toBe('success');

      loadPolicySpy.mockRestore();
    });

    it('应该在操作失败时抛出错误', async () => {
      const mockError = new Error('操作失败');
      const mockOperation = jest.fn().mockRejectedValue(mockError);

      await expect(
        permissionService.updatePermissionsWithAutoReload(mockOperation)
      ).rejects.toThrow('操作失败');
    });
  });

  describe('syncUserRoles', () => {
    it('应该调用CasbinService的增量更新方法', async () => {
      const syncSpy = jest.spyOn(casbinService, 'syncAdminDBRulesIncremental').mockResolvedValue({
        added: 1,
        removed: 0,
        unchanged: 0
      });
      const loadPolicySpy = jest.spyOn(casbinService.enforcer, 'loadPolicy').mockResolvedValue();

      await permissionService.syncUserRoles('testuser', ['role1', 'role2']);

      expect(syncSpy).toHaveBeenCalledWith('g', 'testuser', ['role1', 'role2'], '', prisma);
      expect(loadPolicySpy).toHaveBeenCalled();

      syncSpy.mockRestore();
      loadPolicySpy.mockRestore();
    });

    it('应该在事务中不自动重载策略', async () => {
      const mockClient = {} as any; // 模拟事务客户端
      const syncSpy = jest.spyOn(casbinService, 'syncAdminDBRulesIncremental').mockResolvedValue({
        added: 1,
        removed: 0,
        unchanged: 0
      });
      const loadPolicySpy = jest.spyOn(casbinService.enforcer, 'loadPolicy').mockResolvedValue();

      await permissionService.syncUserRoles('testuser', ['role1'], mockClient, { autoReload: false });

      expect(syncSpy).toHaveBeenCalledWith('g', 'testuser', ['role1'], '', mockClient);
      expect(loadPolicySpy).not.toHaveBeenCalled();

      syncSpy.mockRestore();
      loadPolicySpy.mockRestore();
    });

    it('应该在同步失败时抛出错误', async () => {
      const syncSpy = jest.spyOn(casbinService, 'syncAdminDBRulesIncremental').mockRejectedValue(new Error('同步失败'));

      await expect(
        permissionService.syncUserRoles('testuser', ['role1'])
      ).rejects.toThrow('同步用户角色失败: 同步失败');

      syncSpy.mockRestore();
    });
  });

  describe('syncRolePermissions', () => {
    it('应该调用CasbinService的增量更新方法', async () => {
      const syncSpy = jest.spyOn(casbinService, 'syncAdminDBRulesIncremental').mockResolvedValue({
        added: 1,
        removed: 0,
        unchanged: 0
      });
      const loadPolicySpy = jest.spyOn(casbinService.enforcer, 'loadPolicy').mockResolvedValue();

      await permissionService.syncRolePermissions('admin_role', ['perm1', 'perm2']);

      expect(syncSpy).toHaveBeenCalledWith('p', 'admin_role', ['perm1', 'perm2'], 'access', prisma);
      expect(loadPolicySpy).toHaveBeenCalled();

      syncSpy.mockRestore();
      loadPolicySpy.mockRestore();
    });

    it('应该在同步失败时抛出错误', async () => {
      const syncSpy = jest.spyOn(casbinService, 'syncAdminDBRulesIncremental').mockRejectedValue(new Error('权限同步失败'));

      await expect(
        permissionService.syncRolePermissions('admin_role', ['perm1'])
      ).rejects.toThrow('同步角色权限失败: 权限同步失败');

      syncSpy.mockRestore();
    });
  });

  describe('batchUpdatePermissions', () => {
    it('应该处理空操作列表', async () => {
      const result = await permissionService.batchUpdatePermissions([]);
      expect(result).toBeUndefined();
    });

    it('应该处理null操作列表', async () => {
      const result = await permissionService.batchUpdatePermissions(null as any);
      expect(result).toBeUndefined();
    });

    it('应该批量执行用户角色同步操作', async () => {
      const operations: PermissionUpdateOperation[] = [
        {
          type: 'sync',
          target: 'user',
          identifier: 'user1',
          permissions: ['role1', 'role2']
        },
        {
          type: 'sync',
          target: 'user',
          identifier: 'user2',
          permissions: ['role3']
        }
      ];

      const transactionSpy = jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const mockClient = {} as any;
        return await callback(mockClient);
      });
      const syncSpy = jest.spyOn(casbinService, 'syncAdminDBRulesIncremental').mockResolvedValue({
        added: 1,
        removed: 0,
        unchanged: 0
      });
      const loadPolicySpy = jest.spyOn(casbinService.enforcer, 'loadPolicy').mockResolvedValue();

      await permissionService.batchUpdatePermissions(operations);

      expect(transactionSpy).toHaveBeenCalled();
      expect(syncSpy).toHaveBeenCalledTimes(2);
      expect(loadPolicySpy).toHaveBeenCalled();

      transactionSpy.mockRestore();
      syncSpy.mockRestore();
      loadPolicySpy.mockRestore();
    });

    it('应该批量执行角色权限同步操作', async () => {
      const operations: PermissionUpdateOperation[] = [
        {
          type: 'sync',
          target: 'role',
          identifier: 'admin',
          permissions: ['perm1', 'perm2']
        }
      ];

      const transactionSpy = jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const mockClient = {} as any;
        return await callback(mockClient);
      });
      const syncSpy = jest.spyOn(casbinService, 'syncAdminDBRulesIncremental').mockResolvedValue({
        added: 1,
        removed: 0,
        unchanged: 0
      });
      const loadPolicySpy = jest.spyOn(casbinService.enforcer, 'loadPolicy').mockResolvedValue();

      await permissionService.batchUpdatePermissions(operations);

      expect(transactionSpy).toHaveBeenCalled();
      expect(syncSpy).toHaveBeenCalledWith('p', 'admin', ['perm1', 'perm2'], 'access', {});
      expect(loadPolicySpy).toHaveBeenCalled();

      transactionSpy.mockRestore();
      syncSpy.mockRestore();
      loadPolicySpy.mockRestore();
    });

    it('应该在遇到不支持的操作类型时抛出错误', async () => {
      const operations: any[] = [
        {
          type: 'unsupported',
          target: 'user',
          identifier: 'user1',
          permissions: ['role1']
        }
      ];

      const transactionSpy = jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const mockClient = {} as any;
        return await callback(mockClient);
      });

      await expect(
        permissionService.batchUpdatePermissions(operations)
      ).rejects.toThrow('批量更新权限失败: 不支持的操作类型: unsupported');

      transactionSpy.mockRestore();
    });

    it('应该在事务失败时抛出错误', async () => {
      const operations: PermissionUpdateOperation[] = [
        {
          type: 'sync',
          target: 'user',
          identifier: 'user1',
          permissions: ['role1']
        }
      ];

      const transactionSpy = jest.spyOn(prisma, '$transaction').mockRejectedValue(new Error('事务失败'));

      await expect(
        permissionService.batchUpdatePermissions(operations)
      ).rejects.toThrow('批量更新权限失败: 事务失败');

      transactionSpy.mockRestore();
    });
  });

  describe('clearUserRoles', () => {
    it('应该调用CasbinService的清除方法', async () => {
      const clearSpy = jest.spyOn(casbinService, 'clearDBRulesByV0').mockResolvedValue();
      const loadPolicySpy = jest.spyOn(casbinService.enforcer, 'loadPolicy').mockResolvedValue();

      await permissionService.clearUserRoles('testuser');

      expect(clearSpy).toHaveBeenCalledWith('g', 'testuser', prisma);
      expect(loadPolicySpy).toHaveBeenCalled();

      clearSpy.mockRestore();
      loadPolicySpy.mockRestore();
    });

    it('应该在清除失败时抛出错误', async () => {
      const clearSpy = jest.spyOn(casbinService, 'clearDBRulesByV0').mockRejectedValue(new Error('清除失败'));

      await expect(
        permissionService.clearUserRoles('testuser')
      ).rejects.toThrow('清除用户角色失败: 清除失败');

      clearSpy.mockRestore();
    });
  });

  describe('clearRolePermissions', () => {
    it('应该调用CasbinService的清除方法', async () => {
      const clearSpy = jest.spyOn(casbinService, 'clearDBRulesByV0').mockResolvedValue();
      const loadPolicySpy = jest.spyOn(casbinService.enforcer, 'loadPolicy').mockResolvedValue();

      await permissionService.clearRolePermissions('admin_role');

      expect(clearSpy).toHaveBeenCalledWith('p', 'admin_role', prisma);
      expect(loadPolicySpy).toHaveBeenCalled();

      clearSpy.mockRestore();
      loadPolicySpy.mockRestore();
    });

    it('应该在事务中不自动重载策略', async () => {
      const mockClient = {} as any;
      const clearSpy = jest.spyOn(casbinService, 'clearDBRulesByV0').mockResolvedValue();
      const loadPolicySpy = jest.spyOn(casbinService.enforcer, 'loadPolicy').mockResolvedValue();

      await permissionService.clearRolePermissions('admin_role', mockClient);

      expect(clearSpy).toHaveBeenCalledWith('p', 'admin_role', mockClient);
      expect(loadPolicySpy).not.toHaveBeenCalled();

      clearSpy.mockRestore();
      loadPolicySpy.mockRestore();
    });

    it('应该在清除失败时抛出错误', async () => {
      const clearSpy = jest.spyOn(casbinService, 'clearDBRulesByV0').mockRejectedValue(new Error('清除失败'));

      await expect(
        permissionService.clearRolePermissions('admin_role')
      ).rejects.toThrow('清除角色权限失败: 清除失败');

      clearSpy.mockRestore();
    });
  });

  describe('cleanupRolePermissions', () => {
    it('应该清除角色权限和用户关联', async () => {
      const clearByV0Spy = jest.spyOn(casbinService, 'clearDBRulesByV0').mockResolvedValue();
      const clearByV1Spy = jest.spyOn(casbinService, 'clearDBRulesByV1').mockResolvedValue();
      const loadPolicySpy = jest.spyOn(casbinService.enforcer, 'loadPolicy').mockResolvedValue();

      await permissionService.cleanupRolePermissions('admin_role');

      expect(clearByV0Spy).toHaveBeenCalledWith('p', 'admin_role', prisma);
      expect(clearByV1Spy).toHaveBeenCalledWith('g', 'admin_role', prisma);
      expect(loadPolicySpy).toHaveBeenCalled();

      clearByV0Spy.mockRestore();
      clearByV1Spy.mockRestore();
      loadPolicySpy.mockRestore();
    });

    it('应该在清理失败时抛出错误', async () => {
      const clearByV0Spy = jest.spyOn(casbinService, 'clearDBRulesByV0').mockRejectedValue(new Error('清理失败'));

      await expect(
        permissionService.cleanupRolePermissions('admin_role')
      ).rejects.toThrow('清理角色权限失败: 清理失败');

      clearByV0Spy.mockRestore();
    });
  });

  describe('getPermissionContext', () => {
    it('应该返回用户权限上下文', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        system: false
      };
      const mockRoles = ['admin', 'user'];

      const findFirstSpy = jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      const getAdminGroupSpy = jest.spyOn(casbinService, 'getAdminGroup').mockResolvedValue(mockRoles);

      const result = await permissionService.getPermissionContext('testuser');

      expect(findFirstSpy).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        select: { id: true, username: true, system: true }
      });
      expect(getAdminGroupSpy).toHaveBeenCalledWith('testuser');
      expect(result).toEqual({
        userId: 1,
        username: 'testuser',
        roles: mockRoles,
        isSystem: false
      });

      findFirstSpy.mockRestore();
      getAdminGroupSpy.mockRestore();
    });

    it('应该在用户不存在时返回null', async () => {
      const findFirstSpy = jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(null);

      const result = await permissionService.getPermissionContext('nonexistent');

      expect(result).toBeNull();

      findFirstSpy.mockRestore();
    });

    it('应该处理getAdminGroup返回null的情况', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        system: true
      };

      const findFirstSpy = jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      const getAdminGroupSpy = jest.spyOn(casbinService, 'getAdminGroup').mockResolvedValue(null);

      const result = await permissionService.getPermissionContext('testuser');

      expect(result).toEqual({
        userId: 1,
        username: 'testuser',
        roles: [],
        isSystem: true
      });

      findFirstSpy.mockRestore();
      getAdminGroupSpy.mockRestore();
    });

    it('应该在获取失败时抛出错误', async () => {
      const findFirstSpy = jest.spyOn(prisma.user, 'findFirst').mockRejectedValue(new Error('数据库错误'));

      await expect(
        permissionService.getPermissionContext('testuser')
      ).rejects.toThrow('获取权限上下文失败: 数据库错误');

      findFirstSpy.mockRestore();
    });
  });

  describe('checkPermission', () => {
    it('应该调用CasbinService的权限检查方法', async () => {
      const checkSpy = jest.spyOn(casbinService, 'checkAccess').mockResolvedValue(true);

      const result = await permissionService.checkPermission('testuser', 'resource1');

      expect(checkSpy).toHaveBeenCalledWith('testuser', 'resource1');
      expect(result).toBe(true);

      checkSpy.mockRestore();
    });

    it('应该返回false当权限检查失败时', async () => {
      const checkSpy = jest.spyOn(casbinService, 'checkAccess').mockResolvedValue(false);

      const result = await permissionService.checkPermission('testuser', 'resource1');

      expect(checkSpy).toHaveBeenCalledWith('testuser', 'resource1');
      expect(result).toBe(false);

      checkSpy.mockRestore();
    });

    it('应该在检查失败时返回false', async () => {
      const checkSpy = jest.spyOn(casbinService, 'checkAccess').mockRejectedValue(new Error('检查失败'));

      const result = await permissionService.checkPermission('testuser', 'resource1');

      expect(result).toBe(false);

      checkSpy.mockRestore();
    });

    it('应该在权限检查抛出错误时正确处理', async () => {
       const checkSpy = jest.spyOn(casbinService, 'checkAccess').mockRejectedValue(new Error('权限检查失败'));

       const result = await permissionService.checkPermission('testuser', 'resource1');

       expect(checkSpy).toHaveBeenCalledWith('testuser', 'resource1');
       expect(result).toBe(false);

       checkSpy.mockRestore();
     });
   });
});