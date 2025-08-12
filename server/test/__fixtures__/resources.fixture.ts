/**
 * 资源测试数据 Fixtures
 */

/**
 * 默认测试资源数据
 */
export const DEFAULT_TEST_RESOURCES = [
  {
    id: 1,
    name: '用户管理',
    code: 'user_management',
    type: 'menu',
    parentId: null,
    path: '/user',
    component: 'UserManagement'
  },
  {
    id: 2,
    name: '角色管理',
    code: 'role_management',
    type: 'menu',
    parentId: null,
    path: '/role',
    component: 'RoleManagement'
  }
];

/**
 * 测试资源模板
 */
export const TEST_RESOURCE_TEMPLATE = {
  name: '测试资源',
  code: 'test_resource',
  type: 'menu',
  parentId: null,
  path: '/test',
  component: 'TestComponent'
};