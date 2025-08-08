import { createApp, close } from '@midwayjs/mock';
import { Framework } from '@midwayjs/koa';
import { Application } from '@midwayjs/koa';
import { PermissionService } from '../../../src/modules/system/service/permission.service';
import { CasbinService } from '../../../src/modules/base/service/casbin.service';
import { PrismaClient } from '@prisma/client';

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
  });

  describe('checkPermission', () => {
    it('应该调用CasbinService的权限检查方法', async () => {
      const checkSpy = jest.spyOn(casbinService, 'checkAccess').mockResolvedValue(true);

      const result = await permissionService.checkPermission('testuser', 'resource1');

      expect(checkSpy).toHaveBeenCalledWith('testuser', 'resource1');
      expect(result).toBe(true);

      checkSpy.mockRestore();
    });

    it('应该在检查失败时返回false', async () => {
      const checkSpy = jest.spyOn(casbinService, 'checkAccess').mockRejectedValue(new Error('检查失败'));

      const result = await permissionService.checkPermission('testuser', 'resource1');

      expect(result).toBe(false);

      checkSpy.mockRestore();
    });
  });
});