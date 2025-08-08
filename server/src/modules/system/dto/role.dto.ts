import { PaginationQuery } from '../types/pagination.types';

/**
 * 角色查询数据传输对象
 */
export interface RoleQueryDto extends PaginationQuery {
  /** 角色名称 */
  name?: string;
  /** 角色代码 */
  code?: string;
  /** 是否为系统角色 */
  system?: boolean;
}

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

/**
 * 角色响应数据传输对象
 * 用于规范角色查询和列表接口的返回数据格式
 */
export interface RoleResponseDto {
  /** 角色ID */
  id: number;
  /** 角色名称 */
  name: string;
  /** 角色代码 */
  code: string;
  /** 是否为系统角色 */
  system: boolean;
  /** 权限标识列表 */
  policies: string[];
  /** 创建时间 */
  createTime: Date;
  /** 更新时间 */
  updateTime: Date;
}