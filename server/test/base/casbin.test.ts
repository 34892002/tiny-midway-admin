import { Framework, Application } from '@midwayjs/koa';
import { createApp, close } from '@midwayjs/mock';
import { CasbinService } from '../../src/modules/base/service/casbin.service';
import { CasbinGuard, RuleAction, RulePossession, RuleResource } from '../../src/guard/casbin';
import { Context } from '@midwayjs/koa';
import { savePropertyMetadata } from '@midwayjs/core';
import { ACCESS_META_KEY } from '../../src/decorator/access';

/**
 * Casbin权限管理服务测试
 * 测试各种权限管理场景和边界情况
 */
describe('Casbin Service Tests', () => {
  process.env.NODE_ENV = 'unittest';
  
  let app: Application;
  let casbinService: CasbinService;

  beforeAll(async () => {
    app = await createApp<Framework>();
    casbinService = await app.getApplicationContext().getAsync(CasbinService);
  });

  afterAll(async () => {
    await close(app);
  });

  /**
   * 测试获取所有角色和策略 - 角色类型
   */
  it('should get all roles from database', async () => {
    const result = await casbinService.getAllRolesAndPlicysByDB('role');
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('role');
    }
  });

  /**
   * 测试获取所有角色和策略 - 策略类型
   */
  it('should get all policies from database', async () => {
    const result = await casbinService.getAllRolesAndPlicysByDB('policy');
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty('role');
      expect(result[0]).toHaveProperty('policy');
    }
  });

  /**
   * 测试权限校验
   */
  it('should check access permission', async () => {
    const result = await casbinService.checkAccess('admin', 'test_resource');
    expect(typeof result).toBe('boolean');
  });

  /**
   * 测试获取管理员策略 - 无参数
   */
  it('should get admin policy without name parameter', async () => {
    const result = await casbinService.getAdminPlocy();
    expect(Array.isArray(result)).toBe(true);
  });

  /**
   * 测试获取管理员策略 - 指定角色名
   */
  it('should get admin policy with specific role name', async () => {
    const result = await casbinService.getAdminPlocy('SUPER_ADMIN');
    expect(result === undefined || Array.isArray(result)).toBe(true);
  });

  /**
   * 测试获取管理员组 - 无参数
   */
  it('should get admin group without name parameter', async () => {
    const result = await casbinService.getAdminGroup();
    expect(Array.isArray(result)).toBe(true);
  });

  /**
   * 测试获取管理员组 - 指定用户名
   */
  it('should get admin group with specific username', async () => {
    const result = await casbinService.getAdminGroup('admin');
    expect(result === undefined || Array.isArray(result)).toBe(true);
  });

  /**
   * 测试添加管理员策略 - 正常情况
   */
  it('should add admin policies successfully', async () => {
    const result = await casbinService.addAdminPolices('TEST_ROLE', ['test_code1', 'test_code2'], false);
    expect(typeof result).toBe('boolean');
  });

  /**
   * 测试添加管理员策略 - 空角色
   */
  it('should reject when role is empty', async () => {
    await expect(casbinService.addAdminPolices('', ['test_code'])).rejects.toMatch('角色不能为空');
  });

  /**
   * 测试添加管理员策略 - 空权限列表
   */
  it('should return true when codes array is empty', async () => {
    const result = await casbinService.addAdminPolices('TEST_ROLE', []);
    expect(result).toBe(true);
  });

  /**
   * 测试添加管理员角色 - 正常情况
   */
  it('should add admin role successfully', async () => {
    const result = await casbinService.addAdminRole('test_user', ['TEST_ROLE'], false);
    expect(result).toBeUndefined();
  });

  /**
   * 测试添加管理员角色 - 空用户名
   */
  it('should reject when username is empty', async () => {
    await expect(casbinService.addAdminRole('', ['TEST_ROLE'])).rejects.toMatch('用户名不能为空');
  });

  /**
   * 测试添加管理员角色 - 空角色列表
   */
  it('should return true when roles array is empty', async () => {
    const result = await casbinService.addAdminRole('test_user', []);
    expect(result).toBe(true);
  });

  /**
   * 测试移除管理员角色 - 正常情况
   */
  it('should remove admin role successfully', async () => {
    const result = await casbinService.removeAdminRole('test_user', ['TEST_ROLE'], false);
    expect(result).toBeUndefined();
  });

  /**
   * 测试移除管理员角色 - 空用户名
   */
  it('should reject when username is empty for remove', async () => {
    await expect(casbinService.removeAdminRole('', ['TEST_ROLE'])).rejects.toMatch('用户名不能为空');
  });

  /**
   * 测试移除管理员角色 - 空角色列表
   */
  it('should return true when removing empty roles array', async () => {
    const result = await casbinService.removeAdminRole('test_user', []);
    expect(result).toBe(true);
  });

  /**
   * 测试移除管理员策略 - 正常情况
   */
  it('should remove admin policy successfully', async () => {
    const result = await casbinService.removeAdminPolicy('TEST_ROLE', ['test_code1'], false);
    expect(result).toBeUndefined();
  });

  /**
   * 测试移除管理员策略 - 空角色
   */
  it('should reject when role is empty for remove policy', async () => {
    await expect(casbinService.removeAdminPolicy('', ['test_code'])).rejects.toMatch('角色不能为空');
  });

  /**
   * 测试移除管理员策略 - 空权限列表
   */
  it('should return true when removing empty codes array', async () => {
    const result = await casbinService.removeAdminPolicy('TEST_ROLE', []);
    expect(result).toBe(true);
  });

  /**
   * 测试角色差异比较
   */
  it('should diff admin roles correctly', async () => {
    const result = await casbinService.diffAdminRole('admin', ['SUPER_ADMIN', 'NEW_ROLE']);
    expect(result).toHaveProperty('addRoles');
    expect(result).toHaveProperty('removeRoles');
    expect(Array.isArray(result.addRoles)).toBe(true);
    expect(Array.isArray(result.removeRoles)).toBe(true);
  });

  /**
   * 测试策略差异比较
   */
  it('should diff admin policies correctly', async () => {
    const result = await casbinService.diffAdminPolicy('SUPER_ADMIN', ['new_code1', 'new_code2']);
    expect(result).toHaveProperty('addCodes');
    expect(result).toHaveProperty('removeCodes');
    expect(Array.isArray(result.addCodes)).toBe(true);
    expect(Array.isArray(result.removeCodes)).toBe(true);
  });

  /**
   * 测试同步管理员角色 - 无变化
   */
  it('should return true when no role changes needed', async () => {
    // 先获取当前角色
    const currentRoles = await casbinService.getAdminGroup('admin');
    if (currentRoles && currentRoles.length > 0) {
      const result = await casbinService.syncAdminRoleAndSave('admin', currentRoles, false);
      expect(result).toBe(true);
    }
  });

  /**
   * 测试同步管理员策略 - 无变化
   */
  it('should return true when no policy changes needed', async () => {
    // 先获取当前策略
    const currentPolicies = await casbinService.getAdminPlocy('SUPER_ADMIN');
    if (currentPolicies && currentPolicies.length > 0) {
      const result = await casbinService.syncAdminPolicyAndSave('SUPER_ADMIN', currentPolicies, false);
      expect(result).toBe(true);
    }
  });

  /**
   * 测试清除数据库规则 - 按v0
   */
  it('should clear DB rules by v0', async () => {
    await expect(casbinService.clearDBRulesByV0('p', 'test_role')).resolves.toBeUndefined();
  });

  /**
   * 测试清除数据库规则 - v0为空
   */
  it('should reject when v0 is empty', async () => {
    await expect(casbinService.clearDBRulesByV0('p', '')).rejects.toMatch('name标识不能为空');
  });

  /**
   * 测试清除数据库规则 - 按v1
   */
  it('should clear DB rules by v1', async () => {
    await expect(casbinService.clearDBRulesByV1('p', 'test_code')).resolves.toBeUndefined();
  });

  /**
   * 测试清除数据库规则 - v1为空
   */
  it('should reject when v1 is empty', async () => {
    await expect(casbinService.clearDBRulesByV1('p', '')).rejects.toMatch('code标识不能为空');
  });

  /**
   * 测试增量更新权限规则 - 参数验证错误
   */
  it('should validate parameters for incremental update', async () => {
    // 测试空ptype
    await expect(casbinService.syncAdminDBRulesIncremental('', 'test_user', ['code1']))
      .rejects.toThrow('ptype不能为空且必须是字符串');

    // 测试空v0
    await expect(casbinService.syncAdminDBRulesIncremental('p', '', ['code1']))
      .rejects.toThrow('v0不能为空且必须是字符串');

    // 测试无效ptype
    await expect(casbinService.syncAdminDBRulesIncremental('invalid', 'test_user', ['code1']))
      .rejects.toThrow('ptype必须是以下值之一: p, g');

    // 测试非数组newV1List
    await expect(casbinService.syncAdminDBRulesIncremental('p', 'test_user', 'not_array' as any))
      .rejects.toThrow('newV1List必须是数组');

    // 测试包含空字符串的newV1List
    await expect(casbinService.syncAdminDBRulesIncremental('p', 'test_user', ['code1', '']))
      .rejects.toThrow('newV1List[1]不能为空且必须是字符串');

    // 测试包含重复项的newV1List
    await expect(casbinService.syncAdminDBRulesIncremental('p', 'test_user', ['code1', 'code1']))
      .rejects.toThrow('newV1List中不能包含重复项');
  });

  /**
   * 测试增量更新权限规则 - 正常情况
   */
  it('should perform incremental update successfully', async () => {
    const result = await casbinService.syncAdminDBRulesIncremental('p', 'test_role_inc', ['code1', 'code2']);
    expect(result).toHaveProperty('added');
    expect(result).toHaveProperty('removed');
    expect(result).toHaveProperty('unchanged');
    expect(typeof result.added).toBe('number');
    expect(typeof result.removed).toBe('number');
    expect(typeof result.unchanged).toBe('number');
  });

  /**
   * 测试增量更新权限规则 - 无变化情况
   */
  it('should handle no changes in incremental update', async () => {
    // 先添加一些规则
    await casbinService.syncAdminDBRulesIncremental('p', 'test_role_no_change', ['code1', 'code2']);
    
    // 再次使用相同的规则，应该无变化
    const result = await casbinService.syncAdminDBRulesIncremental('p', 'test_role_no_change', ['code1', 'code2']);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.unchanged).toBe(2);
  });

  /**
   * 测试数据库操作错误处理
   */
  it('should handle database errors in batch operations', async () => {
    // Mock $transaction方法来模拟事务执行失败
    const mockTransaction = jest.spyOn(casbinService.prismaClient, '$transaction')
      .mockRejectedValue(new Error('Database transaction error'));

    await expect(casbinService.syncAdminDBRulesIncremental('p', 'test_error', ['code1']))
      .rejects.toThrow('增量更新权限规则失败');

    mockTransaction.mockRestore();
  });

  /**
   * 测试批量删除操作的数据库错误
   */
  it('should handle database errors in batch remove operations', async () => {
    // Mock $transaction来模拟事务内部操作失败
    const mockTransaction = jest.spyOn(casbinService.prismaClient, '$transaction')
      .mockImplementation(async (callback) => {
        // 创建一个简化的mock事务对象
        const mockTx = {
          casbinRule: {
            findMany: jest.fn().mockResolvedValue([{ v1: 'existing_code' }]),
            deleteMany: jest.fn().mockRejectedValue(new Error('Delete operation failed')),
            createMany: jest.fn().mockResolvedValue({ count: 0 })
          }
        } as any;
        
        try {
          return await callback(mockTx);
        } catch (error) {
          throw new Error('事务执行失败: ' + error.message);
        }
      });

    await expect(casbinService.syncAdminDBRulesIncremental('p', 'test_error', ['new_code']))
      .rejects.toThrow('增量更新权限规则失败');

    mockTransaction.mockRestore();
  });

  /**
   * 测试同步加载和保存
   */
  it('should sync admin load and save', async () => {
    const result = await casbinService.syncAdminLoadAndSave('test_user', ['TEST_ROLE'], 'TEST_ROLE', ['test_code']);
    expect(typeof result).toBe('boolean');
  });
});

/**
 * CasbinGuard 权限守卫测试
 * 测试权限守卫的各种场景和边界情况
 */
describe('CasbinGuard Tests', () => {
  process.env.NODE_ENV = 'unittest';
  
  let app: Application;
  let casbinService: CasbinService;
  let casbinGuard: CasbinGuard;

  beforeAll(async () => {
    app = await createApp<Framework>();
    casbinService = await app.getApplicationContext().getAsync(CasbinService);
    casbinGuard = await app.getApplicationContext().getAsync(CasbinGuard);
  });

  afterAll(async () => {
    await close(app);
  });

  /**
   * 创建模拟的控制器类和方法
   */
  class MockController {
    mockMethod() {}
    methodWithAccess() {}
    methodWithoutAccess() {}
  }

  /**
   * 创建模拟的上下文对象
   */
  function createMockContext(user?: { username: string }): Context {
    return {
      state: user ? { user } : {},
    } as Context;
  }

  /**
   * 测试枚举值的正确性
   */
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
      expect(RulePossession['ANY|OWN']).toBe('any|own');
    });

    it('should have correct RuleResource values', () => {
      expect(RuleResource.PROJECT_DATA).toBe('project_obj');
      expect(RuleResource.SHCEMA_DATA).toBe('shcema_obj');
      expect(RuleResource.USER_DATA).toBe('user_obj');
      expect(RuleResource.COMMON_DATA).toBe('common_obj');
    });
  });

  /**
   * 测试 canActivate 方法 - 有权限代码的情况
   */
  describe('canActivate with Access Code', () => {
    beforeEach(() => {
      // 为测试方法设置权限代码
      savePropertyMetadata(ACCESS_META_KEY, 'UserMgt', MockController.prototype, 'methodWithAccess');
    });

    it('should allow access for logged-in user with permission', async () => {
      const ctx = createMockContext({ username: 'admin' });
      
      // Mock enforcer.enforce 返回 true
      jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(true);
      
      const result = await casbinGuard.canActivate(ctx, MockController, 'methodWithAccess');
      
      expect(result).toBe(true);
      expect(casbinService.enforcer.enforce).toHaveBeenCalledWith('admin', 'UserMgt', 'access');
    });

    it('should deny access for logged-in user without permission', async () => {
      const ctx = createMockContext({ username: 'user' });
      
      // Mock enforcer.enforce 返回 false
      jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
      
      const result = await casbinGuard.canActivate(ctx, MockController, 'methodWithAccess');
      
      expect(result).toBe(false);
      expect(casbinService.enforcer.enforce).toHaveBeenCalledWith('user', 'UserMgt', 'access');
    });

    it('should use guest role for non-logged-in user', async () => {
      const ctx = createMockContext(); // 无用户信息
      
      // Mock enforcer.enforce 返回 false
      jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
      
      const result = await casbinGuard.canActivate(ctx, MockController, 'methodWithAccess');
      
      expect(result).toBe(false);
      expect(casbinService.enforcer.enforce).toHaveBeenCalledWith('guest', 'UserMgt', 'access');
    });

    it('should handle undefined user state', async () => {
      const ctx = { state: undefined } as Context;
      
      // Mock enforcer.enforce 返回 false
      jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
      
      const result = await casbinGuard.canActivate(ctx, MockController, 'methodWithAccess');
      
      expect(result).toBe(false);
      expect(casbinService.enforcer.enforce).toHaveBeenCalledWith('guest', 'UserMgt', 'access');
    });

    it('should handle null user in state', async () => {
      const ctx = { state: { user: null } } as Context;
      
      // Mock enforcer.enforce 返回 false
      jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
      
      const result = await casbinGuard.canActivate(ctx, MockController, 'methodWithAccess');
      
      expect(result).toBe(false);
      expect(casbinService.enforcer.enforce).toHaveBeenCalledWith('guest', 'UserMgt', 'access');
    });

    it('should handle user without username', async () => {
      const ctx = { state: { user: {} } } as Context;
      
      // Mock enforcer.enforce 返回 false
      jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
      
      const result = await casbinGuard.canActivate(ctx, MockController, 'methodWithAccess');
      
      expect(result).toBe(false);
      expect(casbinService.enforcer.enforce).toHaveBeenCalledWith('guest', 'UserMgt', 'access');
    });
  });

  /**
   * 测试 canActivate 方法 - 无权限代码的情况
   */
  describe('canActivate without Access Code', () => {
    it('should handle method without access metadata', async () => {
      const ctx = createMockContext({ username: 'admin' });
      
      // Mock enforcer.enforce 返回 false
      jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
      
      const result = await casbinGuard.canActivate(ctx, MockController, 'methodWithoutAccess');
      
      expect(result).toBe(false);
      expect(casbinService.enforcer.enforce).toHaveBeenCalledWith('admin', undefined, 'access');
    });

    it('should handle guest user without access metadata', async () => {
      const ctx = createMockContext();
      
      // Mock enforcer.enforce 返回 false
      jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
      
      const result = await casbinGuard.canActivate(ctx, MockController, 'methodWithoutAccess');
      
      expect(result).toBe(false);
      expect(casbinService.enforcer.enforce).toHaveBeenCalledWith('guest', undefined, 'access');
    });
  });

  /**
   * 测试 canActivate 方法 - 异常处理
   */
  describe('canActivate Error Handling', () => {
    beforeEach(() => {
      savePropertyMetadata(ACCESS_META_KEY, 'TestCode', MockController.prototype, 'methodWithAccess');
    });

    it('should handle enforcer.enforce throwing error', async () => {
      const ctx = createMockContext({ username: 'admin' });
      
      // Mock enforcer.enforce 抛出异常
      jest.spyOn(casbinService.enforcer, 'enforce').mockRejectedValue(new Error('Enforcer error'));
      
      await expect(casbinGuard.canActivate(ctx, MockController, 'methodWithAccess'))
        .rejects.toThrow('Enforcer error');
    });

    it('should handle enforcer.enforce returning non-boolean', async () => {
      const ctx = createMockContext({ username: 'admin' });
      
      // Mock enforcer.enforce 返回非布尔值
      jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue('true' as any);
      
      const result = await casbinGuard.canActivate(ctx, MockController, 'methodWithAccess');
      
      expect(result).toBe('true');
    });
  });

  /**
   * 测试不同权限代码的情况
   */
  describe('canActivate with Different Access Codes', () => {
    it('should handle multiple access codes', async () => {
      // 设置多个权限代码
      savePropertyMetadata(ACCESS_META_KEY, ['UserMgt', 'RoleMgt'], MockController.prototype, 'methodWithAccess');
      
      const ctx = createMockContext({ username: 'admin' });
      
      // Mock enforcer.enforce 返回 true
      jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(true);
      
      const result = await casbinGuard.canActivate(ctx, MockController, 'methodWithAccess');
      
      expect(result).toBe(true);
      expect(casbinService.enforcer.enforce).toHaveBeenCalledWith('admin', ['UserMgt', 'RoleMgt'], 'access');
    });

    it('should handle empty string access code', async () => {
      savePropertyMetadata(ACCESS_META_KEY, '', MockController.prototype, 'methodWithAccess');
      
      const ctx = createMockContext({ username: 'admin' });
      
      // Mock enforcer.enforce 返回 false
      jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
      
      const result = await casbinGuard.canActivate(ctx, MockController, 'methodWithAccess');
      
      expect(result).toBe(false);
      expect(casbinService.enforcer.enforce).toHaveBeenCalledWith('admin', '', 'access');
    });

    it('should handle null access code', async () => {
      savePropertyMetadata(ACCESS_META_KEY, null, MockController.prototype, 'methodWithAccess');
      
      const ctx = createMockContext({ username: 'admin' });
      
      // Mock enforcer.enforce 返回 false
      jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(false);
      
      const result = await casbinGuard.canActivate(ctx, MockController, 'methodWithAccess');
      
      expect(result).toBe(false);
      expect(casbinService.enforcer.enforce).toHaveBeenCalledWith('admin', null, 'access');
    });
  });

  /**
   * 清理测试后的 mock
   */
  afterEach(() => {
    jest.restoreAllMocks();
  });
});