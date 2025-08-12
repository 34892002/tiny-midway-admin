import { createApp, close } from '@midwayjs/mock';
import { Framework, Application } from '@midwayjs/koa';
import { RoleController } from '../../../src/modules/system/controller/user.controller';
import { UserService } from '../../../src/modules/system/service/user.service';
import { AuthErrors, AdminErrorEnum } from '../../../src/error/admin.error';
import { Context } from '@midwayjs/koa';

/**
 * 用户控制器单元测试
 * 测试用户管理相关的控制器方法
 */
describe('UserController Unit Tests', () => {
  let app: Application;
  let userController: RoleController;
  let userService: UserService;
  let mockContext: Context;

  beforeAll(async () => {
    app = await createApp<Framework>();
  });

  afterAll(async () => {
    await close(app);
  });

  beforeEach(async () => {
    userController = await app.getApplicationContext().getAsync(RoleController);
    userService = await app.getApplicationContext().getAsync(UserService);
    
    // 创建模拟的上下文
    mockContext = {
      state: {
        user: {
          id: 1,
          username: 'testuser',
          system: false
        }
      }
    } as any;
    
    userController.ctx = mockContext;
  });

  describe('page', () => {
    it('应该处理非字符串的sort参数', async () => {
      const mockData = {
        records: [{ id: 1, username: 'test' }],
        total: 1,
        currentPage: 1,
        pageSize: 10
      };
      
      const findAllSpy = jest.spyOn(userService, 'findAll').mockResolvedValue(mockData as any);
      
      const query = {
        sort: { id: 'asc' } as any, // 非字符串sort
        currentPage: 1,
        pageSize: 10
      };
      
      const result = await userController.page(query);
      
      expect(findAllSpy).toHaveBeenCalledWith({}, {
        sort: { id: 'asc' },
        page: 1,
        limit: 10
      });
      expect(result).toEqual(mockData);
      
      findAllSpy.mockRestore();
    });

    it('应该处理模糊查询参数', async () => {
      const mockData = {
        records: [{ id: 1, username: 'test' }],
        total: 1,
        currentPage: 1,
        pageSize: 20
      };
      
      const findAllSpy = jest.spyOn(userService, 'findAll').mockResolvedValue(mockData as any);
      
      const query = {
        username: 'test%',
        nickName: 'user%'
      };
      
      await userController.page(query);
      
      expect(findAllSpy).toHaveBeenCalledWith({
        username: { contains: 'test' },
        nickName: { contains: 'user' }
      }, {
        sort: { id: 'desc' },
        page: 1,
        limit: 20
      });
      
      findAllSpy.mockRestore();
    });
  });

  describe('update', () => {
    it('应该在用户不存在时抛出错误', async () => {
      const safeUserByIdSpy = jest.spyOn(userService, 'safeUserById').mockResolvedValue(null);
      
      await expect(
        userController.update('999', { nickName: 'newname' })
      ).rejects.toThrow();
      
      safeUserByIdSpy.mockRestore();
    });

    it('应该在修改自己信息时返回超时错误', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        system: false
      };
      
      const safeUserByIdSpy = jest.spyOn(userService, 'safeUserById').mockResolvedValue(mockUser as any);
      
      const result = await userController.update('1', { nickName: 'newname' });
      
      expect(result).toEqual(AdminErrorEnum.TIMEOUT_USER_DATA);
      
      safeUserByIdSpy.mockRestore();
    });

    it('应该在非系统用户尝试修改系统用户时返回权限拒绝', async () => {
      const mockSystemUser = {
        id: 2,
        username: 'systemuser',
        system: true
      };
      
      const safeUserByIdSpy = jest.spyOn(userService, 'safeUserById').mockResolvedValue(mockSystemUser as any);
      
      const result = await userController.update('2', { nickName: 'newname' });
      
      expect(result).toEqual(AuthErrors.PERMISSION_DENIED);
      
      safeUserByIdSpy.mockRestore();
    });

    it('应该成功更新用户信息', async () => {
      const mockUser = {
        id: 2,
        username: 'normaluser',
        system: false
      };
      
      const mockUpdateResult = { success: true };
      
      const safeUserByIdSpy = jest.spyOn(userService, 'safeUserById').mockResolvedValue(mockUser as any);
      const updateUserSpy = jest.spyOn(userService, 'updateUser').mockResolvedValue(mockUpdateResult as any);
      
      const result = await userController.update('2', { nickName: 'newname' });
      
      expect(updateUserSpy).toHaveBeenCalledWith(2, { nickName: 'newname' });
      expect(result).toEqual(mockUpdateResult);
      
      safeUserByIdSpy.mockRestore();
      updateUserSpy.mockRestore();
    });
  });

  describe('add', () => {
    it('应该调用userService创建用户', async () => {
      const mockCreateResult = { id: 1, username: 'newuser' };
      const createUserSpy = jest.spyOn(userService, 'createUser').mockResolvedValue(mockCreateResult as any);
      
      const dto = {
        username: 'newuser',
        password: 'password123',
        nickName: '新用户',
        roles: ['user']
      };
      
      const result = await userController.add(dto);
      
      expect(createUserSpy).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockCreateResult);
      
      createUserSpy.mockRestore();
    });
  });

  describe('del', () => {
    it('应该调用userService删除用户', async () => {
      const mockDeleteResult = { success: true };
      const deleteByIdSpy = jest.spyOn(userService, 'deleteById').mockResolvedValue(mockDeleteResult as any);
      
      const result = await userController.del('1');
      
      expect(deleteByIdSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockDeleteResult);
      
      deleteByIdSpy.mockRestore();
    });
  });
});