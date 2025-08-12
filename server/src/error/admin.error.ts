// 认证相关错误 (10000-10999)
const AuthErrors = {
  CAPTCHA_ERROR: { code: 10003, error: '验证码错误' },
  USR_PWD_ERROR: { code: 10002, error: '用户名密码错误!' },
  PERMISSION_DENIED: { code: 10001, error: '权限不足，无法修改系统用户信息' }
} as const;

// 用户数据相关错误 (11000-11999)
const UserDataErrors = {
  BAD_USER_DATA: { code: 11007, error: '用户数据异常!' },
  TIMEOUT_USER_DATA: { code: 11008, error: '用户数据已更新' },
  USER_NOT_FOUND: { code: 11001, error: '目标用户不存在' },
  ROLE_NOT_FOUND: { code: 11002, error: '角色不存在' }
} as const;

// 业务逻辑错误 (12000-12999)
const BusinessErrors = {
  USER_IDENTIFIER_EMPTY: { code: 12001, error: '用户标识不能为空' },
  ROLE_IDENTIFIER_EMPTY: { code: 12002, error: '角色标识不能为空' },
  ROLE_LIST_EMPTY: { code: 12003, error: '角色标识列表不能为空' },
  PERMISSION_LIST_EMPTY: { code: 12004, error: '权限标识列表不能为空' },
  PERMISSION_IDENTIFIER_EMPTY: { code: 12005, error: '权限标识不能为空' },
  ROLE_IDENTIFIER_INVALID: { code: 12006, error: '角色标识不符合规则' },
  PERMISSION_IDENTIFIER_INVALID: { code: 12007, error: '权限标识不符合规则' },
  ROLE_IDENTIFIER_DUPLICATE: { code: 12008, error: '角色标识不能重复' },
  PERMISSION_IDENTIFIER_DUPLICATE: { code: 12009, error: '权限标识不能重复' },
  USER_ROLE_CONFLICT: { code: 12010, error: '用户标识不能跟角色标识重复' },
  ROLE_PERMISSION_CONFLICT: { code: 12011, error: '角色标识不能跟权限标识重复' },
  PERMISSION_USER_CONFLICT: { code: 12012, error: '权限标识不能跟用户标识重复' },
  PERMISSION_ROLE_CONFLICT: { code: 12013, error: '权限标识不能跟角色标识重复' },
  SYSTEM_USER_DELETE_FORBIDDEN: { code: 12014, error: '系统用户不能删除' },
  SYSTEM_ROLE_DELETE_FORBIDDEN: { code: 12015, error: '系统角色不能删除' },
  SYSTEM_PROPERTY_MODIFY_FORBIDDEN: { code: 12016, error: '用户不能修改系统属性' },
  CODE_ALREADY_EXISTS: { code: 12017, error: '编码已经存在，请重新输入！' },
  CATEGORY_NAME_EXISTS: { code: 12018, error: '已存在的分类名称' },
  SYSTEM_CATEGORY_DELETE_FORBIDDEN: { code: 12019, error: '不能删除系统分类' }
} as const;

// 系统相关错误 (13000-13999)
const SystemErrors = {
  DICT_NOT_DATA: { code: 13000, error: '未找到字典!' },
  DEMO_ENVIRONMENT_RESTRICTION: { code: 13001, error: '演示环境不能修改用户信息' },
  DEMO_MENU_DELETE_FORBIDDEN: { code: 13002, error: '演示环境下不能删除菜单' },
  MENU_HAS_CHILDREN: { code: 13003, error: '该菜单下有子菜单&按钮，请先删除子菜单&按钮!' },
  SYSTEM_CATEGORY_DELETE_FORBIDDEN_FILE: { code: 13004, error: '系统分类不能删除' },
  CATEGORY_HAS_FILES: { code: 13005, error: '该分类下还有文件，请先删除该分类下的所有文件' }
} as const;

// 合并所有错误定义，保持向后兼容
export const AdminErrorEnum = {
  ...AuthErrors,
  ...UserDataErrors,
  ...BusinessErrors,
  ...SystemErrors
} as const;

// 类型推导支持
export type AdminError = typeof AdminErrorEnum[keyof typeof AdminErrorEnum];

// 错误代码类型推导
export type AdminErrorCode = AdminError['code'];

// 错误消息类型推导
export type AdminErrorMessage = AdminError['error'];

// 错误键类型推导
export type AdminErrorKey = keyof typeof AdminErrorEnum;

// 导出分类错误定义供模块化使用
export { AuthErrors, UserDataErrors, BusinessErrors, SystemErrors };

// 导入 Midway 标准错误类
import { MidwayError } from '@midwayjs/core';

// 业务错误基类 - 继承自 MidwayError，保持现有的错误处理行为
export class AdminBusinessError extends MidwayError {
  public readonly businessCode: number;
  public readonly businessMessage: string;

  constructor(adminError: AdminError) {
    // 使用字符串形式的 code，保持与现有 MidwayError 使用方式一致
    super(adminError.error, adminError.code.toString());
    this.businessCode = adminError.code;
    this.businessMessage = adminError.error;
    this.name = 'AdminBusinessError';

    // 确保正确的原型链
    Object.setPrototypeOf(this, AdminBusinessError.prototype);
  }
}

