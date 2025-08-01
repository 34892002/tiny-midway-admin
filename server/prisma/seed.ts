import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 角色常量定义
const ADMIN_ROLE_NAME = 'admin_role';      // 超级管理员，root最高权限，用于系统维护
const BUSINESS_ROLE_NAME = 'business_role'; // 管理员权限，用于交付
const GUEST_ROLE_NAME = 'guest_role';       // 来宾，最小权限

/**
 * 创建资源的默认配置
 * @returns 资源默认配置对象
 */
const createDefaultResourceConfig = () => ({
  redirect: null,
  layout: '',
  keepAlive: null,
  method: null,
  description: null,
  show: true,
  enable: true,
  createTime: new Date(),
  updateTime: new Date(),
});

/**
 * 菜单配置数据
 */
const MENU_CONFIG = {
  base: {
    name: '基础功能',
    code: 'Base',
    type: 'MENU',
    path: null,
    icon: 'i-fe:grid',
    component: null,
    order: 0,
    children: [
      {
        name: '图标 Icon',
        code: 'Icon',
        type: 'MENU',
        path: '/base/icon',
        icon: 'i-fe:feather',
        component: '/src/views/base/unocss-icon.vue',
        order: 0,
      },
      {
        name: '基础组件',
        code: 'BaseComponents',
        type: 'MENU',
        path: '/base/components',
        icon: 'i-me:awesome',
        component: '/src/views/base/index.vue',
        order: 1,
      },
      {
        name: 'Unocss',
        code: 'Unocss',
        type: 'MENU',
        path: '/base/unocss',
        icon: 'i-me:awesome',
        component: '/src/views/base/unocss.vue',
        order: 2,
      },
      {
        name: 'KeepAlive',
        code: 'KeepAlive',
        type: 'MENU',
        path: '/base/keep-alive',
        icon: 'i-me:awesome',
        component: '/src/views/base/keep-alive.vue',
        keepAlive: true,
        order: 3,
      },
      {
        name: 'MeModal',
        code: 'TestModal',
        type: 'MENU',
        path: '/testModal',
        icon: 'i-me:dialog',
        component: '/src/views/base/test-modal.vue',
        order: 4,
      },
    ],
  },
  demo: {
    name: '业务示例',
    code: 'Demo',
    type: 'MENU',
    path: null,
    icon: 'i-fe:grid',
    component: null,
    order: 1,
    children: [
      {
        name: '图片上传',
        code: 'ImgUpload',
        type: 'MENU',
        path: '/demo/upload',
        icon: 'i-fe:image',
        component: '/src/views/demo/upload/index.vue',
        keepAlive: true,
        order: 0,
      },
      {
        name: 'CRUD表单',
        code: 'CrudDemo',
        type: 'MENU',
        path: '/demo/crud',
        icon: 'i-fe:database',
        component: '/src/views/demo/crud/index.vue',
        keepAlive: true,
        order: 1,
        children: [
          { name: '添加', code: 'demo:crud:add', type: 'BUTTON', order: 0 },
          { name: '删除', code: 'demo:crud:remove', type: 'BUTTON', order: 1 },
          { name: '查看', code: 'demo:crud:view', type: 'BUTTON', order: 2 },
          { name: '编辑', code: 'demo:crud:edit', type: 'BUTTON', order: 3 },
        ],
      },
      {
        name: '富文本',
        code: 'DemoRichText',
        type: 'MENU',
        path: '/demo/rich-text',
        icon: 'i-fe:database',
        component: '/src/views/demo/rich-text/index.vue',
        keepAlive: true,
        order: 2,
      },
    ],
  },
  data: {
    name: '数据管理',
    code: 'Data',
    type: 'MENU',
    path: null,
    icon: 'i-fe:grid',
    component: null,
    order: 2,
    children: [
      {
        name: '数据字典',
        code: 'DataDict',
        type: 'MENU',
        path: '/data/dict',
        icon: 'i-fe:book',
        component: '/src/views/data/dict/index.vue',
        keepAlive: true,
        order: 0,
      },
      {
        name: '文件管理',
        code: 'DataFile',
        type: 'MENU',
        path: '/data/file',
        icon: 'i-fe:file',
        component: '/src/views/data/file/index.vue',
        keepAlive: true,
        order: 1,
      },
    ],
  },
  system: {
    name: '系统管理',
    code: 'SysMgt',
    type: 'MENU',
    path: null,
    icon: 'i-fe:grid',
    component: null,
    order: 3,
    children: [
      {
        name: '资源管理',
        code: 'ResourceMgt',
        type: 'MENU',
        path: '/system/resource',
        icon: 'i-fe:list',
        component: '/src/views/system/resource/index.vue',
        order: 0,
      },
      {
        name: '角色管理',
        code: 'RoleMgt',
        type: 'MENU',
        path: '/system/role',
        icon: 'i-fe:user-check',
        component: '/src/views/system/role/index.vue',
        order: 1,
      },
      {
        name: '用户管理',
        code: 'UserMgt',
        type: 'MENU',
        path: '/system/user',
        icon: 'i-fe:users',
        component: '/src/views/system/user/index.vue',
        order: 2,
      },
    ],
  },
  profile: {
    name: '个人资料',
    code: 'UserProfile',
    type: 'MENU',
    path: '/profile',
    icon: 'i-fe:user',
    component: '/src/views/profile/index.vue',
    show: false,
    order: 4,
  },
};

/**
 * 权限配置
 * 注意：ADMIN_ROLE_NAME（超级管理员）拥有最高权限，不需要配置具体权限代码
 */
const PERMISSION_CONFIG = {
  // 业务管理员权限（包含系统管理权限）
  [BUSINESS_ROLE_NAME]: [
    // 基础功能
    'Base', 'Icon', 'BaseComponents', 'Unocss', 'KeepAlive', 'TestModal',
    // 业务示例
    'Demo', 'ImgUpload', 'CrudDemo', 'DemoRichText',
    // CRUD组件接口、按钮级权限，采用 [模块:页面:操作] 命名约定
    // 这样可以实现细粒度权限控制，精确到每个功能按钮
    'demo:crud:add', 'demo:crud:remove', 'demo:crud:edit', 'demo:crud:view',
    // 数据管理
    'Data', 'DataDict', 'DataFile',
    // 系统管理
    'SysMgt', 'ResourceMgt', 'RoleMgt', 'UserMgt',
    // 个人资料
    'UserProfile',
  ],
  [GUEST_ROLE_NAME]: [
    'Base', 'Icon', 'BaseComponents', 'Unocss', 'KeepAlive', 'TestModal',
    'UserProfile',
  ],
};

/**
 * 创建系统角色
 */
const createSystemRoles = async () => {
  const roles = [
    { name: '超级管理员', code: ADMIN_ROLE_NAME },
    { name: '管理员', code: BUSINESS_ROLE_NAME },
    { name: '来宾', code: GUEST_ROLE_NAME },
  ];

  for (const role of roles) {
    await prisma.role.create({
      data: { ...role, system: true },
    });
  }
};

/**
 * 创建系统用户
 */
const createSystemUsers = async () => {
  await prisma.$transaction(async (client) => {
    // 创建用户
    await client.user.create({
      data: {
        username: 'root',
        nickName: '超级管理员',
        system: true,
        password: '$2b$10$dWS9VrIbCuXhn2faiukhWeXSyD0vS6Fn62GCxq8HHHrt0sOGKguzq',
      },
    });
    
    await client.user.create({
      data: {
        username: 'admin',
        nickName: '管理员',
        password: '$2b$10$dWS9VrIbCuXhn2faiukhWeXSyD0vS6Fn62GCxq8HHHrt0sOGKguzq',
      },
    });

    // 分配角色
    await client.casbinRule.createMany({
      data: [
        { ptype: 'g', v0: 'root', v1: ADMIN_ROLE_NAME },
        { ptype: 'g', v0: 'admin', v1: BUSINESS_ROLE_NAME },
      ],
    });
  });
};

/**
 * 递归创建菜单资源
 * @param menuItem 菜单项配置
 * @param parentId 父级菜单ID
 * @returns 创建的资源对象
 */
const createMenuResource = async (menuItem: any, parentId?: number) => {
  const resourceData = {
    ...createDefaultResourceConfig(),
    ...menuItem,
    parent: parentId ? { connect: { id: parentId } } : undefined,
  };
  
  // 移除children字段，因为Prisma不需要这个字段
  delete resourceData.children;
  
  const resource = await prisma.resource.create({ data: resourceData });
  
  // 如果有子菜单，递归创建
  if (menuItem.children) {
    for (const child of menuItem.children) {
      await createMenuResource(child, resource.id);
    }
  }
  
  return resource;
};

/**
 * 创建所有菜单资源
 */
const createMenuResources = async () => {
  for (const menuKey of Object.keys(MENU_CONFIG)) {
    const menuItem = MENU_CONFIG[menuKey];
    await createMenuResource(menuItem);
  }
};

/**
 * 分配权限
 */
const assignPermissions = async () => {
  for (const [roleName, permissions] of Object.entries(PERMISSION_CONFIG)) {
    const casbinRules = permissions.map(code => ({
      ptype: 'p',
      v0: roleName,
      v1: code,
      v2: 'access',
      v3: null,
      v4: null,
      v5: null,
    }));

    await prisma.casbinRule.createMany({ data: casbinRules });
  }
};

/**
 * 创建基础数据
 */
const createBasicData = async () => {
  // 插入文件管理分类
  await prisma.fileCategory.create({
    data: {
      name: '其他',
      system: true
    },
  });

  // 插入数据字典
  await prisma.dict.create({
    data: {
      name: '性别',
      code: 'gender',
      json: '[{"label":"女","value":0},{"label":"男","value":1}]',
      remark: '0女1男',
      enabled: true
    },
  });

  // 创建示例数据
  const demoData = [];
  for (let i = 0; i < 25; i++) {
    demoData.push({
      name: '例子' + i,
      gender: 1,
      desc: '这是一个例子',
      createTime: new Date(),
      updateTime: new Date(),
    });
  }
  
  await prisma.demo.createMany({ data: demoData });
};

const main = async () => {
  console.log('🚀 开始初始化数据...');
  
  try {
    // 1. 创建系统角色
    console.log('📝 创建系统角色...');
    await createSystemRoles();
    
    // 2. 创建系统用户
    console.log('👤 创建系统用户...');
    await createSystemUsers();
    
    // 3. 创建菜单资源
    console.log('🗂️ 创建菜单资源...');
    await createMenuResources();
    
    // 4. 分配权限
    console.log('🔐 分配权限...');
    await assignPermissions();
    
    // 5. 创建基础数据
    console.log('📊 创建基础数据...');
    await createBasicData();
    
    console.log('✅ 数据初始化完成！');
  } catch (error) {
    console.error('❌ 数据初始化失败:', error);
    throw error;
  }
};

main()
  .then(async () => {
    console.log('🎉 所有操作完成，正在断开数据库连接...');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('💥 执行过程中发生错误:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
