/**
 * 权限相关的类型定义
 */

export interface PermissionContext {
  userId: number;
  username: string;
  roles: string[];
  isSystem: boolean;
}

export interface PermissionUpdateOperation {
  type: 'add' | 'remove' | 'sync';
  target: 'user' | 'role';
  identifier: string;
  permissions: string[];
}

export interface UserPermission {
  username: string;
  roles: string[];
}

export interface RolePermission {
  roleCode: string;
  permissions: string[];
}

export interface CasbinRule {
  ptype: string;
  v0: string;
  v1: string;
  v2?: string;
  v3?: string;
  v4?: string;
  v5?: string;
}

export interface PermissionSyncOptions {
  autoReload?: boolean;
  transaction?: boolean;
}

export interface PermissionOperationContext {
  operatorId?: number;
  operatorName?: string;
  timestamp?: Date;
  reason?: string;
}