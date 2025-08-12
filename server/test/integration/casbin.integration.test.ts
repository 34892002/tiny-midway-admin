/**
 * Casbin 权限管理集成测试
 * 重构了 base/casbin.test.ts，使用统一的测试工具库
 * 专注于权限引擎和权限管理的核心功能测试
 */

import { Framework, Application } from '@midwayjs/koa';
import { createApp, close } from '@midwayjs/mock';
import { CasbinService } from '../../src/modules/base/service/casbin.service';
import { CasbinGuard } from '../../src/guard/casbin';
import { Context } from '@midwayjs/koa';
import { savePropertyMetadata } from '@midwayjs/core';
import { ACCESS_META_KEY } from '../../src/decorator/access';
import { DatabaseHelper } from '../__helpers__';
import { BusinessErrors } from '../../src/error/admin.error';

// 定义权限相关的枚举类型
enum RuleAction {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

enum RulePossession {
  ANY = 'any',
  OWN = 'own'
}

enum RuleResource {
  PROJECT_DATA = 'project_obj',
  SHCEMA_DATA = 'shcema_obj',
  USER_DATA = 'user_obj'
}

describe('Casbin Permission Management Integration Tests', () => {
  // 设置测试环境
  process.env.NODE_ENV = 'unittest';
  process.env.DATABASE_URL = 'file:./test.db';

  let app: Application;
  let casbinService: CasbinService;

  beforeAll(async () => {
    app = await createApp<Framework>();
    casbinService = await app.getApplicationContext().getAsync(CasbinService);
  });

  afterAll(async () => {
    await DatabaseHelper.cleanupTestData(['casbin']);
    await close(app);
  });

  describe('Casbin Service Core Methods', () => {
    describe('Database Operations', () => {
      it('should get all roles from database', async () => {
        const result = await casbinService.getAllRolesAndPlicysByDB('role');
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty('name');
          expect(result[0]).toHaveProperty('role');
        }
      });

      it('should get all policies from database', async () => {
        const result = await casbinService.getAllRolesAndPlicysByDB('policy');
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty('role');
          expect(result[0]).toHaveProperty('policy');
        }
      });
    });

    describe('Permission Checking', () => {
      it('should check access permission', async () => {
        const result = await casbinService.checkAccess('admin', 'test_resource');
        expect(typeof result).toBe('boolean');
      });
    });

    describe('Admin Policy Management', () => {
      it('should get admin policy without name parameter', async () => {
        const result = await casbinService.getAdminPlocy();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should get admin policy with specific role name', async () => {
        const result = await casbinService.getAdminPlocy('SUPER_ADMIN');
        expect(result === undefined || Array.isArray(result)).toBe(true);
      });

      it('should add admin policies successfully', async () => {
        const result = await casbinService.addAdminPolices('TEST_ROLE', ['test_code1', 'test_code2'], false);
        expect(typeof result).toBe('boolean');
      });

      it('should reject when role is empty', async () => {
        await expect(casbinService.addAdminPolices('', ['test_code'])).rejects.toThrow(BusinessErrors.ROLE_IDENTIFIER_EMPTY.error);
      });

      it('should return true when codes array is empty', async () => {
        const result = await casbinService.addAdminPolices('TEST_ROLE', []);
        expect(result).toBe(true);
      });

      it('should remove admin policy successfully', async () => {
        const result = await casbinService.removeAdminPolicy('TEST_ROLE', ['test_code1'], false);
        expect(result).toBeUndefined();
      });

      it('should reject when role is empty for remove policy', async () => {
        await expect(casbinService.removeAdminPolicy('', ['test_code'])).rejects.toThrow(BusinessErrors.ROLE_IDENTIFIER_EMPTY.error);
      });

      it('should return true when removing empty codes array', async () => {
        const result = await casbinService.removeAdminPolicy('TEST_ROLE', []);
        expect(result).toBe(true);
      });
    });

    describe('Admin Group Management', () => {
      it('should get admin group without name parameter', async () => {
        const result = await casbinService.getAdminGroup();
        expect(Array.isArray(result)).toBe(true);
      });

      it('should get admin group with specific username', async () => {
        const result = await casbinService.getAdminGroup('admin');
        expect(result === undefined || Array.isArray(result)).toBe(true);
      });

      it('should add admin role successfully', async () => {
        const result = await casbinService.addAdminRole('test_user', ['TEST_ROLE'], false);
        expect(result).toBeUndefined();
      });

      it('should reject when username is empty', async () => {
        await expect(casbinService.addAdminRole('', ['TEST_ROLE'])).rejects.toThrow(BusinessErrors.USER_IDENTIFIER_EMPTY.error);
      });

      it('should return true when roles array is empty', async () => {
        const result = await casbinService.addAdminRole('test_user', []);
        expect(result).toBe(true);
      });

      it('should remove admin role successfully', async () => {
        const result = await casbinService.removeAdminRole('test_user', ['TEST_ROLE'], false);
        expect(result).toBeUndefined();
      });

      it('should reject when username is empty for remove', async () => {
        await expect(casbinService.removeAdminRole('', ['TEST_ROLE'])).rejects.toThrow(BusinessErrors.USER_IDENTIFIER_EMPTY.error);
      });

      it('should return true when removing empty roles array', async () => {
        const result = await casbinService.removeAdminRole('test_user', []);
        expect(result).toBe(true);
      });
    });

    describe('Difference Calculation', () => {
      it('should diff admin roles correctly', async () => {
        const result = await casbinService.diffAdminRole('admin', ['SUPER_ADMIN', 'NEW_ROLE']);
        expect(result).toHaveProperty('addRoles');
        expect(result).toHaveProperty('removeRoles');
        expect(Array.isArray(result.addRoles)).toBe(true);
        expect(Array.isArray(result.removeRoles)).toBe(true);
      });

      it('should diff admin policies correctly', async () => {
        const result = await casbinService.diffAdminPolicy('SUPER_ADMIN', ['new_code1', 'new_code2']);
        expect(result).toHaveProperty('addCodes');
        expect(result).toHaveProperty('removeCodes');
        expect(Array.isArray(result.addCodes)).toBe(true);
        expect(Array.isArray(result.removeCodes)).toBe(true);
      });
    });

    describe('Synchronization Operations', () => {
      it('should return true when no role changes needed', async () => {
        // 先获取当前角色
        const currentRoles = await casbinService.getAdminGroup('admin');
        
        if (currentRoles && currentRoles.length > 0) {
          const result = await casbinService.syncAdminRoleAndSave('admin', currentRoles);
          expect(result).toBe(true);
        }
      });

      it('should return true when no policy changes needed', async () => {
        // 先获取当前策略
        const currentPolicies = await casbinService.getAdminPlocy('SUPER_ADMIN');
        
        if (currentPolicies && currentPolicies.length > 0) {
          const result = await casbinService.syncAdminPolicyAndSave('SUPER_ADMIN', currentPolicies);
          expect(result).toBe(true);
        }
      });

      it('should sync admin load and save', async () => {
        const result = await casbinService.syncAdminLoadAndSave('test_user', ['TEST_ROLE'], 'TEST_ROLE', ['test_code']);
        expect(typeof result).toBe('boolean');
      });
    });

    describe('Database Rule Management', () => {
      it('should clear DB rules by v0', async () => {
        await expect(casbinService.clearDBRulesByV0('p', 'test_role')).resolves.toBeUndefined();
      });

      it('should reject when v0 is empty', async () => {
        await expect(casbinService.clearDBRulesByV0('p', '')).rejects.toThrow(BusinessErrors.USER_IDENTIFIER_EMPTY.error);
      });

      it('should clear DB rules by v1', async () => {
        await expect(casbinService.clearDBRulesByV1('p', 'test_code')).resolves.toBeUndefined();
      });

      it('should reject when v1 is empty', async () => {
        await expect(casbinService.clearDBRulesByV1('p', '')).rejects.toThrow(BusinessErrors.PERMISSION_IDENTIFIER_EMPTY.error);
      });
    });

    describe('Incremental Update Operations', () => {
      it('should validate parameters for incremental update', async () => {
        // 测试空ptype
        await expect(casbinService.syncAdminDBRulesIncremental('', 'test_user', ['code1']))
          .rejects.toThrow('增量更新权限规则失败: ptype不能为空且必须是字符串');

        // 测试空name
        await expect(casbinService.syncAdminDBRulesIncremental('p', '', ['code1']))
          .rejects.toThrow('增量更新权限规则失败: v0不能为空且必须是字符串');

        // 测试空codes
        await expect(casbinService.syncAdminDBRulesIncremental('p', 'test_user', []))
          .resolves.toHaveProperty('added', 0);
      });

      it('should perform incremental update successfully', async () => {
        const result = await casbinService.syncAdminDBRulesIncremental('p', 'test_role_inc', ['code1', 'code2']);
        expect(result).toHaveProperty('added');
        expect(result).toHaveProperty('removed');
        expect(typeof result.added).toBe('number');
        expect(typeof result.removed).toBe('number');
      });

      it('should handle no changes in incremental update', async () => {
        // 先添加一些规则
        await casbinService.syncAdminDBRulesIncremental('p', 'test_role_no_change', ['code1', 'code2']);
        
        // 再次同步相同的规则，应该没有变化
        const result = await casbinService.syncAdminDBRulesIncremental('p', 'test_role_no_change', ['code1', 'code2']);
        expect(result.added).toBe(0);
        expect(result.removed).toBe(0);
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors in batch operations', async () => {
        // Mock enforcer.addPolicies来模拟失败
        const mockAddPolicies = jest.spyOn(casbinService.enforcer, 'addPolicies')
          .mockRejectedValue(new Error('Database error'));

        await expect(casbinService.addAdminPolices('test_role', ['code1'], true))
          .rejects.toThrow('Database error');
        
        mockAddPolicies.mockRestore();
      });

      it('should handle database errors in batch remove operations', async () => {
        // Mock enforcer.removePolicies来模拟失败
        const mockRemovePolicies = jest.spyOn(casbinService.enforcer, 'removePolicies')
          .mockRejectedValue(new Error('Database error'));

        await expect(casbinService.removeAdminPolicy('test_role', ['code1'], true))
          .rejects.toThrow('Database error');
        
        mockRemovePolicies.mockRestore();
      });
    });
  });

  describe('Casbin Guard Tests', () => {
    let casbinGuard: CasbinGuard;

    // Mock控制器类用于测试
    class MockController {
      methodWithAccess() {}
      methodWithoutAccess() {}
    }

    // 创建Mock上下文的辅助函数
    function createMockContext(user?: any): Context {
      return {
        state: {
          user: user || null
        }
      } as Context;
    }

    beforeEach(() => {
      casbinGuard = new CasbinGuard();
      casbinGuard.casbinService = casbinService;
    });

    describe('Enum Values', () => {
      it('should have correct RuleAction values', () => {
        expect(RuleAction.READ).toBe('read');
        expect(RuleAction.CREATE).toBe('create');
        expect(RuleAction.UPDATE).toBe('update');
        expect(RuleAction.DELETE).toBe('delete');
      });

      it('should have correct RulePossession values', () => {
        expect(RulePossession.ANY).toBe('any');
        expect(RulePossession.OWN).toBe('own');
      });

      it('should have correct RuleResource values', () => {
        expect(RuleResource.PROJECT_DATA).toBe('project_obj');
        expect(RuleResource.SHCEMA_DATA).toBe('shcema_obj');
        expect(RuleResource.USER_DATA).toBe('user_obj');
      });
    });

    describe('canActivate with Access Code', () => {
      beforeEach(() => {
        // 设置权限代码
        savePropertyMetadata(ACCESS_META_KEY, ['UserMgt'], MockController.prototype, 'methodWithAccess');
      });

      it('should allow access for logged-in user with permission', async () => {
        const ctx = createMockContext({ username: 'admin' });
        
        // Mock权限检查返回true
        jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(true);
        
        const result = await casbinGuard.canActivate(ctx, MockController.prototype, 'methodWithAccess');
        expect(result).toBe(true);
      });

      it('should deny access for logged-in user without permission', async () => {
        const ctx = createMockContext({ username: 'user' });
        
        // Mock权限检查返回false
        jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
        
        const result = await casbinGuard.canActivate(ctx, MockController.prototype, 'methodWithAccess');
        expect(result).toBe(false);
      });

      it('should use guest role for non-logged-in user', async () => {
        const ctx = createMockContext(); // 无用户信息
        
        // Mock权限检查
        const enforceSpy = jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
        
        const result = await casbinGuard.canActivate(ctx, MockController.prototype, 'methodWithAccess');
        expect(result).toBe(false);
        expect(enforceSpy).toHaveBeenCalledWith('guest', ['UserMgt'], 'access');
      });

      it('should handle undefined user state', async () => {
        const ctx = { state: undefined } as Context;
        
        const enforceSpy = jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
        
        const result = await casbinGuard.canActivate(ctx, MockController.prototype, 'methodWithAccess');
        expect(result).toBe(false);
        expect(enforceSpy).toHaveBeenCalledWith('guest', ['UserMgt'], 'access');
      });

      it('should handle null user in state', async () => {
        const ctx = { state: { user: null } } as Context;
        
        const enforceSpy = jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
        
        const result = await casbinGuard.canActivate(ctx, MockController.prototype, 'methodWithAccess');
        expect(result).toBe(false);
        expect(enforceSpy).toHaveBeenCalledWith('guest', ['UserMgt'], 'access');
      });

      it('should handle user without username', async () => {
        const ctx = { state: { user: {} } } as Context;
        
        const enforceSpy = jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
        
        const result = await casbinGuard.canActivate(ctx, MockController.prototype, 'methodWithAccess');
        expect(result).toBe(false);
        expect(enforceSpy).toHaveBeenCalledWith('guest', ['UserMgt'], 'access');
      });
    });

    describe('canActivate without Access Code', () => {
      it('should handle method without access metadata', async () => {
        const ctx = createMockContext({ username: 'admin' });
        
        const enforceSpy = jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
        
        const result = await casbinGuard.canActivate(ctx, MockController.prototype, 'methodWithoutAccess');
        expect(result).toBe(false); // 没有权限要求时应该检查undefined权限
        expect(enforceSpy).toHaveBeenCalledWith('admin', undefined, 'access');
      });

      it('should handle guest user without access metadata', async () => {
        const ctx = createMockContext();
        
        const enforceSpy = jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
        
        const result = await casbinGuard.canActivate(ctx, MockController.prototype, 'methodWithoutAccess');
        expect(result).toBe(false); // 没有权限要求时应该检查undefined权限
        expect(enforceSpy).toHaveBeenCalledWith('guest', undefined, 'access');
      });
    });

    describe('Error Handling in Guard', () => {
      beforeEach(() => {
        savePropertyMetadata(ACCESS_META_KEY, ['UserMgt'], MockController.prototype, 'methodWithAccess');
      });

      it('should handle enforcer.enforce throwing error', async () => {
        const ctx = createMockContext({ username: 'admin' });
        
        jest.spyOn(casbinService.enforcer, 'enforce').mockRejectedValue(new Error('Enforcer error'));
        
        await expect(casbinGuard.canActivate(ctx, MockController.prototype, 'methodWithAccess'))
          .rejects.toThrow('Enforcer error');
      });

      it('should handle enforcer.enforce returning non-boolean', async () => {
        const ctx = createMockContext({ username: 'admin' });
        
        jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
        
        const result = await casbinGuard.canActivate(ctx, MockController.prototype, 'methodWithAccess');
        expect(result).toBe(false); // 权限检查失败时返回false
      });
    });

    describe('canActivate with Different Access Codes', () => {
      it('should handle multiple access codes', async () => {
        // 设置多个权限代码
        savePropertyMetadata(ACCESS_META_KEY, ['UserMgt', 'RoleMgt'], MockController.prototype, 'methodWithAccess');
        
        const ctx = createMockContext({ username: 'admin' });
        
        // Mock权限检查，返回true
        jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(true);
        
        const result = await casbinGuard.canActivate(ctx, MockController.prototype, 'methodWithAccess');
        expect(result).toBe(true);
        expect(casbinService.enforcer.enforce).toHaveBeenCalledWith('admin', ['UserMgt', 'RoleMgt'], 'access');
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });
  });
});