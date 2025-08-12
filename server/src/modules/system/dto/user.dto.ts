import { User as PrismaUser } from '@prisma/client';
import { PaginationQuery } from '../types/pagination.types';

export type User = PrismaUser & {};

export type UserDto = PrismaUser & {
  roles: string[]; // 添加新的 roles 属性
};

/**
 * 用户查询数据传输对象
 */
export interface UserQueryDto extends PaginationQuery {
  username?: string;
  nickName?: string;
  email?: string;
  phone?: string;
  system?: boolean;
}

/**
 * 创建用户数据传输对象
 */
export interface CreateUserDto {
  username: string;
  password: string;
  nickName: string;
  roles: string[];
  phone?: string;
  email?: string;
}

/**
 * 更新用户数据传输对象
 */
export interface UpdateUserDto {
  password?: string;
  nickName?: string;
  roles?: string[];
  phone?: string;
  email?: string;
}

/**
 * 更新用户基础信息数据传输对象（不包含角色信息）
 */
export interface UpdateUserInfoDto {
  nickName?: string;
  phone?: string;
  email?: string;
  password?: string;
}

export type ResUser = {
  records: UserDto[];
  total: number;
  currentPage: number;
  pageSize: number;
};

export type InputUser = {
  username: string;
  password: string;
  nickName: string;
  roles: string[];
  phone: string;
  email: string;
};
