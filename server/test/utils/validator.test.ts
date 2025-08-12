import { IdentifierValidator } from '../../src/utils/validator';
import { AdminBusinessError, BusinessErrors } from '../../src/error/admin.error';

/**
 * IdentifierValidator 工具类测试
 * 测试标识符校验的各种场景，确保覆盖所有分支
 */
describe('IdentifierValidator', () => {
  describe('validateIdentifierFormat', () => {
    it('should validate identifier format without colon', () => {
      // 测试不允许冒号的情况（覆盖 allowColon = false 分支）
      expect(IdentifierValidator.validateIdentifierFormat('validId')).toBe(true);
      expect(IdentifierValidator.validateIdentifierFormat('valid_id_123')).toBe(true);
      expect(IdentifierValidator.validateIdentifierFormat('123invalid')).toBe(false);
      expect(IdentifierValidator.validateIdentifierFormat('invalid:id')).toBe(false);
    });

    it('should validate identifier format with colon allowed', () => {
      // 测试允许冒号的情况（覆盖 allowColon = true 分支）
      expect(IdentifierValidator.validateIdentifierFormat('valid:id', true)).toBe(true);
      expect(IdentifierValidator.validateIdentifierFormat('valid_id:123', true)).toBe(true);
      expect(IdentifierValidator.validateIdentifierFormat('123invalid', true)).toBe(false);
      expect(IdentifierValidator.validateIdentifierFormat('valid-id', true)).toBe(false);
    });
  });

  describe('validateIdentifiersFormat', () => {
    it('should validate identifiers format without colon', () => {
      // 测试批量校验不允许冒号的情况（覆盖 allowColon = false 分支）
      expect(() => {
        IdentifierValidator.validateIdentifiersFormat(
          ['valid1', 'valid2'], 
          false, 
          BusinessErrors.ROLE_IDENTIFIER_INVALID
        );
      }).not.toThrow();

      // 测试默认参数（不传allowColon参数，覆盖第32行的默认值false分支）
      expect(() => {
        IdentifierValidator.validateIdentifiersFormat(
          ['valid1', 'valid2'], 
          undefined, 
          BusinessErrors.ROLE_IDENTIFIER_INVALID
        );
      }).not.toThrow();

      expect(() => {
        IdentifierValidator.validateIdentifiersFormat(
          ['valid1', 'invalid:id'], 
          false, 
          BusinessErrors.ROLE_IDENTIFIER_INVALID
        );
      }).toThrow(AdminBusinessError);
    });

    it('should validate identifiers format with colon allowed', () => {
      // 测试批量校验允许冒号的情况（覆盖 allowColon = true 分支）
      expect(() => {
        IdentifierValidator.validateIdentifiersFormat(
          ['valid:id1', 'valid:id2'], 
          true, 
          BusinessErrors.PERMISSION_IDENTIFIER_INVALID
        );
      }).not.toThrow();

      expect(() => {
        IdentifierValidator.validateIdentifiersFormat(
          ['valid:id1', '123invalid'], 
          true, 
          BusinessErrors.PERMISSION_IDENTIFIER_INVALID
        );
      }).toThrow(AdminBusinessError);
    });
  });

  describe('checkDuplicates', () => {
    it('should not throw for unique items', () => {
      expect(() => {
        IdentifierValidator.checkDuplicates(
          ['item1', 'item2', 'item3'], 
          BusinessErrors.ROLE_IDENTIFIER_DUPLICATE
        );
      }).not.toThrow();
    });

    it('should throw for duplicate items', () => {
      expect(() => {
        IdentifierValidator.checkDuplicates(
          ['item1', 'item2', 'item1'], 
          BusinessErrors.ROLE_IDENTIFIER_DUPLICATE
        );
      }).toThrow(AdminBusinessError);
    });
  });

  describe('checkUserRoleConflict', () => {
    it('should not throw when no conflict', () => {
      expect(() => {
        IdentifierValidator.checkUserRoleConflict('user1', ['role1', 'role2']);
      }).not.toThrow();
    });

    it('should throw when user identifier conflicts with role', () => {
      expect(() => {
        IdentifierValidator.checkUserRoleConflict('user1', ['role1', 'user1']);
      }).toThrow(AdminBusinessError);
    });
  });

  describe('validateUserNameAndRoles', () => {
    it('should validate valid user name and roles', () => {
      expect(() => {
        IdentifierValidator.validateUserNameAndRoles('validUser', ['role1', 'role2']);
      }).not.toThrow();
    });

    it('should throw for empty user name', () => {
      expect(() => {
        IdentifierValidator.validateUserNameAndRoles('', ['role1']);
      }).toThrow(AdminBusinessError);
    });

    it('should throw for empty roles array', () => {
      expect(() => {
        IdentifierValidator.validateUserNameAndRoles('user1', []);
      }).toThrow(AdminBusinessError);
    });

    it('should throw for null/undefined roles', () => {
      expect(() => {
        IdentifierValidator.validateUserNameAndRoles('user1', null as any);
      }).toThrow(AdminBusinessError);
      
      expect(() => {
        IdentifierValidator.validateUserNameAndRoles('user1', undefined as any);
      }).toThrow(AdminBusinessError);
    });

    it('should throw for empty role identifier', () => {
      expect(() => {
        IdentifierValidator.validateUserNameAndRoles('user1', ['role1', '']);
      }).toThrow(AdminBusinessError);
    });
  });

  describe('validateRoleCodeAndPolicies', () => {
    it('should validate valid role code and policies', () => {
      expect(() => {
        IdentifierValidator.validateRoleCodeAndPolicies('roleCode', ['policy:read', 'policy:write']);
      }).not.toThrow();
    });

    it('should throw for empty role code', () => {
      expect(() => {
        IdentifierValidator.validateRoleCodeAndPolicies('', ['policy1']);
      }).toThrow(AdminBusinessError);
    });

    it('should throw for empty policies array', () => {
      expect(() => {
        IdentifierValidator.validateRoleCodeAndPolicies('roleCode', []);
      }).toThrow(AdminBusinessError);
    });

    it('should throw for null/undefined policies', () => {
      expect(() => {
        IdentifierValidator.validateRoleCodeAndPolicies('roleCode', null as any);
      }).toThrow(AdminBusinessError);
      
      expect(() => {
        IdentifierValidator.validateRoleCodeAndPolicies('roleCode', undefined as any);
      }).toThrow(AdminBusinessError);
    });

    it('should throw for empty policy identifier', () => {
      expect(() => {
        IdentifierValidator.validateRoleCodeAndPolicies('roleCode', ['policy1', '']);
      }).toThrow(AdminBusinessError);
    });
  });
});