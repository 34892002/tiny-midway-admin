import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const main = async () => {
  console.log('Start seeding ...');
  const ADMIN_ROLE_NAME = 'admin_role';
  const GUEST_ROLE_NAME = 'guest_role';
  // 创建内置的超级管理员角色
  await prisma.role.create({
    data: {
      name: '系统管理员',
      code: ADMIN_ROLE_NAME,
      system: true,
    },
  });
  // 默认新建的用户都是来宾角色
  await prisma.role.create({
    data: {
      name: '来宾',
      code: GUEST_ROLE_NAME,
      system: true,
    },
  });
  // 创建内置的超级管理员角色 root
  await prisma.$transaction(async (client) => {
    await client.user.create({
      data: {
        username: 'root',
        nickName: '超级管理员',
        system: true, // 系统内置管理员，不可删除
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
    // 添加角色权限
    await client.casbinRule.create({
      data: {
        ptype: 'g',
        v0: 'root',
        v1: ADMIN_ROLE_NAME,
      },
    });
    await client.casbinRule.create({
      data: {
        ptype: 'g',
        v0: 'admin',
        v1: ADMIN_ROLE_NAME,
      },
    });
  })

  const insertResource = async (data: Prisma.ResourceCreateInput) => {
    return await prisma.resource.create({ data });
  };

  // 插入资源数据
  let parent = await insertResource({
    name: '基础功能',
    code: 'Base',
    type: 'MENU',
    path: null,
    redirect: null,
    icon: 'i-fe:grid',
    component: null,
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 0,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: '图标 Icon',
    code: 'Icon',
    type: 'MENU',
    parent: {
      connect: { id: parent.id },
    },
    path: '/base/icon',
    redirect: null,
    icon: 'i-fe:feather',
    component: '/src/views/base/unocss-icon.vue',
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 0,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: '基础组件',
    code: 'BaseComponents',
    type: 'MENU',
    parent: {
      connect: { id: parent.id },
    },
    path: '/base/components',
    redirect: null,
    icon: 'i-me:awesome',
    component: '/src/views/base/index.vue',
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 1,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: 'Unocss',
    code: 'Unocss',
    type: 'MENU',
    parent: {
      connect: { id: parent.id },
    },
    path: '/base/unocss',
    redirect: null,
    icon: 'i-me:awesome',
    component: '/src/views/base/unocss.vue',
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 2,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: 'KeepAlive',
    code: 'KeepAlive',
    type: 'MENU',
    parent: {
      connect: { id: parent.id },
    },
    path: '/base/keep-alive',
    redirect: null,
    icon: 'i-me:awesome',
    component: '/src/views/base/keep-alive.vue',
    layout: '',
    keepAlive: true,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 3,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: 'MeModal',
    code: 'TestModal',
    type: 'MENU',
    parent: {
      connect: { id: parent.id },
    },
    path: '/testModal',
    redirect: null,
    icon: 'i-me:dialog',
    component: '/src/views/base/test-modal.vue',
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 4,
    createTime: new Date(),
    updateTime: new Date(),
  });

  // 业务示例Demo
  parent = await insertResource({
    name: '业务示例',
    code: 'Demo',
    type: 'MENU',
    path: null,
    redirect: null,
    icon: 'i-fe:grid',
    component: null,
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 1,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: '图片上传',
    code: 'ImgUpload',
    type: 'MENU',
    parent: {
      connect: { id: parent.id },
    },
    path: '/demo/upload',
    redirect: null,
    icon: 'i-fe:image',
    component: '/src/views/demo/upload/index.vue',
    layout: '',
    keepAlive: true,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 0,
    createTime: new Date(),
    updateTime: new Date(),
  });

  let crudItem = await insertResource({
    name: 'CRUD表单',
    code: 'CrudDemo',
    type: 'MENU',
    parent: {
      connect: { id: parent.id },
    },
    path: '/demo/crud',
    redirect: null,
    icon: 'i-fe:database',
    component: '/src/views/demo/crud/index.vue',
    layout: '',
    keepAlive: true,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 0,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: '富文本',
    code: 'DemoRichText',
    type: 'MENU',
    parent: {
      connect: { id: parent.id },
    },
    path: '/demo/rich-text',
    redirect: null,
    icon: 'i-fe:database',
    component: '/src/views/demo/rich-text/index.vue',
    layout: '',
    keepAlive: true,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 0,
    createTime: new Date(),
    updateTime: new Date(),
  });

  // crud例子-权限按钮
  await insertResource({
    name: '添加',
    code: 'demo:crud:add',
    type: 'BUTTON',
    parent: {
      connect: { id: crudItem.id },
    },
    path: null,
    redirect: null,
    icon: null,
    component: null,
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 0,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: '删除',
    code: 'demo:crud:remove',
    type: 'BUTTON',
    parent: {
      connect: { id: crudItem.id },
    },
    path: null,
    redirect: null,
    icon: null,
    component: null,
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 0,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: '查看',
    code: 'demo:crud:view',
    type: 'BUTTON',
    parent: {
      connect: { id: crudItem.id },
    },
    path: null,
    redirect: null,
    icon: null,
    component: null,
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 0,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: '编辑',
    code: 'demo:crud:edit',
    type: 'BUTTON',
    parent: {
      connect: { id: crudItem.id },
    },
    path: null,
    redirect: null,
    icon: null,
    component: null,
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 0,
    createTime: new Date(),
    updateTime: new Date(),
  });

  // 数据管理
  parent = await insertResource({
    name: '数据管理',
    code: 'Data',
    type: 'MENU',
    path: null,
    redirect: null,
    icon: 'i-fe:grid',
    component: null,
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 1,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: '数据字典',
    code: 'DataDict',
    type: 'MENU',
    parent: {
      connect: { id: parent.id },
    },
    path: '/data/dict',
    redirect: null,
    icon: 'i-fe:book',
    component: '/src/views/data/dict/index.vue',
    layout: '',
    keepAlive: true,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 0,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: '文件管理',
    code: 'DataFile',
    type: 'MENU',
    parent: {
      connect: { id: parent.id },
    },
    path: '/data/file',
    redirect: null,
    icon: 'i-fe:file',
    component: '/src/views/data/file/index.vue',
    layout: '',
    keepAlive: true,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 0,
    createTime: new Date(),
    updateTime: new Date(),
  });

  // 系统管理
  parent = await insertResource({
    name: '系统管理',
    code: 'SysMgt',
    type: 'MENU',
    path: null,
    redirect: null,
    icon: 'i-fe:grid',
    component: null,
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 2,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: '资源管理',
    code: 'ResourceMgt',
    type: 'MENU',
    parent: {
      connect: { id: parent.id },
    },
    path: '/system/resource',
    redirect: null,
    icon: 'i-fe:list',
    component: '/src/views/system/resource/index.vue',
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 0,
    createTime: new Date(),
    updateTime: new Date(),
  });

  await insertResource({
    name: '角色管理',
    code: 'RoleMgt',
    type: 'MENU',
    parent: {
      connect: { id: parent.id },
    },
    path: '/system/role',
    redirect: null,
    icon: 'i-fe:user-check',
    component: '/src/views/system/role/index.vue',
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 1,
    createTime: new Date(),
    updateTime: new Date(),
  });

  parent = await insertResource({
    name: '用户管理',
    code: 'UserMgt',
    type: 'MENU',
    parent: {
      connect: { id: parent.id },
    },
    path: '/system/user',
    redirect: null,
    icon: 'i-fe:users',
    component: '/src/views/system/user/index.vue',
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 2,
    createTime: new Date(),
    updateTime: new Date(),
  });

  // 插入个人资料菜单
  await insertResource({
    name: '个人资料',
    code: 'UserProfile',
    type: 'MENU',
    path: '/profile',
    redirect: null,
    icon: 'i-fe:user',
    component: '/src/views/profile/index.vue',
    layout: '',
    keepAlive: null,
    method: null,
    description: null,
    show: false,
    enable: true,
    order: 3,
    createTime: new Date(),
    updateTime: new Date(),
  });

  // 插入casbin_rule数据
  const insertCasbinRule = async (data: Prisma.CasbinRuleCreateInput) => {
    await prisma.casbinRule.create({
      data: { ...data },
    });
  };

  const accessCodes = [
    'Base', 'Icon', 'BaseComponents', 'Unocss', 'KeepAlive', 'TestModal',
    'Demo', 'ImgUpload', 'CrudDemo', 'DemoRichText', 'Data', 'DataDict',
    'DataFile', 'SysMgt', 'ResourceMgt', 'RoleMgt', 'UserMgt', 'UserProfile',
    'demo:crud:add', 'demo:crud:remove', 'demo:crud:edit', 'demo:crud:view',
  ];

  for (const code of accessCodes) {
    await insertCasbinRule({
      ptype: 'p',
      v0: ADMIN_ROLE_NAME,
      v1: code,
      v2: 'access',
      v3: null,
      v4: null,
      v5: null,
    });
  }

  // 插入文件管理
  await prisma.fileCategory.create({
    data: {
      name: '其他',
      system: true
    },
  });

  // 插入字典
  await prisma.dict.create({
    data: {
      name: '性别',
      code: 'gender',
      json: '[{"label":"女","value":0},{"label":"男","value":1}]',
      remark: '0女1男',
      enabled: true
    },
  });

  console.log('insert Demo.');

  // 示例数据
  for (let i = 0; i < 25; i++) {
    await prisma.demo.create({
      data: {
        name: '例子' + i,
        gender: 1,
        desc: '这是一个例子',
        createTime: new Date(),
        updateTime: new Date(),
      }
    });
  }

  console.log('Seeding finished.');
};
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
