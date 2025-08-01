/**
 * 数据库测试设置
 */

/**
 * 数据库测试配置
 */
export const DATABASE_TEST_CONFIG = {
  // 测试数据库 URL
  url: 'file:./test.db',
  
  // 是否在测试间重置数据库
  resetBetweenTests: true,
  
  // 数据库连接池配置
  pool: {
    min: 1,
    max: 5,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100
  }
};

/**
 * 设置测试数据库
 */
export async function setupTestDatabase(): Promise<void> {
  const { DatabaseHelper } = await import('../__helpers__/database.helper');
  await DatabaseHelper.setupTestDatabase();
}

/**
 * 清理测试数据库
 */
export async function cleanupTestDatabase(): Promise<void> {
  const { DatabaseHelper } = await import('../__helpers__/database.helper');
  await DatabaseHelper.cleanupTestDatabase();
}