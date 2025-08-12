/**
 * 测试环境设置
 */

/**
 * 设置测试环境变量
 */
export function setupTestEnvironment(): void {
  // 设置 Node 环境为测试模式
  process.env.NODE_ENV = 'unittest';
  
  // 设置测试数据库 URL
  process.env.DATABASE_URL = 'file:./test.db';
  
  // 设置其他测试相关环境变量
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.PASSWORD_KEY = 'test-password-key';
  
  // 禁用日志输出（可选）
  if (process.env.DISABLE_TEST_LOGS !== 'false') {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
}

/**
 * 清理测试环境
 */
export function cleanupTestEnvironment(): void {
  // 恢复原始环境变量（如果需要）
  // 这里可以添加清理逻辑
}