// - 10000-10999: 认证和授权相关错误
// - 11000-11999: 用户数据相关错误
// - 12000-12999: 业务逻辑错误
// - 13000-13999: 系统和配置错误

export const AdminErrorEnum = {
  CAPTCHA_ERROR: {
    code: 10003,
    error: '验证码错误',
  },
  USR_PWD_ERROR: {
    code: 10002,
    error: '用户名密码错误!',
  },
  BAD_USER_DATA: {
    code: 11007,
    error: '用户数据异常!',
  },
  TIMEOUT_USER_DATA: {
    code: 11008,
    error: '用户数据已更新',
  },
  DICT_NOT_DATA: {
    code: 13000,
    error: '未找到字典!',
  },
};

// 目前技术收益不大，没有使用
export class CustomError extends Error {
  code: number | string;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

// 目前技术收益不大，没有使用
export class CaptchaError extends CustomError {
  constructor() {
    super(AdminErrorEnum.CAPTCHA_ERROR.error, AdminErrorEnum.CAPTCHA_ERROR.code);
  }
}
