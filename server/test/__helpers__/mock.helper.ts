/**
 * Mock 数据相关测试工具
 */

import { TestUser, TestRole } from './types';
import { AuthHelper } from './auth.helper';

/**
 * Mock 数据工具类
 */
export class MockHelper {
  /**
   * 创建 Mock 用户数据
   * @param overrides 覆盖属性
   * @returns Mock 用户
   */
  static createMockUser(overrides?: Partial<TestUser>): TestUser {
    const defaultUser: TestUser = {
      id: Math.floor(Math.random() * 10000),
      username: `mock_user_${Date.now()}`,
      password: AuthHelper.encryptPassword('123456'),
      nickName: '模拟用户',
      email: `mock${Date.now()}@example.com`,
      phone: '13800138000',
      system: false,
      roles: []
    };

    return { ...defaultUser, ...overrides };
  }

  /**
   * 创建 Mock 用户列表
   * @param count 用户数量
   * @returns Mock 用户列表
   */
  static createMockUserList(count: number): TestUser[] {
    const users: TestUser[] = [];
    
    for (let i = 0; i < count; i++) {
      users.push(this.createMockUser({
        id: i + 1,
        username: `mock_user_${i + 1}`,
        nickName: `模拟用户${i + 1}`,
        email: `mock_user_${i + 1}@example.com`,
        phone: `1380013800${i.toString().padStart(1, '0')}`
      }));
    }

    return users;
  }

  /**
   * 创建 Mock 角色数据
   * @param overrides 覆盖属性
   * @returns Mock 角色
   */
  static createMockRole(overrides?: Partial<TestRole>): TestRole {
    const defaultRole: TestRole = {
      id: Math.floor(Math.random() * 10000),
      name: `模拟角色_${Date.now()}`,
      code: `mock_role_${Date.now()}`,
      description: '模拟角色描述',
      system: false,
      policys: []
    };

    return { ...defaultRole, ...overrides };
  }

  /**
   * 创建 Mock 角色列表
   * @param count 角色数量
   * @returns Mock 角色列表
   */
  static createMockRoleList(count: number): TestRole[] {
    const roles: TestRole[] = [];
    
    for (let i = 0; i < count; i++) {
      roles.push(this.createMockRole({
        id: i + 1,
        name: `模拟角色${i + 1}`,
        code: `mock_role_${i + 1}`,
        description: `模拟角色${i + 1}的描述`,
        policys: [`policy_${i + 1}`]
      }));
    }

    return roles;
  }

  /**
   * 创建 Mock 菜单树
   * @returns Mock 菜单树
   */
  static createMockMenuTree(): any[] {
    return [
      {
        id: 1,
        name: '系统管理',
        code: 'system',
        type: 'MENU',
        path: '/system',
        icon: 'system',
        order: 1,
        children: [
          {
            id: 2,
            name: '用户管理',
            code: 'system:user',
            type: 'MENU',
            path: '/system/user',
            icon: 'user',
            order: 1,
            parentId: 1,
            children: [
              {
                id: 3,
                name: '用户查询',
                code: 'system:user:query',
                type: 'BUTTON',
                method: 'GET',
                order: 1,
                parentId: 2
              },
              {
                id: 4,
                name: '用户新增',
                code: 'system:user:add',
                type: 'BUTTON',
                method: 'POST',
                order: 2,
                parentId: 2
              }
            ]
          },
          {
            id: 5,
            name: '角色管理',
            code: 'system:role',
            type: 'MENU',
            path: '/system/role',
            icon: 'role',
            order: 2,
            parentId: 1,
            children: [
              {
                id: 6,
                name: '角色查询',
                code: 'system:role:query',
                type: 'BUTTON',
                method: 'GET',
                order: 1,
                parentId: 5
              }
            ]
          }
        ]
      }
    ];
  }

  /**
   * 创建复杂 Mock 菜单树
   * @returns 复杂 Mock 菜单树
   */
  static createComplexMenuTree(): any[] {
    return [
      {
        id: 1,
        name: '系统管理',
        code: 'system',
        type: 'MENU',
        path: '/system',
        icon: 'system',
        order: 1,
        children: [
          {
            id: 2,
            name: '用户管理',
            code: 'system:user',
            type: 'MENU',
            path: '/system/user',
            icon: 'user',
            order: 1,
            parentId: 1,
            children: [
              {
                id: 3,
                name: '用户查询',
                code: 'system:user:query',
                type: 'BUTTON',
                method: 'GET',
                order: 1,
                parentId: 2
              },
              {
                id: 4,
                name: '用户新增',
                code: 'system:user:add',
                type: 'BUTTON',
                method: 'POST',
                order: 2,
                parentId: 2
              },
              {
                id: 5,
                name: '用户编辑',
                code: 'system:user:edit',
                type: 'BUTTON',
                method: 'PUT',
                order: 3,
                parentId: 2
              },
              {
                id: 6,
                name: '用户删除',
                code: 'system:user:delete',
                type: 'BUTTON',
                method: 'DELETE',
                order: 4,
                parentId: 2
              }
            ]
          },
          {
            id: 7,
            name: '角色管理',
            code: 'system:role',
            type: 'MENU',
            path: '/system/role',
            icon: 'role',
            order: 2,
            parentId: 1,
            children: [
              {
                id: 8,
                name: '角色查询',
                code: 'system:role:query',
                type: 'BUTTON',
                method: 'GET',
                order: 1,
                parentId: 7
              },
              {
                id: 9,
                name: '角色新增',
                code: 'system:role:add',
                type: 'BUTTON',
                method: 'POST',
                order: 2,
                parentId: 7
              },
              {
                id: 10,
                name: '角色编辑',
                code: 'system:role:edit',
                type: 'BUTTON',
                method: 'PUT',
                order: 3,
                parentId: 7
              },
              {
                id: 11,
                name: '角色删除',
                code: 'system:role:delete',
                type: 'BUTTON',
                method: 'DELETE',
                order: 4,
                parentId: 7
              }
            ]
          },
          {
            id: 12,
            name: '资源管理',
            code: 'system:resource',
            type: 'MENU',
            path: '/system/resource',
            icon: 'resource',
            order: 3,
            parentId: 1,
            children: [
              {
                id: 13,
                name: '资源查询',
                code: 'system:resource:query',
                type: 'BUTTON',
                method: 'GET',
                order: 1,
                parentId: 12
              },
              {
                id: 14,
                name: '资源新增',
                code: 'system:resource:add',
                type: 'BUTTON',
                method: 'POST',
                order: 2,
                parentId: 12
              }
            ]
          }
        ]
      },
      {
        id: 15,
        name: '业务管理',
        code: 'business',
        type: 'MENU',
        path: '/business',
        icon: 'business',
        order: 2,
        children: [
          {
            id: 16,
            name: '订单管理',
            code: 'business:order',
            type: 'MENU',
            path: '/business/order',
            icon: 'order',
            order: 1,
            parentId: 15,
            children: [
              {
                id: 17,
                name: '订单查询',
                code: 'business:order:query',
                type: 'BUTTON',
                method: 'GET',
                order: 1,
                parentId: 16
              }
            ]
          }
        ]
      }
    ];
  }

  /**
   * 创建 Mock 权限数据
   * @returns Mock 权限列表
   */
  static createMockPermissions(): string[] {
    return [
      'system:user:query',
      'system:user:add',
      'system:user:edit',
      'system:user:delete',
      'system:role:query',
      'system:role:add',
      'system:role:edit',
      'system:role:delete',
      'system:resource:query',
      'system:resource:add',
      'system:resource:edit',
      'system:resource:delete',
      'business:order:query',
      'business:order:add',
      'business:order:edit',
      'business:order:delete'
    ];
  }

  /**
   * 创建 Mock 资源数据
   * @param overrides 覆盖属性
   * @returns Mock 资源
   */
  static createMockResource(overrides?: any): any {
    const defaultResource = {
      id: Math.floor(Math.random() * 10000),
      name: `模拟资源_${Date.now()}`,
      code: `mock_resource_${Date.now()}`,
      type: 'MENU',
      path: `/mock/${Date.now()}`,
      icon: 'mock',
      order: 1,
      show: true,
      enable: true,
      method: 'GET'
    };

    return { ...defaultResource, ...overrides };
  }

  /**
   * 创建 Mock 资源列表
   * @param count 资源数量
   * @returns Mock 资源列表
   */
  static createMockResourceList(count: number): any[] {
    const resources: any[] = [];
    
    for (let i = 0; i < count; i++) {
      resources.push(this.createMockResource({
        id: i + 1,
        name: `模拟资源${i + 1}`,
        code: `mock_resource_${i + 1}`,
        path: `/mock/resource${i + 1}`,
        order: i + 1
      }));
    }

    return resources;
  }

  /**
   * 创建 Mock 分页数据
   * @param records 记录列表
   * @param total 总数
   * @param currentPage 当前页
   * @param pageSize 页大小
   * @returns Mock 分页数据
   */
  static createMockPaginatedData<T>(
    records: T[],
    total?: number,
    currentPage: number = 1,
    pageSize: number = 10
  ): {
    records: T[];
    total: number;
    currentPage: number;
    pageSize: number;
  } {
    return {
      records,
      total: total || records.length,
      currentPage,
      pageSize
    };
  }

  /**
   * 创建 Mock API 响应
   * @param data 响应数据
   * @param code 响应码
   * @param message 响应消息
   * @returns Mock API 响应
   */
  static createMockApiResponse<T>(
    data: T,
    code: number = 0,
    message: string = 'success'
  ): {
    code: number;
    message: string;
    data: T;
  } {
    return {
      code,
      message,
      data
    };
  }

  /**
   * 创建 Mock 错误响应
   * @param code 错误码
   * @param message 错误消息
   * @returns Mock 错误响应
   */
  static createMockErrorResponse(
    code: number = 1,
    message: string = 'error'
  ): {
    code: number;
    message: string;
    data?: null;
  } {
    return {
      code,
      message,
      data: null
    };
  }

  /**
   * 生成随机字符串
   * @param length 长度
   * @returns 随机字符串
   */
  static generateRandomString(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成随机邮箱
   * @param domain 域名
   * @returns 随机邮箱
   */
  static generateRandomEmail(domain: string = 'example.com'): string {
    const username = this.generateRandomString(8).toLowerCase();
    return `${username}@${domain}`;
  }

  /**
   * 生成随机手机号
   * @returns 随机手机号
   */
  static generateRandomPhone(): string {
    const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return prefix + suffix;
  }

  /**
   * 创建 Mock 文件数据
   * @param overrides 覆盖属性
   * @returns Mock 文件
   */
  static createMockFile(overrides?: any): any {
    const defaultFile = {
      id: Math.floor(Math.random() * 10000),
      fileName: `mock_file_${Date.now()}.txt`,
      filePath: `/uploads/mock_file_${Date.now()}.txt`,
      mimeType: 'text/plain',
      size: Math.floor(Math.random() * 1024 * 1024), // 随机大小，最大1MB
      categoryId: 1,
      source: 'local',
      userId: 1,
      remark: '模拟文件'
    };

    return { ...defaultFile, ...overrides };
  }
}