/**
 * 认证相关测试工具
 */

import { Application } from '@midwayjs/koa';
import { createHttpRequest } from '@midwayjs/mock';
import * as crypto from 'crypto';
import { LoginCredentials, LoginResult, RefreshResult, CaptchaResult } from './types';

/**
 * 默认登录配置
 */
export const DEFAULT_LOGIN_CONFIG = {
  username: 'admin',
  password: '123456',
  passwordKey: 'mn-admin',
  captcha: '0000'
};

/**
 * 认证工具类
 */
export class AuthHelper {
  /**
   * 执行登录操作
   * @param app 应用实例
   * @param credentials 登录凭据
   * @returns 登录结果
   */
  static async performLogin(
    app: Application, 
    credentials?: LoginCredentials
  ): Promise<LoginResult> {
    const {
      username = DEFAULT_LOGIN_CONFIG.username,
      password = DEFAULT_LOGIN_CONFIG.password,
      captcha = DEFAULT_LOGIN_CONFIG.captcha,
      isRemember = false
    } = credentials || {};

    const http = createHttpRequest(app);
    
    // 获取验证码
    const captchaResult = await http.get('/auth/captcha');
    const captchaId = captchaResult.body.data.id;
    
    // 加密密码
    const encryptedPassword = this.encryptPassword(password);

    // 发送登录请求
    return await http.post('/auth/login').send({
      username,
      password: encryptedPassword,
      captchaId,
      captcha,
      isRemember
    });
  }

  /**
   * 加密密码
   * @param password 原始密码
   * @returns 加密后的密码
   */
  static encryptPassword(password: string): string {
    const passwordKey = process.env.PASSWORD_KEY || DEFAULT_LOGIN_CONFIG.passwordKey;
    const hash = crypto.createHash('md5').update(password + passwordKey).digest('hex');
    return Buffer.from(hash, 'hex').toString('base64');
  }

  /**
   * 获取管理员 Token
   * @param app 应用实例
   * @returns 管理员 Token
   */
  static async getAdminToken(app: Application): Promise<string> {
    const loginResult = await this.performLogin(app);
    
    if (loginResult.status !== 200 || loginResult.body.code !== 0) {
      throw new Error(`Failed to get admin token: ${JSON.stringify(loginResult.body)}`);
    }
    
    return loginResult.body.data.accessToken;
  }

  /**
   * 刷新 Token
   * @param app 应用实例
   * @param refreshToken 刷新 Token
   * @returns 刷新结果
   */
  static async refreshToken(app: Application, refreshToken: string): Promise<RefreshResult> {
    const http = createHttpRequest(app);
    
    return await http.post('/auth/refreshToken').send({
      token: refreshToken
    });
  }

  /**
   * 验证 Token
   * @param token Token 字符串
   * @returns 是否有效
   */
  static validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    try {
      // 简单的 JWT 格式验证
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      
      // 验证每个部分都是有效的 base64
      parts.forEach(part => {
        Buffer.from(part, 'base64');
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取验证码
   * @param app 应用实例
   * @returns 验证码结果
   */
  static async getCaptcha(app: Application): Promise<CaptchaResult> {
    const http = createHttpRequest(app);
    return await http.get('/auth/captcha');
  }

  /**
   * 创建带认证的 HTTP 客户端
   * @param app 应用实例
   * @param token 认证 Token
   * @returns HTTP 客户端
   */
  static createAuthenticatedClient(app: Application, token: string) {
    const http = createHttpRequest(app);
    return {
      get: (url: string, options?: any) => 
        http.get(url).set('Authorization', `Bearer ${token}`).query(options?.query || {}),
      post: (url: string, data?: any, options?: any) => 
        http.post(url).set('Authorization', `Bearer ${token}`).send(data),
      put: (url: string, data?: any, options?: any) => 
        http.put(url).set('Authorization', `Bearer ${token}`).send(data),
      delete: (url: string, options?: any) => 
        http.delete(url).set('Authorization', `Bearer ${token}`)
    };
  }

  /**
   * 验证登录响应
   * @param loginResult 登录结果
   * @returns 是否登录成功
   */
  static isLoginSuccessful(loginResult: LoginResult): boolean {
    return loginResult.status === 200 && 
           loginResult.body.code === 0 && 
           !!loginResult.body.data?.accessToken;
  }

  /**
   * 从登录结果中提取 Token 信息
   * @param loginResult 登录结果
   * @returns Token 信息
   */
  static extractTokenInfo(loginResult: LoginResult) {
    if (!this.isLoginSuccessful(loginResult) || !loginResult.body.data) {
      throw new Error('Login was not successful');
    }
    
    return {
      accessToken: loginResult.body.data.accessToken,
      refreshToken: loginResult.body.data.refreshToken,
      tokenExp: loginResult.body.data.tokenExp,
      refreshTokenExp: loginResult.body.data.refreshTokenExp
    };
  }
}