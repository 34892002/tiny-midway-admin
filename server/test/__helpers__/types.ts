/**
 * 测试工具库类型定义
 */

// 登录凭据接口
export interface LoginCredentials {
  username?: string;
  password?: string;
  captcha?: string;
  isRemember?: boolean;
}

// 登录结果接口
export interface LoginResult {
  status: number;
  body: {
    code: number;
    message?: string;
    data?: {
      accessToken: string;
      refreshToken: string;
      tokenExp: number;
      refreshTokenExp: number;
    };
  };
}

// Token 刷新结果接口
export interface RefreshResult {
  status: number;
  body: {
    code: number;
    message?: string;
    data?: {
      accessToken: string;
      tokenExp: number;
    };
  };
}

// 验证码结果接口
export interface CaptchaResult {
  status: number;
  body: {
    code: number;
    message?: string;
    data?: {
      id: string;
      img: string;
      captcha?: string;
      captchaId?: string;
    };
  };
}

// HTTP 请求选项接口
export interface RequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, any>;
  timeout?: number;
}

// HTTP 响应接口
export interface Response {
  status: number;
  body: any;
  text: string;
  headers: Record<string, string>;
}

// 文件上传选项接口
export interface FileUploadOptions {
  fields?: Record<string, string>;
  files?: Array<{ fieldName: string; filePath: string }>;
  headers?: Record<string, string>;
  timeout?: number;
}

// HTTP 客户端接口
export interface HttpClient {
  get(url: string, options?: RequestOptions): Promise<Response>;
  post(url: string, data?: any, options?: RequestOptions): Promise<Response>;
  put(url: string, data?: any, options?: RequestOptions): Promise<Response>;
  delete(url: string, options?: RequestOptions): Promise<Response>;
  patch(url: string, data?: any, options?: RequestOptions): Promise<Response>;
  upload(url: string, options: FileUploadOptions): Promise<Response>;
}

// 测试用户数据模型
export interface TestUser {
  id?: number;
  username: string;
  password: string;
  nickName: string;
  email: string;
  phone?: string;
  system?: boolean;
  roles?: string[];
}

// 测试角色数据模型
export interface TestRole {
  id?: number;
  name: string;
  code: string;
  description?: string;
  system?: boolean;
  policies: string[];
}

// 测试配置模型
export interface TestConfig {
  database: {
    url: string;
    resetBetweenTests: boolean;
  };
  auth: {
    defaultUsername: string;
    defaultPassword: string;
    passwordKey: string;
    defaultCaptcha: string;
  };
  performance: {
    enableParallel: boolean;
    maxConcurrency: number;
  };
}

// 测试错误类型枚举
export enum TestErrorType {
  SETUP_ERROR = 'SETUP_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  ASSERTION_ERROR = 'ASSERTION_ERROR',
  CLEANUP_ERROR = 'CLEANUP_ERROR'
}

// 测试错误类
export class TestError extends Error {
  constructor(
    public type: TestErrorType,
    message: string,
    public context?: any
  ) {
    super(message);
    this.name = 'TestError';
  }
}