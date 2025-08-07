import { 
  AdminErrorEnum, 
  AdminBusinessError,
  BusinessErrors,
  UserDataErrors,
  AuthErrors,
  SystemErrors
} from '../../src/error/admin.error';

/**
 * 错误模块集成测试
 * 测试错误枚举和业务错误类的正确性和完整性
 */
describe('Error Module Integration Tests', () => {
    /**
     * 测试错误枚举结构和内容
     */
    describe('AdminErrorEnum', () => {
        it('should have valid CAPTCHA_ERROR configuration', () => {
            expect(AdminErrorEnum.CAPTCHA_ERROR).toBeDefined();
            expect(AdminErrorEnum.CAPTCHA_ERROR.code).toBe(10003);
            expect(AdminErrorEnum.CAPTCHA_ERROR.error).toBe('验证码错误');
            expect(typeof AdminErrorEnum.CAPTCHA_ERROR.code).toBe('number');
            expect(typeof AdminErrorEnum.CAPTCHA_ERROR.error).toBe('string');
        });

        it('should have valid USR_PWD_ERROR configuration', () => {
            expect(AdminErrorEnum.USR_PWD_ERROR).toBeDefined();
            expect(AdminErrorEnum.USR_PWD_ERROR.code).toBe(10002);
            expect(AdminErrorEnum.USR_PWD_ERROR.error).toBe('用户名密码错误!');
            expect(typeof AdminErrorEnum.USR_PWD_ERROR.code).toBe('number');
            expect(typeof AdminErrorEnum.USR_PWD_ERROR.error).toBe('string');
        });

        it('should have valid DICT_NOT_DATA configuration', () => {
            expect(AdminErrorEnum.DICT_NOT_DATA).toBeDefined();
            expect(AdminErrorEnum.DICT_NOT_DATA.code).toBe(13000);
            expect(AdminErrorEnum.DICT_NOT_DATA.error).toBe('未找到字典!');
            expect(typeof AdminErrorEnum.DICT_NOT_DATA.code).toBe('number');
            expect(typeof AdminErrorEnum.DICT_NOT_DATA.error).toBe('string');
        });

        it('should have valid BAD_USER_DATA configuration', () => {
            expect(AdminErrorEnum.BAD_USER_DATA).toBeDefined();
            expect(AdminErrorEnum.BAD_USER_DATA.code).toBe(11007);
            expect(AdminErrorEnum.BAD_USER_DATA.error).toBe('用户数据异常!');
            expect(typeof AdminErrorEnum.BAD_USER_DATA.code).toBe('number');
            expect(typeof AdminErrorEnum.BAD_USER_DATA.error).toBe('string');
        });

        it('should have valid TIMEOUT_USER_DATA configuration', () => {
            expect(AdminErrorEnum.TIMEOUT_USER_DATA).toBeDefined();
            expect(AdminErrorEnum.TIMEOUT_USER_DATA.code).toBe(11008);
            expect(AdminErrorEnum.TIMEOUT_USER_DATA.error).toBe('用户数据已更新');
            expect(typeof AdminErrorEnum.TIMEOUT_USER_DATA.code).toBe('number');
            expect(typeof AdminErrorEnum.TIMEOUT_USER_DATA.error).toBe('string');
        });

        it('should have valid USER_NOT_FOUND configuration', () => {
            expect(AdminErrorEnum.USER_NOT_FOUND).toBeDefined();
            expect(AdminErrorEnum.USER_NOT_FOUND.code).toBe(11001);
            expect(AdminErrorEnum.USER_NOT_FOUND.error).toBe('目标用户不存在');
            expect(typeof AdminErrorEnum.USER_NOT_FOUND.code).toBe('number');
            expect(typeof AdminErrorEnum.USER_NOT_FOUND.error).toBe('string');
        });

        it('should have all required error types', () => {
            const requiredErrorTypes = [
                'CAPTCHA_ERROR',
                'USR_PWD_ERROR', 
                'DICT_NOT_DATA',
                'BAD_USER_DATA',
                'TIMEOUT_USER_DATA',
                'USER_NOT_FOUND',
                'USER_IDENTIFIER_EMPTY',
                'PERMISSION_DENIED'
            ];

            requiredErrorTypes.forEach(errorType => {
                expect(AdminErrorEnum).toHaveProperty(errorType);
                expect(AdminErrorEnum[errorType]).toHaveProperty('code');
                expect(AdminErrorEnum[errorType]).toHaveProperty('error');
            });
        });

        it('should have unique error codes', () => {
            const errorCodes = Object.values(AdminErrorEnum).map(error => error.code);
            const uniqueCodes = [...new Set(errorCodes)];
            
            // 验证所有错误码都是唯一的
            expect(errorCodes.length).toBe(uniqueCodes.length);
            expect(uniqueCodes.length).toBeGreaterThan(20); // 现在有很多错误定义
        });

        it('should have valid error code ranges', () => {
            Object.values(AdminErrorEnum).forEach(error => {
                expect(error.code).toBeGreaterThan(10000);
                expect(error.code).toBeLessThan(20000);
                expect(Number.isInteger(error.code)).toBe(true);
            });
        });

        it('should have non-empty error messages', () => {
            Object.values(AdminErrorEnum).forEach(error => {
                expect(error.error).toBeTruthy();
                expect(error.error.length).toBeGreaterThan(0);
                expect(typeof error.error).toBe('string');
            });
        });
    });

    /**
     * 测试 AdminBusinessError 类
     */
    describe('AdminBusinessError Class', () => {
        it('should create AdminBusinessError instance correctly', () => {
            const error = new AdminBusinessError(AdminErrorEnum.CAPTCHA_ERROR);

            expect(error).toBeInstanceOf(AdminBusinessError);
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe('验证码错误');
            expect(error.businessCode).toBe(10003);
            expect(error.businessMessage).toBe('验证码错误');
            expect(error.name).toBe('AdminBusinessError');
            expect(error.code).toBe('10003'); // MidwayError 的 code 是字符串
        });

        it('should create error using different error objects', () => {
            const testCases = [
                { errorObj: BusinessErrors.USER_IDENTIFIER_EMPTY, expectedCode: 12001, expectedMessage: '用户标识不能为空' },
                { errorObj: UserDataErrors.USER_NOT_FOUND, expectedCode: 11001, expectedMessage: '目标用户不存在' },
                { errorObj: AuthErrors.PERMISSION_DENIED, expectedCode: 10001, expectedMessage: '权限不足，无法修改系统用户信息' },
                { errorObj: SystemErrors.DEMO_ENVIRONMENT_RESTRICTION, expectedCode: 13001, expectedMessage: '演示环境不能修改用户信息' }
            ];

            testCases.forEach(({ errorObj, expectedCode, expectedMessage }) => {
                const error = new AdminBusinessError(errorObj);
                expect(error.businessCode).toBe(expectedCode);
                expect(error.businessMessage).toBe(expectedMessage);
                expect(error.message).toBe(expectedMessage);
                expect(error.code).toBe(expectedCode.toString()); // MidwayError 的 code 是字符串
            });
        });

        it('should maintain Error prototype chain', () => {
            const error = new AdminBusinessError(AdminErrorEnum.CAPTCHA_ERROR);
            
            expect(error instanceof Error).toBe(true);
            expect(error instanceof AdminBusinessError).toBe(true);
            expect(error.constructor).toBe(AdminBusinessError);
        });

        it('should have proper toString behavior', () => {
            const error = new AdminBusinessError(AdminErrorEnum.CAPTCHA_ERROR);
            const errorString = error.toString();
            
            expect(errorString).toContain('验证码错误');
        });

        it('should support stack trace', () => {
            const error = new AdminBusinessError(AdminErrorEnum.CAPTCHA_ERROR);
            
            expect(error.stack).toBeDefined();
            expect(typeof error.stack).toBe('string');
            expect(error.stack).toContain('验证码错误');
        });
    });

    /**
     * 测试错误处理的实际使用场景
     */
    describe('Error Usage Scenarios', () => {
        it('should handle error throwing and catching', () => {
            expect(() => {
                throw new AdminBusinessError(AdminErrorEnum.CAPTCHA_ERROR);
            }).toThrow(AdminBusinessError);

            expect(() => {
                throw new AdminBusinessError(BusinessErrors.USER_IDENTIFIER_EMPTY);
            }).toThrow(AdminBusinessError);

            expect(() => {
                throw new AdminBusinessError(UserDataErrors.USER_NOT_FOUND);
            }).toThrow(Error);
        });

        it('should handle error catching with specific types', () => {
            try {
                throw new AdminBusinessError(UserDataErrors.USER_NOT_FOUND);
            } catch (error) {
                expect(error).toBeInstanceOf(AdminBusinessError);
                expect(error.message).toBe('目标用户不存在');
                expect((error as AdminBusinessError).businessCode).toBe(11001);
            }

            try {
                throw new AdminBusinessError(BusinessErrors.ROLE_IDENTIFIER_EMPTY);
            } catch (error) {
                expect(error).toBeInstanceOf(AdminBusinessError);
                expect(error.message).toBe('角色标识不能为空');
                expect((error as AdminBusinessError).businessCode).toBe(12002);
            }
        });

        it('should support error serialization', () => {
            const businessError = new AdminBusinessError(AdminErrorEnum.CAPTCHA_ERROR);
            const userError = new AdminBusinessError(UserDataErrors.USER_NOT_FOUND);

            // 测试错误对象的序列化
            const businessErrorObj = {
                message: businessError.message,
                businessCode: businessError.businessCode,
                name: businessError.name
            };

            const userErrorObj = {
                message: userError.message,
                businessCode: userError.businessCode,
                name: userError.name
            };

            expect(businessErrorObj.message).toBe('验证码错误');
            expect(businessErrorObj.businessCode).toBe(10003);
            expect(userErrorObj.message).toBe('目标用户不存在');
            expect(userErrorObj.businessCode).toBe(11001);
        });

        it('should handle error comparison', () => {
            const error1 = new AdminBusinessError(AdminErrorEnum.CAPTCHA_ERROR);
            const error2 = new AdminBusinessError(AdminErrorEnum.CAPTCHA_ERROR);
            const error3 = new AdminBusinessError(UserDataErrors.USER_NOT_FOUND);

            // 不同实例但相同内容
            expect(error1.message).toBe(error2.message);
            expect(error1.businessCode).toBe(error2.businessCode);
            expect(error1).not.toBe(error2); // 不同的对象实例

            // 不同错误类型
            expect(error1.message).not.toBe(error3.message);
            expect(error1.businessCode).not.toBe(error3.businessCode);
        });
    });

    /**
     * 测试错误枚举的一致性和完整性
     */
    describe('Error Enum Consistency', () => {
        it('should have consistent error structure', () => {
            Object.entries(AdminErrorEnum).forEach(([, value]) => {
                expect(value).toHaveProperty('code');
                expect(value).toHaveProperty('error');
                expect(typeof value.code).toBe('number');
                expect(typeof value.error).toBe('string');
                expect(value.error.length).toBeGreaterThan(0);
            });
        });

        it('should follow naming conventions', () => {
            const errorKeys = Object.keys(AdminErrorEnum);
            
            errorKeys.forEach(key => {
                // 错误键名应该是大写，用下划线分隔
                expect(key).toMatch(/^[A-Z_]+$/);
                expect(key).toContain('_');
            });
        });

        it('should have meaningful error messages', () => {
            Object.values(AdminErrorEnum).forEach(error => {
                // 错误消息应该包含中文字符（因为这是中文系统）
                expect(error.error).toMatch(/[\u4e00-\u9fa5]/);
                expect(error.error.length).toBeGreaterThanOrEqual(3);
                expect(error.error.length).toBeLessThanOrEqual(50);
            });
        });

        it('should have appropriate error code grouping', () => {
            const errorCodes = Object.values(AdminErrorEnum).map(error => error.code);
            
            // 验证错误码分组
            const authErrors = errorCodes.filter(code => code >= 10000 && code < 11000);
            const userErrors = errorCodes.filter(code => code >= 11000 && code < 12000);
            const businessErrors = errorCodes.filter(code => code >= 12000 && code < 13000);
            const systemErrors = errorCodes.filter(code => code >= 13000 && code < 14000);
            
            expect(authErrors.length).toBeGreaterThan(0);
            expect(userErrors.length).toBeGreaterThan(0);
            expect(businessErrors.length).toBeGreaterThan(0);
            expect(systemErrors.length).toBeGreaterThan(0);
            
            // 验证具体的错误码分组
            expect(AdminErrorEnum.CAPTCHA_ERROR.code).toBeGreaterThanOrEqual(10000);
            expect(AdminErrorEnum.CAPTCHA_ERROR.code).toBeLessThan(11000);
            expect(AdminErrorEnum.USR_PWD_ERROR.code).toBeGreaterThanOrEqual(10000);
            expect(AdminErrorEnum.USR_PWD_ERROR.code).toBeLessThan(11000);
            expect(AdminErrorEnum.BAD_USER_DATA.code).toBeGreaterThanOrEqual(11000);
            expect(AdminErrorEnum.BAD_USER_DATA.code).toBeLessThan(12000);
            expect(AdminErrorEnum.USER_IDENTIFIER_EMPTY.code).toBeGreaterThanOrEqual(12000);
            expect(AdminErrorEnum.USER_IDENTIFIER_EMPTY.code).toBeLessThan(13000);
            expect(AdminErrorEnum.DICT_NOT_DATA.code).toBeGreaterThanOrEqual(13000);
            expect(AdminErrorEnum.DICT_NOT_DATA.code).toBeLessThan(14000);
        });
    });

    /**
     * 测试错误类的扩展性
     */
    describe('Error Class Extensibility', () => {
        it('should support creating custom error subclasses', () => {
            // 创建一个新的错误类继承自AdminBusinessError
            class CustomUserDataError extends AdminBusinessError {
                constructor() {
                    super(AdminErrorEnum.BAD_USER_DATA);
                    this.name = 'CustomUserDataError';
                    // 确保正确的原型链
                    Object.setPrototypeOf(this, CustomUserDataError.prototype);
                }
            }

            const error = new CustomUserDataError();
            
            expect(error).toBeInstanceOf(CustomUserDataError);
            expect(error).toBeInstanceOf(AdminBusinessError);
            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe(AdminErrorEnum.BAD_USER_DATA.error);
            expect(error.businessCode).toBe(AdminErrorEnum.BAD_USER_DATA.code);
        });

        it('should support error class with additional properties', () => {
            // 创建带有额外属性的错误类
            class DetailedError extends AdminBusinessError {
                public details: any;
                public timestamp: Date;

                constructor(adminError: typeof AdminErrorEnum[keyof typeof AdminErrorEnum], details?: any) {
                    super(adminError);
                    this.details = details;
                    this.timestamp = new Date();
                    this.name = 'DetailedError';
                }
            }

            const details = { userId: 123, action: 'login' };
            const error = new DetailedError(AdminErrorEnum.CAPTCHA_ERROR, details);

            expect(error.details).toBe(details);
            expect(error.timestamp).toBeInstanceOf(Date);
            expect(error.message).toBe('验证码错误');
            expect(error.businessCode).toBe(10003);
        });

        it('should support error factory pattern', () => {
            // 错误工厂函数
            const createAdminError = (errorObj: typeof AdminErrorEnum[keyof typeof AdminErrorEnum]) => {
                return new AdminBusinessError(errorObj);
            };

            const captchaError = createAdminError(AdminErrorEnum.CAPTCHA_ERROR);
            const userPwdError = createAdminError(AdminErrorEnum.USR_PWD_ERROR);

            expect(captchaError.message).toBe(AdminErrorEnum.CAPTCHA_ERROR.error);
            expect(captchaError.businessCode).toBe(AdminErrorEnum.CAPTCHA_ERROR.code);
            expect(userPwdError.message).toBe(AdminErrorEnum.USR_PWD_ERROR.error);
            expect(userPwdError.businessCode).toBe(AdminErrorEnum.USR_PWD_ERROR.code);
        });
    });

    /**
     * 测试错误处理的性能和内存使用
     */
    describe('Error Performance', () => {
        it('should create errors efficiently', () => {
            const startTime = Date.now();
            const errors = [];

            // 创建大量错误实例
            for (let i = 0; i < 1000; i++) {
                errors.push(new AdminBusinessError(AdminErrorEnum.CAPTCHA_ERROR));
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(errors).toHaveLength(1000);
            expect(duration).toBeLessThan(200); // 应该在200ms内完成
        });

        it('should handle error creation without memory leaks', () => {
            // 创建和销毁错误实例
            for (let i = 0; i < 100; i++) {
                const error = new AdminBusinessError(AdminErrorEnum.CAPTCHA_ERROR);
                expect(error.message).toBe('验证码错误');
                // 错误对象会被垃圾回收
            }

            // 验证错误枚举没有被修改
            expect(AdminErrorEnum.CAPTCHA_ERROR.error).toBe('验证码错误');
            expect(AdminErrorEnum.CAPTCHA_ERROR.code).toBe(10003);
        });

        it('should handle different error types efficiently', () => {
            const errorTypes = [
                () => new AdminBusinessError(AdminErrorEnum.CAPTCHA_ERROR),
                () => new AdminBusinessError(BusinessErrors.USER_IDENTIFIER_EMPTY),
                () => new AdminBusinessError(UserDataErrors.USER_NOT_FOUND),
                () => new AdminBusinessError(SystemErrors.DICT_NOT_DATA)
            ];

            const startTime = Date.now();
            
            for (let i = 0; i < 100; i++) {
                errorTypes.forEach(createError => {
                    const error = createError();
                    expect(error).toBeInstanceOf(AdminBusinessError);
                });
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(100); // 应该在100ms内完成
        });
    });

    /**
     * 测试分类错误对象
     */
    describe('Categorized Error Objects', () => {
        it('should have valid AuthErrors', () => {
            expect(AuthErrors.CAPTCHA_ERROR).toEqual(AdminErrorEnum.CAPTCHA_ERROR);
            expect(AuthErrors.USR_PWD_ERROR).toEqual(AdminErrorEnum.USR_PWD_ERROR);
            expect(AuthErrors.PERMISSION_DENIED).toEqual(AdminErrorEnum.PERMISSION_DENIED);
        });

        it('should have valid UserDataErrors', () => {
            expect(UserDataErrors.BAD_USER_DATA).toEqual(AdminErrorEnum.BAD_USER_DATA);
            expect(UserDataErrors.USER_NOT_FOUND).toEqual(AdminErrorEnum.USER_NOT_FOUND);
            expect(UserDataErrors.ROLE_NOT_FOUND).toEqual(AdminErrorEnum.ROLE_NOT_FOUND);
        });

        it('should have valid BusinessErrors', () => {
            expect(BusinessErrors.USER_IDENTIFIER_EMPTY).toEqual(AdminErrorEnum.USER_IDENTIFIER_EMPTY);
            expect(BusinessErrors.ROLE_IDENTIFIER_EMPTY).toEqual(AdminErrorEnum.ROLE_IDENTIFIER_EMPTY);
            expect(BusinessErrors.CODE_ALREADY_EXISTS).toEqual(AdminErrorEnum.CODE_ALREADY_EXISTS);
        });

        it('should have valid SystemErrors', () => {
            expect(SystemErrors.DICT_NOT_DATA).toEqual(AdminErrorEnum.DICT_NOT_DATA);
            expect(SystemErrors.DEMO_ENVIRONMENT_RESTRICTION).toEqual(AdminErrorEnum.DEMO_ENVIRONMENT_RESTRICTION);
            expect(SystemErrors.DEMO_MENU_DELETE_FORBIDDEN).toEqual(AdminErrorEnum.DEMO_MENU_DELETE_FORBIDDEN);
        });
    });
});