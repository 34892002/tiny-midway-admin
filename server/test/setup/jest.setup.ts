/**
 * Jest 全局设置
 */

import { setupTestEnvironment, cleanupTestEnvironment } from './environment.setup';
import { setupTestDatabase, cleanupTestDatabase } from './database.setup';

/**
 * Jest 全局设置函数
 * 在所有测试开始前执行
 */
export async function setupJest(): Promise<void> {
  // 设置测试环境变量
  setupTestEnvironment();
  
  // 设置测试数据库
  await setupTestDatabase();
  
  // 设置 Jest 超时时间
  jest.setTimeout(30000);
  
  console.log('Jest setup completed');
}

/**
 * Jest 全局清理函数
 * 在所有测试结束后执行
 */
export async function teardownJest(): Promise<void> {
  // 清理测试数据库
  await cleanupTestDatabase();
  
  // 清理测试环境
  cleanupTestEnvironment();
  
  console.log('Jest teardown completed');
}

// 如果直接运行此文件，执行设置
if (require.main === module) {
  setupJest().catch(console.error);
}