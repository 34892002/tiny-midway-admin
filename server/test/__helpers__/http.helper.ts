/**
 * HTTP 请求相关测试工具
 */

import { Application } from '@midwayjs/koa';
import { createHttpRequest } from '@midwayjs/mock';
import { HttpClient, RequestOptions, Response, TestErrorType, TestError, FileUploadOptions } from './types';

/**
 * HTTP 工具类
 */
export class HttpHelper {
  /**
   * 创建已认证的 HTTP 客户端
   * @param app 应用实例
   * @param token 认证 Token
   * @returns HTTP 客户端
   */
  static createAuthenticatedClient(app: Application, token?: string): HttpClient {
    const http = createHttpRequest(app);
    
    return {
      get: async (url: string, options?: RequestOptions) => {
        let request = http.get(url);
        
        if (token) {
          request = request.set('Authorization', `Bearer ${token}`);
        }
        
        if (options?.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            request = request.set(key, value);
          });
        }
        
        if (options?.query) {
          request = request.query(options.query);
        }
        
        if (options?.timeout) {
          request = request.timeout(options.timeout);
        }
        
        const response = await request;
        return this.normalizeResponse(response);
      },

      post: async (url: string, data?: any, options?: RequestOptions) => {
        let request = http.post(url);
        
        if (token) {
          request = request.set('Authorization', `Bearer ${token}`);
        }
        
        if (options?.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            request = request.set(key, value);
          });
        }
        
        if (data) {
          request = request.send(data);
        }
        
        if (options?.timeout) {
          request = request.timeout(options.timeout);
        }
        
        const response = await request;
        return this.normalizeResponse(response);
      },

      put: async (url: string, data?: any, options?: RequestOptions) => {
        let request = http.put(url);
        
        if (token) {
          request = request.set('Authorization', `Bearer ${token}`);
        }
        
        if (options?.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            request = request.set(key, value);
          });
        }
        
        if (data) {
          request = request.send(data);
        }
        
        if (options?.timeout) {
          request = request.timeout(options.timeout);
        }
        
        const response = await request;
        return this.normalizeResponse(response);
      },

      delete: async (url: string, options?: RequestOptions) => {
        let request = http.delete(url);
        
        if (token) {
          request = request.set('Authorization', `Bearer ${token}`);
        }
        
        if (options?.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            request = request.set(key, value);
          });
        }
        
        if (options?.timeout) {
          request = request.timeout(options.timeout);
        }
        
        const response = await request;
        return this.normalizeResponse(response);
      },

      patch: async (url: string, data?: any, options?: RequestOptions) => {
        let request = http.patch(url);
        
        if (token) {
          request = request.set('Authorization', `Bearer ${token}`);
        }
        
        if (options?.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            request = request.set(key, value);
          });
        }
        
        if (data) {
          request = request.send(data);
        }
        
        if (options?.timeout) {
          request = request.timeout(options.timeout);
        }
        
        const response = await request;
        return this.normalizeResponse(response);
      },

      upload: async (url: string, options: FileUploadOptions) => {
        let request = http.post(url);
        
        if (token) {
          request = request.set('Authorization', `Bearer ${token}`);
        }
        
        if (options.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            request = request.set(key, value);
          });
        }
        
        if (options.fields) {
          Object.entries(options.fields).forEach(([key, value]) => {
            request = request.field(key, value);
          });
        }
        
        if (options.files) {
          options.files.forEach(({ fieldName, filePath }) => {
            request = request.attach(fieldName, filePath);
          });
        }
        
        if (options.timeout) {
          request = request.timeout(options.timeout);
        }
        
        const response = await request;
        return this.normalizeResponse(response);
      }
    };
  }

  /**
   * 创建匿名 HTTP 客户端
   * @param app 应用实例
   * @returns HTTP 客户端
   */
  static createAnonymousClient(app: Application): HttpClient {
    return this.createAuthenticatedClient(app);
  }

  /**
   * 发送 GET 请求
   * @param url 请求 URL
   * @param options 请求选项
   * @returns 响应结果
   */
  static async get(url: string, options?: RequestOptions): Promise<Response> {
    throw new TestError(
      TestErrorType.SETUP_ERROR,
      'Static HTTP methods require an app instance. Use createAuthenticatedClient or createAnonymousClient instead.',
      { url, options }
    );
  }

  /**
   * 发送 POST 请求
   * @param url 请求 URL
   * @param data 请求数据
   * @param options 请求选项
   * @returns 响应结果
   */
  static async post(url: string, data?: any, options?: RequestOptions): Promise<Response> {
    throw new TestError(
      TestErrorType.SETUP_ERROR,
      'Static HTTP methods require an app instance. Use createAuthenticatedClient or createAnonymousClient instead.',
      { url, data, options }
    );
  }

  /**
   * 发送 PUT 请求
   * @param url 请求 URL
   * @param data 请求数据
   * @param options 请求选项
   * @returns 响应结果
   */
  static async put(url: string, data?: any, options?: RequestOptions): Promise<Response> {
    throw new TestError(
      TestErrorType.SETUP_ERROR,
      'Static HTTP methods require an app instance. Use createAuthenticatedClient or createAnonymousClient instead.',
      { url, data, options }
    );
  }

  /**
   * 发送 DELETE 请求
   * @param url 请求 URL
   * @param options 请求选项
   * @returns 响应结果
   */
  static async delete(url: string, options?: RequestOptions): Promise<Response> {
    throw new TestError(
      TestErrorType.SETUP_ERROR,
      'Static HTTP methods require an app instance. Use createAuthenticatedClient or createAnonymousClient instead.',
      { url, options }
    );
  }

  /**
   * 验证成功响应
   * @param response 响应对象
   */
  static expectSuccess(response: Response): void {
    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
  }

  /**
   * 验证错误响应
   * @param response 响应对象
   * @param expectedCode 期望的错误码
   */
  static expectError(response: Response, expectedCode?: number): void {
    if (expectedCode !== undefined) {
      expect(response.body.code).toBe(expectedCode);
    } else {
      expect(response.body.code).not.toBe(0);
    }
  }

  /**
   * 标准化响应对象
   * @param response 原始响应
   * @returns 标准化响应
   */
  private static normalizeResponse(response: any): Response {
    return {
      status: response.status,
      body: response.body,
      text: response.text,
      headers: response.headers || {}
    };
  }

  /**
   * 创建带有默认配置的 HTTP 客户端
   * @param app 应用实例
   * @param config 默认配置
   * @returns HTTP 客户端
   */
  static createConfiguredClient(app: Application, config: {
    token?: string;
    headers?: Record<string, string>;
    timeout?: number;
  }): HttpClient {
    const client = this.createAuthenticatedClient(app, config.token);
    
    // 包装客户端方法以应用默认配置
    return {
      get: (url: string, options?: RequestOptions) => {
        const mergedOptions = this.mergeOptions(config, options);
        return client.get(url, mergedOptions);
      },
      post: (url: string, data?: any, options?: RequestOptions) => {
        const mergedOptions = this.mergeOptions(config, options);
        return client.post(url, data, mergedOptions);
      },
      put: (url: string, data?: any, options?: RequestOptions) => {
        const mergedOptions = this.mergeOptions(config, options);
        return client.put(url, data, mergedOptions);
      },
      delete: (url: string, options?: RequestOptions) => {
        const mergedOptions = this.mergeOptions(config, options);
        return client.delete(url, mergedOptions);
      },
      patch: (url: string, data?: any, options?: RequestOptions) => {
        const mergedOptions = this.mergeOptions(config, options);
        return client.patch(url, data, mergedOptions);
      },
      upload: (url: string, uploadOptions: FileUploadOptions) => {
        const mergedOptions = {
          ...uploadOptions,
          headers: { ...config.headers, ...uploadOptions.headers },
          timeout: uploadOptions.timeout || config.timeout
        };
        return client.upload(url, mergedOptions);
      }
    };
  }

  /**
   * 合并请求选项
   * @param defaultConfig 默认配置
   * @param options 请求选项
   * @returns 合并后的选项
   */
  private static mergeOptions(
    defaultConfig: { headers?: Record<string, string>; timeout?: number },
    options?: RequestOptions
  ): RequestOptions {
    return {
      headers: { ...defaultConfig.headers, ...options?.headers },
      query: options?.query,
      timeout: options?.timeout || defaultConfig.timeout
    };
  }

  /**
   * 批量发送请求
   * @param client HTTP 客户端
   * @param requests 请求列表
   * @returns 响应列表
   */
  static async batchRequests(
    client: HttpClient,
    requests: Array<{
      method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'upload';
      url: string;
      data?: any;
      options?: RequestOptions;
      uploadOptions?: FileUploadOptions;
    }>
  ): Promise<Response[]> {
    const promises = requests.map(req => {
      switch (req.method) {
        case 'get':
          return client.get(req.url, req.options);
        case 'post':
          return client.post(req.url, req.data, req.options);
        case 'put':
          return client.put(req.url, req.data, req.options);
        case 'delete':
          return client.delete(req.url, req.options);
        case 'patch':
          return client.patch(req.url, req.data, req.options);
        case 'upload':
          if (!req.uploadOptions) {
            throw new TestError(
              TestErrorType.SETUP_ERROR,
              'Upload method requires uploadOptions',
              { request: req }
            );
          }
          return client.upload(req.url, req.uploadOptions);
        default:
          throw new TestError(
            TestErrorType.SETUP_ERROR,
            `Unsupported HTTP method: ${req.method}`,
            { request: req }
          );
      }
    });

    return Promise.all(promises);
  }

  /**
   * 验证响应结构
   * @param response 响应对象
   * @param expectedStructure 期望的结构
   */
  static expectResponseStructure(response: Response, expectedStructure: any): void {
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(expectedStructure);
  }

  /**
   * 验证分页响应
   * @param response 响应对象
   * @param expectedPageInfo 期望的分页信息
   */
  static expectPaginatedResponse(response: Response, expectedPageInfo?: {
    currentPage?: number;
    pageSize?: number;
    total?: number;
  }): void {
    this.expectSuccess(response);
    expect(response.body.data).toHaveProperty('records');
    expect(response.body.data).toHaveProperty('total');
    expect(response.body.data).toHaveProperty('currentPage');
    expect(response.body.data).toHaveProperty('pageSize');
    
    if (expectedPageInfo) {
      if (expectedPageInfo.currentPage !== undefined) {
        expect(response.body.data.currentPage).toBe(expectedPageInfo.currentPage);
      }
      if (expectedPageInfo.pageSize !== undefined) {
        expect(response.body.data.pageSize).toBe(expectedPageInfo.pageSize);
      }
      if (expectedPageInfo.total !== undefined) {
        expect(response.body.data.total).toBe(expectedPageInfo.total);
      }
    }
  }
}