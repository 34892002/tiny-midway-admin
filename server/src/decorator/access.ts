/**
 * 权限访问控制装饰器模块
 * 
 * 该模块提供了基于权限码的访问控制装饰器，用于在方法级别进行权限验证。
 * 通过 @Access 装饰器标记需要特定权限的方法，配合 CasbinGuard 实现统一的权限管理。
 * 
 * @fileoverview 权限控制装饰器实现
 * @author 34892002@qq.com
 * @since 1.0.0
 * @version 1.0.0
 */

import { savePropertyMetadata } from '@midwayjs/core';

/**
 * 权限访问控制元数据键名
 * 
 * 用于在方法上保存权限码信息的元数据键，
 * CasbinGuard 会通过此键获取方法所需的权限码进行验证。
 * 
 * @constant {string}
 */
export const ACCESS_META_KEY = 'access:code';

/**
 * 权限访问控制装饰器
 * 
 * 用于标记需要特定权限才能访问的方法。该装饰器会将权限码保存为方法的元数据，
 * 在运行时由 CasbinGuard 读取并进行权限验证。
 * 
 * 工作原理：
 * 1. 装饰器将权限码通过 savePropertyMetadata 保存到目标方法的元数据中
 * 2. CasbinGuard 在请求拦截时通过 getPropertyMetadata 获取权限码
 * 3. 结合用户角色信息进行 Casbin 权限验证
 * 
 * @param code 权限码，用于标识访问该方法所需的权限
 * @returns 返回一个方法装饰器函数
 * 
 * @example
 * ```typescript
 * // 基本用法
 * @UseGuard(CasbinGuard)
 * @Access('RoleMgt')
 * @Post('/add')
 * async addRole(@Body() roleData: RoleDto) {
 *   // 只有具有 RoleMgt 权限的用户才能访问此方法
 *   return await this.roleService.add(roleData);
 * }
 * ```
 * @see {@link CasbinGuard} 权限验证守卫
 * @see {@link ACCESS_META_KEY} 元数据键名常量
 */
export function Access(code: string): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    // 使用 Midway 框架的元数据管理机制保存权限码
    // target: 目标类的原型对象（构造函数的 prototype）
    // propertyKey: 被装饰的方法名（string | symbol）
    // descriptor: 方法的属性描述符（PropertyDescriptor）
    // 权限码将被保存为方法的元数据，供 CasbinGuard 在运行时读取
    savePropertyMetadata(ACCESS_META_KEY, code, target, propertyKey);
  };
}
