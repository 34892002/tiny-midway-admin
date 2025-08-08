import { AdminBusinessError, BusinessErrors } from '../error/admin.error';

/**
 * 标识符校验工具类
 * 提供统一的标识符格式校验和重复检查功能（纯数据校验，不依赖外部服务）
 */
export class IdentifierValidator {
  // 正则表达式常量
  static readonly IDENTIFIER_REGEX = /^(?!^\d)[a-zA-Z0-9_]+$/;
  static readonly IDENTIFIER_WITH_COLON_REGEX = /^(?!^\d)[a-zA-Z0-9_\:]+$/;

  /**
   * 校验单个标识符格式
   * @param identifier 要校验的标识符
   * @param allowColon 是否允许冒号字符
   * @returns 校验是否通过
   */
  static validateIdentifierFormat(identifier: string, allowColon = false): boolean {
    const regex = allowColon ? this.IDENTIFIER_WITH_COLON_REGEX : this.IDENTIFIER_REGEX;
    return regex.test(identifier);
  }

  /**
   * 批量校验标识符格式
   * @param identifiers 要校验的标识符数组
   * @param allowColon 是否允许冒号字符
   * @param errorType 格式错误时抛出的错误类型
   * @throws AdminBusinessError 当标识符格式不符合规则时抛出错误
   */
  static validateIdentifiersFormat(
    identifiers: string[], 
    allowColon = false, 
    errorType: typeof BusinessErrors[keyof typeof BusinessErrors]
  ): void {
    identifiers.forEach(item => {
      if (!this.validateIdentifierFormat(item, allowColon)) {
        throw new AdminBusinessError(errorType);
      }
    });
  }

  /**
   * 检查数组中是否有重复项
   * @param items 要检查的数组
   * @param errorType 发现重复时抛出的错误类型
   * @throws AdminBusinessError 当发现重复项时抛出错误
   */
  static checkDuplicates<T>(items: T[], errorType: typeof BusinessErrors[keyof typeof BusinessErrors]): void {
    if (items.length !== new Set(items).size) {
      throw new AdminBusinessError(errorType);
    }
  }

  /**
   * 检查用户标识与角色标识是否冲突（仅检查提交的数据内部冲突）
   * @param userIdentifier 用户标识
   * @param roleIdentifiers 角色标识列表
   * @throws AdminBusinessError 当用户标识与角色标识重复时抛出错误
   */
  static checkUserRoleConflict(userIdentifier: string, roleIdentifiers: string[]): void {
    if (roleIdentifiers.includes(userIdentifier)) {
      throw new AdminBusinessError(BusinessErrors.USER_ROLE_CONFLICT);
    }
  }

  /**
   * 校验用户标识和角色标识的基础数据合法性（纯数据校验）
   * @param name 用户标识
   * @param roles 角色标识列表
   * @throws AdminBusinessError 当校验失败时抛出相应错误
   */
  static validateUserNameAndRoles(name: string, roles: string[]): void {
    // 基础校验
    if (!name) {
      throw new AdminBusinessError(BusinessErrors.USER_IDENTIFIER_EMPTY);
    }
    if (!roles?.length) {
      throw new AdminBusinessError(BusinessErrors.ROLE_LIST_EMPTY);
    }
    if (!roles.every(item => item)) {
      throw new AdminBusinessError(BusinessErrors.ROLE_IDENTIFIER_EMPTY);
    }

    // 格式校验
    this.validateIdentifiersFormat(roles, false, BusinessErrors.ROLE_IDENTIFIER_INVALID);

    // 重复校验
    this.checkDuplicates(roles, BusinessErrors.ROLE_IDENTIFIER_DUPLICATE);

    // 内部冲突校验
    this.checkUserRoleConflict(name, roles);
  }

  /**
   * 校验角色代码和权限标识的基础数据合法性（纯数据校验）
   * @param code 角色代码
   * @param policies 权限标识列表
   * @throws AdminBusinessError 当校验失败时抛出相应错误
   */
  static validateRoleCodeAndPolicies(code: string, policies: string[]): void {
    // 基础校验
    if (!code) {
      throw new AdminBusinessError(BusinessErrors.ROLE_IDENTIFIER_EMPTY);
    }
    if (!policies?.length) {
      throw new AdminBusinessError(BusinessErrors.PERMISSION_LIST_EMPTY);
    }
    if (!policies.every(item => item)) {
      throw new AdminBusinessError(BusinessErrors.PERMISSION_IDENTIFIER_EMPTY);
    }

    // 格式校验（权限标识允许冒号）
    this.validateIdentifiersFormat(policies, true, BusinessErrors.PERMISSION_IDENTIFIER_INVALID);

    // 重复校验
    this.checkDuplicates(policies, BusinessErrors.PERMISSION_IDENTIFIER_DUPLICATE);
  }
}