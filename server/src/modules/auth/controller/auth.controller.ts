import { Get, Post, Inject, Controller, Body, Query, Config } from '@midwayjs/core';
import { CaptchaService } from '@midwayjs/captcha';
import { Context } from '@midwayjs/koa';
import { AuthService } from '../service/auth.service';
import { UserService } from '../../system/service/user.service';
import { JwtService } from '@midwayjs/jwt';
import { LoginDTO } from '../dto/auth';
import { JwtPassportMiddleware } from '../../../middleware/jwt.middleware';

import { AdminErrorEnum } from '../../../error/admin.error';
import * as _ from 'lodash';

@Controller('/auth')
export class AuthController {
  @Config('mnAdmin')
  mnAdmin;

  @Inject()
  ctx: Context;
  @Inject()
  authService: AuthService;
  @Inject()
  userService: UserService;
  @Inject()
  captchaService: CaptchaService;
  @Inject()
  jwt: JwtService;

  @Post('/login')
  async login(@Body() login: LoginDTO) {
    const capPassed = await this.captchaService.check(
      login.captchaId,
      login.captcha
    );
    const isDemo = process.env.RUN_DEMO === 'true' || process.env.NODE_ENV === 'unittest';
    if (!capPassed && !isDemo) {
      // 业务逻辑的错误，不用抛出框架错误，
      // throw new WEBError();
      return AdminErrorEnum.CAPTCHA_ERROR;
    }
    const user = await this.authService.login(login.username, login.password);
    if (user) {
      // 是否记住登录状态
      const expiresIn = login.isRemember ?
        this.mnAdmin.token.refresh_token_max :
        this.mnAdmin.token.refresh_token_default;
      // 创建存入jwt的数据
      const _user = _.pick(user, ['id', 'username', 'nickName']);
      // 签发token
      const accessToken = await this.jwt.sign(_user, { expiresIn: this.mnAdmin.token.token_default });
      const referenceParams = { id: user.id, passwordVersion: user.passwordVersion };
      const refreshToken = await this.jwt.sign(referenceParams, { expiresIn });
      const _accessToken = this.jwt.decode(accessToken) as any
      const _refreshToken = this.jwt.decode(refreshToken) as any
      return {
        accessToken,
        refreshToken,
        tokenExp: _accessToken.exp,
        refreshTokenExp: _refreshToken.exp,
      };
    } else {
      return AdminErrorEnum.USR_PWD_ERROR;
    }
  }
  // 示例：获取图像验证码
  @Get('/captcha')
  async getImageCaptcha() {
    const { id, imageBase64 } = await this.captchaService.image({
      width: 80,
      height: 40,
    });
    // // 对 Base64 字符串进行 URL 解码
    // const decodedBase64 = decodeURIComponent(imageBase64.split(',')[1]);
    // // 将解码后的字符串转换为 Buffer
    // const imageBuffer = Buffer.from(decodedBase64);
    // this.ctx.set('Content-Type', 'image/svg+xml');
    // return imageBuffer;
    return { id, imageBase64 };
  }
  // 退出登录
  @Post('/logout')
  async logout() {
    return true;
  }
  // 校验菜单的权限
  @Get('/menu', { middleware: [ JwtPassportMiddleware ] })
  async checkMenuAccess(@Query('path') path: string): Promise<any> {
    // true 表示有权限
    const username = this.ctx.state.user?.username;
    const data = await this.authService.checkMenuAccess(username, path);
    return data;
  }

  @Post('/refreshToken')
  async refresh(@Body('token') token: string) {
    if (!token) {
      throw new Error('TOKEN_NULL');
    }
    const refreshToken = this.jwt.decode(token) as any
    if (!refreshToken) throw new Error('TOKEN_ERROR');
    const { id, passwordVersion, exp } = refreshToken
    const isDead = new Date().getTime() > exp * 1000
    if (isDead) {
      throw new Error('TOKEN_EXPIRED');
    }
    const user = await this.userService.safeUserById(id);
    // 如果密码版本号和token中的不一致，说明密码被修改过，需要重新登录
    if (user.passwordVersion !== passwordVersion) {
      throw new Error('TOKEN_PASSWORD_VERSION_ERROR');
    }
    // 续期
    const accessToken = await this.jwt.sign(user, { expiresIn: this.mnAdmin.token.token_default });
    const _token = this.jwt.decode(accessToken) as any
    // refresh到期之后不再续，需要重新登录，所以不返回refreshToken
    return {
      accessToken,
      tokenExp: _token.exp,
    };

  }
}
