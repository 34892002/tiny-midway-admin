/**
 * 角色数据传输对象
 */
export interface RoleDto {
  /** 角色名称 */
  name: string;
  /** 角色代码 */
  code: string;
  /** 是否为系统角色 */
  system?: boolean;
  /** 权限标识列表 */
  policies: string[];
}

/**
 * 角色创建数据传输对象
 */
export interface CreateRoleDto {
  /** 角色名称 */
  name: string;
  /** 角色代码 */
  code: string;
  /** 权限标识列表 */
  policies: string[];
}

/**
 * 角色更新数据传输对象
 */
export interface UpdateRoleDto {
  /** 角色名称 */
  name?: string;
  /** 是否为系统角色 */
  system?: boolean;
  /** 权限标识列表 */
  policies: string[];
}