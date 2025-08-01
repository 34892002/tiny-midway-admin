/**
 * 角色测试数据 Fixtures
 */

import { TestRole } from '../__helpers__/types';

/**
 * 默认测试角色数据
 */
export const DEFAULT_TEST_ROLES: TestRole[] = [
  {
    id: 1,
    name: '管理员',
    code: 'admin',
    description: '系统管理员角色',
    system: true,
    policys: ['admin:*']
  },
  {
    id: 2,
    name: '普通用户',
    code: 'user',
    description: '普通用户角色',
    system: false,
    policys: ['user:read']
  }
];

/**
 * 测试角色模板
 */
export const TEST_ROLE_TEMPLATE: Partial<TestRole> = {
  name: '测试角色',
  code: 'test_role',
  description: '用于测试的角色',
  system: false,
  policys: []
};