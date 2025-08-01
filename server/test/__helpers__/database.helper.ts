/**
 * 数据库相关测试工具
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { TestUser, TestRole, TestErrorType, TestError } from './types';
import { AuthHelper } from './auth.helper';

/**
 * 数据库工具类
 */
export class DatabaseHelper {
  private static prismaClient: PrismaClient | null = null;

  /**
   * 获取 Prisma 客户端实例
   */
  static getPrismaClient(): PrismaClient {
    if (!this.prismaClient) {
      this.prismaClient = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL || 'file:./test.db'
          }
        }
      });
    }
    return this.prismaClient;
  }

  /**
   * 设置测试数据库
   */
  static async setupTestDatabase(): Promise<void> {
    try {
      // 确保环境变量正确设置
      if (!process.env.NODE_ENV) {
        process.env.NODE_ENV = 'unittest';
      }
      if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = 'file:./test.db';
      }

      // 连接数据库
      const prisma = this.getPrismaClient();
      await prisma.$connect();
      
      console.log('✅ 测试数据库连接成功');
    } catch (error) {
      throw new TestError(
        TestErrorType.DATABASE_ERROR,
        `Failed to setup test database: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * 清理测试数据库
   */
  static async cleanupTestDatabase(): Promise<void> {
    try {
      if (this.prismaClient) {
        await this.prismaClient.$disconnect();
        this.prismaClient = null;
      }
      console.log('✅ 测试数据库连接已关闭');
    } catch (error) {
      throw new TestError(
        TestErrorType.DATABASE_ERROR,
        `Failed to cleanup test database: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * 重置数据库
   */
  static async resetDatabase(): Promise<void> {
    try {
      // 使用 Prisma CLI 重置数据库
      execSync('npx prisma db push --force-reset', {
        stdio: 'pipe',
        cwd: process.cwd(),
        env: process.env
      });

      // 运行种子数据
      execSync('npx prisma db seed', {
        stdio: 'pipe',
        cwd: process.cwd(),
        env: process.env
      });

      console.log('🔄 数据库已重置');
    } catch (error) {
      throw new TestError(
        TestErrorType.DATABASE_ERROR,
        `Failed to reset database: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * 在事务中执行回调
   * @param callback 回调函数
   * @returns 回调结果
   */
  static async withTransaction<T>(callback: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    const prisma = this.getPrismaClient();
    
    try {
      return await prisma.$transaction(async (tx) => {
        return await callback(tx as PrismaClient);
      });
    } catch (error) {
      throw new TestError(
        TestErrorType.DATABASE_ERROR,
        `Transaction failed: ${error.message}`,
        { error }
      );
    }
  }

  /**
   * 创建测试用户
   * @param userData 用户数据
   * @returns 创建的用户
   */
  static async createTestUser(userData?: Partial<TestUser>): Promise<TestUser> {
    const prisma = this.getPrismaClient();
    
    const defaultUserData = {
      username: `test_user_${Date.now()}`,
      password: AuthHelper.encryptPassword('123456'),
      nickName: '测试用户',
      email: `test${Date.now()}@example.com`,
      system: false,
      roles: []
    };

    const finalUserData = { ...defaultUserData, ...userData };

    try {
      const user = await prisma.user.create({
        data: {
          username: finalUserData.username,
          password: finalUserData.password,
          nickName: finalUserData.nickName,
          email: finalUserData.email,
          system: finalUserData.system
        }
      });

      return {
        id: user.id,
        username: user.username,
        password: user.password,
        nickName: user.nickName,
        email: user.email,
        phone: user.phone,
        system: user.system,
        roles: finalUserData.roles
      };
    } catch (error) {
      throw new TestError(
        TestErrorType.DATABASE_ERROR,
        `Failed to create test user: ${error.message}`,
        { error, userData: finalUserData }
      );
    }
  }

  /**
   * 创建测试角色
   * @param roleData 角色数据
   * @returns 创建的角色
   */
  static async createTestRole(roleData?: Partial<TestRole>): Promise<TestRole> {
    const prisma = this.getPrismaClient();
    
    const defaultRoleData = {
      name: `测试角色_${Date.now()}`,
      code: `test_role_${Date.now()}`,
      description: '测试角色描述',
      system: false,
      policys: []
    };

    const finalRoleData = { ...defaultRoleData, ...roleData };

    try {
      const role = await prisma.role.create({
        data: {
          name: finalRoleData.name,
          code: finalRoleData.code,
          system: finalRoleData.system
        }
      });

      return {
        id: role.id,
        name: role.name,
        code: role.code,
        description: finalRoleData.description, // Keep description in our interface even if not in DB
        system: role.system,
        policys: finalRoleData.policys
      };
    } catch (error) {
      throw new TestError(
        TestErrorType.DATABASE_ERROR,
        `Failed to create test role: ${error.message}`,
        { error, roleData: finalRoleData }
      );
    }
  }

  /**
   * 创建测试资源
   * @param resourceData 资源数据
   * @returns 创建的资源
   */
  static async createTestResource(resourceData?: any): Promise<any> {
    const prisma = this.getPrismaClient();
    
    const defaultResourceData = {
      name: `测试资源_${Date.now()}`,
      code: `test_resource_${Date.now()}`,
      type: 'menu',
      path: `/test/${Date.now()}`,
      method: 'GET'
    };

    const finalResourceData = { ...defaultResourceData, ...resourceData };

    try {
      const resource = await prisma.resource.create({
        data: finalResourceData
      });

      return resource;
    } catch (error) {
      throw new TestError(
        TestErrorType.DATABASE_ERROR,
        `Failed to create test resource: ${error.message}`,
        { error, resourceData: finalResourceData }
      );
    }
  }

  /**
   * 清理测试数据
   * @param patterns 清理模式
   */
  static async cleanupTestData(patterns: string[]): Promise<void> {
    const prisma = this.getPrismaClient();

    try {
      // 清理 Casbin 规则
      if (patterns.includes('casbin') || patterns.includes('all')) {
        await prisma.casbinRule.deleteMany({
          where: {
            OR: [
              { v0: { contains: 'test_' } },
              { v1: { contains: 'test_' } }
            ]
          }
        });
      }

      // 清理用户
      if (patterns.includes('users') || patterns.includes('all')) {
        await prisma.user.deleteMany({
          where: { username: { contains: 'test_' } }
        });
      }

      // 清理角色
      if (patterns.includes('roles') || patterns.includes('all')) {
        await prisma.role.deleteMany({
          where: { code: { contains: 'test_' } }
        });
      }

      // 清理资源
      if (patterns.includes('resources') || patterns.includes('all')) {
        await prisma.resource.deleteMany({
          where: { code: { contains: 'test_' } }
        });
      }

      // 清理文件（需要先删除文件再删除分类）
      if (patterns.includes('files') || patterns.includes('file_categories') || patterns.includes('all')) {
        // 先删除所有测试文件
        await prisma.file.deleteMany({
          where: {
            OR: [
              { fileName: { contains: 'test_' } },
              { filePath: { contains: 'test_' } },
              { remark: { contains: 'test_' } }
            ]
          }
        });
        
        // 再删除测试文件分类（只删除没有关联文件的分类）
        if (patterns.includes('file_categories') || patterns.includes('all')) {
          // 查找没有关联文件的测试分类
          const testCategories = await prisma.fileCategory.findMany({
            where: {
              OR: [
                { name: { contains: 'test_' } },
                { name: { contains: '测试' } }
              ]
            },
            include: {
              files: true
            }
          });
          
          // 只删除没有关联文件的分类
          for (const category of testCategories) {
            if (category.files.length === 0) {
              await prisma.fileCategory.delete({
                where: { id: category.id }
              });
            }
          }
        }
      }

      console.log(`✅ 测试数据已清理: ${patterns.join(', ')}`);
    } catch (error) {
      throw new TestError(
        TestErrorType.DATABASE_ERROR,
        `Failed to cleanup test data: ${error.message}`,
        { error, patterns }
      );
    }
  }

  /**
   * 批量创建测试用户
   * @param count 用户数量
   * @param baseData 基础用户数据
   * @returns 创建的用户列表
   */
  static async createTestUsers(count: number, baseData?: Partial<TestUser>): Promise<TestUser[]> {
    const users: TestUser[] = [];
    
    for (let i = 0; i < count; i++) {
      const userData = {
        username: `test_user_${Date.now()}_${i}`,
        email: `test${Date.now()}_${i}@example.com`,
        nickName: baseData?.nickName || `测试用户${i + 1}`,
        ...baseData
      };
      
      const user = await this.createTestUser(userData);
      users.push(user);
    }

    return users;
  }

  /**
   * 批量创建测试角色
   * @param count 角色数量
   * @param baseData 基础角色数据
   * @returns 创建的角色列表
   */
  static async createTestRoles(count: number, baseData?: Partial<TestRole>): Promise<TestRole[]> {
    const roles: TestRole[] = [];
    
    for (let i = 0; i < count; i++) {
      const roleData = {
        ...baseData,
        name: `测试角色${i + 1}_${Date.now()}`,
        code: `test_role_${Date.now()}_${i}`,
        description: baseData?.description || `测试角色${i + 1}描述`
      };
      
      const role = await this.createTestRole(roleData);
      roles.push(role);
    }

    return roles;
  }

  /**
   * 检查数据库连接状态
   * @returns 连接是否正常
   */
  static async checkConnection(): Promise<boolean> {
    try {
      const prisma = this.getPrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('数据库连接检查失败:', error.message);
      return false;
    }
  }

  /**
   * 获取数据库统计信息
   * @returns 数据库统计信息
   */
  static async getDatabaseStats(): Promise<{
    users: number;
    roles: number;
    resources: number;
    casbinRules: number;
  }> {
    const prisma = this.getPrismaClient();

    try {
      const [users, roles, resources, casbinRules] = await Promise.all([
        prisma.user.count(),
        prisma.role.count(),
        prisma.resource.count(),
        prisma.casbinRule.count()
      ]);

      return { users, roles, resources, casbinRules };
    } catch (error) {
      throw new TestError(
        TestErrorType.DATABASE_ERROR,
        `Failed to get database stats: ${error.message}`,
        { error }
      );
    }
  }
}