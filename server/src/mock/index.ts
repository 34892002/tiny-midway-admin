export const userInfo = {
  id: 1,
  username: 'admin',
  enable: true,
  createTime: '2023-11-18T08:18:59.150Z',
  updateTime: '2023-11-18T08:18:59.150Z',
  profile: {
    id: 1,
    nickName: 'Admin',
    gender: null,
    avatar:
      'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif?imageView2/1/w/80/h/80',
    address: null,
    email: null,
    userId: 1,
  },
  roles: [
    {
      id: 1,
      code: 'SUPER_ADMIN',
      name: '超级管理员',
      enable: true,
    },
    {
      id: 2,
      code: 'ROLE_QA',
      name: '质检员',
      enable: true,
    },
  ],
  currentRole: {
    id: 1,
    code: 'SUPER_ADMIN',
    name: '超级管理员',
    enable: true,
  },
};

export const treeData = [
  {
    id: 2,
    name: '系统管理',
    code: 'SysMgt',
    type: 'MENU',
    parentId: null,
    path: null,
    redirect: null,
    icon: 'i-fe:grid',
    component: null,
    layout: null,
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 2,
    children: [
      {
        id: 1,
        name: '资源管理',
        code: 'Resource_Mgt',
        type: 'MENU',
        parentId: 2,
        path: '/pms/resource',
        redirect: null,
        icon: 'i-fe:list',
        component: '/src/views/pms/resource/index.vue',
        layout: null,
        keepAlive: null,
        method: null,
        description: null,
        show: true,
        enable: true,
        order: 1,
      },
      {
        id: 3,
        name: '角色管理',
        code: 'RoleMgt',
        type: 'MENU',
        parentId: 2,
        path: '/pms/role',
        redirect: null,
        icon: 'i-fe:user-check',
        component: '/src/views/pms/role/index.vue',
        layout: null,
        keepAlive: null,
        method: null,
        description: null,
        show: true,
        enable: true,
        order: 2,
        children: [
          {
            id: 5,
            name: '分配用户',
            code: 'RoleUser',
            type: 'MENU',
            parentId: 3,
            path: '/pms/role/user/:roleId',
            redirect: null,
            icon: 'i-fe:user-plus',
            component: '/src/views/pms/role/role-user.vue',
            layout: 'full',
            keepAlive: null,
            method: null,
            description: null,
            show: false,
            enable: true,
            order: 1,
          },
        ],
      },
      {
        id: 4,
        name: '用户管理',
        code: 'UserMgt',
        type: 'MENU',
        parentId: 2,
        path: '/pms/user',
        redirect: null,
        icon: 'i-fe:user',
        component: '/src/views/pms/user/index.vue',
        layout: null,
        keepAlive: true,
        method: null,
        description: null,
        show: true,
        enable: true,
        order: 3,
        children: [
          {
            id: 13,
            name: '创建新用户',
            code: 'AddUser',
            type: 'BUTTON',
            parentId: 4,
            path: null,
            redirect: null,
            icon: null,
            component: null,
            layout: null,
            keepAlive: null,
            method: null,
            description: null,
            show: true,
            enable: true,
            order: 1,
          },
        ],
      },
    ],
  },
  {
    id: 6,
    name: '业务示例',
    code: 'Demo',
    type: 'MENU',
    parentId: null,
    path: null,
    redirect: null,
    icon: 'i-fe:grid',
    component: null,
    layout: null,
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 1,
    children: [
      {
        id: 7,
        name: '图片上传',
        code: 'ImgUpload',
        type: 'MENU',
        parentId: 6,
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
        order: 2,
      },
    ],
  },
  {
    id: 8,
    name: '个人资料',
    code: 'UserProfile',
    type: 'MENU',
    parentId: null,
    path: '/profile',
    redirect: null,
    icon: 'i-fe:user',
    component: '/src/views/profile/index.vue',
    layout: null,
    keepAlive: null,
    method: null,
    description: null,
    show: false,
    enable: true,
    order: 99,
  },
  {
    id: 9,
    name: '基础功能',
    code: 'Base',
    type: 'MENU',
    parentId: null,
    path: '',
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
    children: [
      {
        id: 10,
        name: '基础组件',
        code: 'BaseComponents',
        type: 'MENU',
        parentId: 9,
        path: '/base/components',
        redirect: null,
        icon: 'i-me:awesome',
        component: '/src/views/base/index.vue',
        layout: null,
        keepAlive: null,
        method: null,
        description: null,
        show: true,
        enable: true,
        order: 1,
      },
      {
        id: 11,
        name: 'Unocss',
        code: 'Unocss',
        type: 'MENU',
        parentId: 9,
        path: '/base/unocss',
        redirect: null,
        icon: 'i-me:awesome',
        component: '/src/views/base/unocss.vue',
        layout: null,
        keepAlive: null,
        method: null,
        description: null,
        show: true,
        enable: true,
        order: 2,
      },
      {
        id: 12,
        name: 'KeepAlive',
        code: 'KeepAlive',
        type: 'MENU',
        parentId: 9,
        path: '/base/keep-alive',
        redirect: null,
        icon: 'i-me:awesome',
        component: '/src/views/base/keep-alive.vue',
        layout: null,
        keepAlive: true,
        method: null,
        description: null,
        show: true,
        enable: true,
        order: 3,
      },
      {
        id: 14,
        name: '图标 Icon',
        code: 'Icon',
        type: 'MENU',
        parentId: 9,
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
      },
      {
        id: 15,
        name: 'MeModal',
        code: 'TestModal',
        type: 'MENU',
        parentId: 9,
        path: '/testModal',
        redirect: null,
        icon: 'i-me:dialog',
        component: '/src/views/base/test-modal.vue',
        layout: null,
        keepAlive: null,
        method: null,
        description: null,
        show: true,
        enable: true,
        order: 5,
      },
    ],
  },
  {
    id: 10,
    name: '测试菜单',
    code: 'Demo1',
    type: 'MENU',
    parentId: null,
    path: null,
    redirect: null,
    icon: 'i-fe:zap',
    component: null,
    layout: null,
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 1,
    children: [
      {
        id: 16,
        name: '资源管理',
        code: 'PM_RES',
        type: 'MENU',
        parentId: 6,
        path: '/demo/res',
        redirect: null,
        icon: 'i-fe:zap',
        component: '/src/views/demo/resource/index.vue',
        layout: '',
        keepAlive: true,
        method: null,
        description: null,
        show: true,
        enable: true,
        order: 2,
      },
      {
        id: 17,
        name: '角色管理',
        code: 'PMRole',
        type: 'MENU',
        parentId: 6,
        path: '/demo/role',
        redirect: null,
        icon: 'i-fe:zap',
        component: '/src/views/demo/crud/role.vue',
        layout: '',
        keepAlive: true,
        method: null,
        description: null,
        show: true,
        enable: true,
        order: 2,
      },
      {
        id: 18,
        name: '用户管理',
        code: 'PMUser',
        type: 'MENU',
        parentId: 6,
        path: '/demo/user',
        redirect: null,
        icon: 'i-fe:zap',
        component: '/src/views/demo/crud/user.vue',
        layout: '',
        keepAlive: true,
        method: null,
        description: null,
        show: true,
        enable: true,
        order: 2,
      },
    ],
  },
  {
    id: 16,
    name: 'CRUD',
    code: 'crud',
    type: 'MENU',
    parentId: null,
    path: null,
    redirect: null,
    icon: 'i-fe:zap',
    component: null,
    layout: null,
    keepAlive: null,
    method: null,
    description: null,
    show: true,
    enable: true,
    order: 1,
    children: [
      {
        id: 17,
        name: '基础示例',
        code: 'CRUDDemo',
        type: 'MENU',
        parentId: 6,
        path: '/crud/index',
        redirect: null,
        icon: 'i-fe:zap',
        component: '/src/views/crud/index.vue',
        layout: '',
        keepAlive: true,
        method: null,
        description: null,
        show: true,
        enable: true,
        order: 2,
      }
    ],
  },
];

export const rolePageData = {
  pageData: [
    {
      id: 1,
      code: 'SUPER_ADMIN',
      name: '超级管理员',
      enable: true,
      permissionIds: [],
    },
    {
      id: 2,
      code: 'ROLE_QA',
      name: '质检员',
      enable: true,
      permissionIds: [1, 2, 3, 4, 5, 9, 10, 11, 12, 14, 15],
    },
  ],
  total: 2,
};

export const userPageData = {
  pageData: [
    {
      id: 1,
      username: 'admin',
      enable: true,
      createTime: '2023-11-18T08:18:59.150Z',
      updateTime: '2023-11-18T08:18:59.150Z',
      roles: [
        {
          id: 1,
          code: 'SUPER_ADMIN',
          name: '超级管理员',
          enable: true,
        },
        {
          id: 2,
          code: 'ROLE_QA',
          name: '质检员',
          enable: true,
        },
      ],
      gender: null,
      avatar:
        'https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif?imageView2/1/w/80/h/80',
      address: null,
      email: null,
    },
  ],
  total: 1,
};
