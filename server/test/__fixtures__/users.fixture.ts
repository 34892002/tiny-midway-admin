/**
 * 用户测试数据 Fixtures
 */

import { TestUser } from '../__helpers__/types';

/**
 * 默认测试用户数据
 */
export const DEFAULT_TEST_USERS: TestUser[] = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    nickName: '管理员',
    email: 'admin@example.com',
    phone: '13800138000',
    system: true,
    roles: ['admin']
  },
  {
    id: 2,
    username: 'user',
    password: 'user123',
    nickName: '普通用户',
    email: 'user@example.com',
    phone: '13800138001',
    system: false,
    roles: ['user']
  }
];

/**
 * 测试用户模板
 */
export const TEST_USER_TEMPLATE: Partial<TestUser> = {
  username: 'testuser',
  password: 'test123',
  nickName: '测试用户',
  email: 'test@example.com',
  phone: '13800138888',
  system: false,
  roles: []
};