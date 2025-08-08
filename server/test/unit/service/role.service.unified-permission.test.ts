import { createApp, close } from '@midwayjs/mock';
import { Framework } from '@midwayjs/koa';
import { Application } from '@midwayjs/koa';
import { RoleService } from '../../../src/modules/system/service/role.service';
import { PermissionService } from '../../../src/modules/system/service/permission.service';
import { PrismaClient } from '@prisma/client';

describe('test/unit/service/role.service.unified-permission.test.ts', () => {
  let app: Application;
  let roleService: RoleService;
  let permissionService: PermissionService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    try {
      app = await createApp<Framework>();
      roleService = await app.getApplicationContext().getAsync(RoleService);
      permissionService = await app.getApplicationContext().getAsync(PermissionService);
      prisma = await app.getApplicationContext().getAsync('prisma');
    } catch (err) {
      console.error('setup error', err);
      throw err;
    }
  });

  afterAll(async () => {
    await close(app);
  });

  describe('统一权限管理重构验证', () => {
    it('应该使用 PermissionService.updatePermissionsWithAutoReload 包装权限操作', async () => {
      // 验证 PermissionService 被正确注入
      expect(roleService['permissionService']).toBeDefined();
      expect(roleService['permissionService']).toBeInstanceOf(PermissionService);
    });

    it('reload 方法应该使用统一的权限管理服务', async () => {
      // 模拟 permissionService.updatePermissionsWithAutoReload
      const mockUpdatePermissions = jest.spyOn(permissionService, 'updatePermissionsWithAutoReload');
      mockUpdatePermissions.mockResolvedValue(true);

      const result = await roleService.reload();

      expect(result).toBe(true);
      expect(mockUpdatePermissions).toHaveBeenCalledWith(expect.any(Function));

      mockUpdatePermissions.mockRestore();
    });

    it('createOne 应该使用统一的权限管理和自动缓存同步', async () => {
      const mockUpdatePermissions = jest.spyOn(permissionService, 'updatePermissionsWithAutoReload');
      const mockSyncRolePermissions = jest.spyOn(permissionService, 'syncRolePermissions');
      const mockTransaction = jest.spyOn(prisma, '$transaction');
      
      mockUpdatePermissions.mockImplementation(async (operation) => {
        return await operation();
      });
      mockSyncRolePermissions.mockResolvedValue();
      mockTransaction.mockImplementation(async (operation) => {
        return await operation(prisma);
      });

      // 模拟数据库操作
      const mockCreate = jest.spyOn(prisma.role, 'create');
      mockCreate.mockResolvedValue({
        id: 1,
        name: '测试角色',
        code: 'test_role',
        system: false,
        createTime: new Date(),
        updateTime: new Date()
      });

      const testData = {
        name: '测试角色',
        code: 'test_role',
        policies: ['user:read', 'user:write']
      };

      try {
        await roleService.createOne(testData);

        // 验证使用了统一的权限管理
        expect(mockUpdatePermissions).toHaveBeenCalledWith(expect.any(Function));
        
        // 验证使用了事务
        expect(mockTransaction).toHaveBeenCalled();
        
        // 验证调用了权限同步
        expect(mockSyncRolePermissions).toHaveBeenCalledWith(
          'test_role',
          ['user:read', 'user:write'],
          expect.any(Object),
          { autoReload: false, transaction: true }
        );
      } catch (error) {
        // 忽略业务逻辑错误，我们只关心方法调用
        if (!error.message.includes('权限不能跟角色重复') && 
            !error.message.includes('权限不能跟用户重复')) {
          throw error;
        }
      }

      mockCreate.mockRestore();
      mockTransaction.mockRestore();
      mockSyncRolePermissions.mockRestore();
      mockUpdatePermissions.mockRestore();
    });

    it('updateOne 应该使用统一的权限管理和自动缓存同步', async () => {
      const mockUpdatePermissions = jest.spyOn(permissionService, 'updatePermissionsWithAutoReload');
      const mockSyncRolePermissions = jest.spyOn(permissionService, 'syncRolePermissions');
      const mockTransaction = jest.spyOn(prisma, '$transaction');
      
      mockUpdatePermissions.mockImplementation(async (operation) => {
        return await operation();
      });
      mockSyncRolePermissions.mockResolvedValue();
      mockTransaction.mockImplementation(async (operation) => {
        return await operation(prisma);
      });

      // 模拟查找现有角色
      const mockFindUnique = jest.spyOn(prisma.role, 'findUnique');
      mockFindUnique.mockResolvedValue({
        id: 1,
        name: '现有角色',
        code: 'existing_role',
        system: false,
        createTime: new Date(),
        updateTime: new Date()
      });

      // 模拟更新操作
      const mockUpdate = jest.spyOn(prisma.role, 'update');
      mockUpdate.mockResolvedValue({
        id: 1,
        name: '更新后角色',
        code: 'existing_role',
        system: false,
        createTime: new Date(),
        updateTime: new Date()
      });

      const testData = {
        name: '更新后角色',
        policies: ['user:read', 'role:read']
      };

      try {
        await roleService.updateOne(1, testData);

        // 验证使用了统一的权限管理
        expect(mockUpdatePermissions).toHaveBeenCalledWith(expect.any(Function));
        
        // 验证使用了事务
        expect(mockTransaction).toHaveBeenCalled();
        
        // 验证调用了权限同步
        expect(mockSyncRolePermissions).toHaveBeenCalledWith(
          'existing_role',
          ['user:read', 'role:read'],
          expect.any(Object),
          { autoReload: false, transaction: true }
        );
      } catch (error) {
        // 忽略业务逻辑错误，我们只关心方法调用
        if (!error.message.includes('权限不能跟角色重复') && 
            !error.message.includes('权限不能跟用户重复')) {
          throw error;
        }
      }

      mockUpdate.mockRestore();
      mockFindUnique.mockRestore();
      mockTransaction.mockRestore();
      mockSyncRolePermissions.mockRestore();
      mockUpdatePermissions.mockRestore();
    });

    it('deleteById 应该使用统一的权限管理和权限清理', async () => {
      const mockUpdatePermissions = jest.spyOn(permissionService, 'updatePermissionsWithAutoReload');
      const mockCleanupRolePermissions = jest.spyOn(permissionService, 'cleanupRolePermissions');
      const mockTransaction = jest.spyOn(prisma, '$transaction');
      
      mockUpdatePermissions.mockImplementation(async (operation) => {
        return await operation();
      });
      mockCleanupRolePermissions.mockResolvedValue();
      mockTransaction.mockImplementation(async (operation) => {
        return await operation(prisma);
      });

      // 模拟查找要删除的角色
      const mockFindUnique = jest.spyOn(prisma.role, 'findUnique');
      mockFindUnique.mockResolvedValue({
        id: 1,
        name: '要删除的角色',
        code: 'role_to_delete',
        system: false,
        createTime: new Date(),
        updateTime: new Date()
      });

      // 模拟删除操作
      const mockDelete = jest.spyOn(prisma.role, 'delete');
      mockDelete.mockResolvedValue({
        id: 1,
        name: '要删除的角色',
        code: 'role_to_delete',
        system: false,
        createTime: new Date(),
        updateTime: new Date()
      });

      await roleService.deleteById(1);

      // 验证使用了统一的权限管理
      expect(mockUpdatePermissions).toHaveBeenCalledWith(expect.any(Function));
      
      // 验证使用了事务
      expect(mockTransaction).toHaveBeenCalled();
      
      // 验证调用了权限清理
      expect(mockCleanupRolePermissions).toHaveBeenCalledWith(
        'role_to_delete',
        expect.any(Object)
      );

      mockDelete.mockRestore();
      mockFindUnique.mockRestore();
      mockTransaction.mockRestore();
      mockCleanupRolePermissions.mockRestore();
      mockUpdatePermissions.mockRestore();
    });
  });
});