const { execSync } = require('child_process');
const path = require('path');

// 设置测试超时时间
jest.setTimeout(30000);

// 加载测试环境变量
require('dotenv').config({ path: path.join(__dirname, 'unittest.env') });



// 在每个测试文件开始前重置数据库（只执行一次）
beforeAll(async () => {
  // console.log('🔄 重置测试数据库...');
  try {
    // 推送数据库结构（这会重置数据库）
    // 使用环境变量中的 DATABASE_URL，不再硬编码
    execSync('npx prisma db push --force-reset', {
      stdio: 'pipe', // 减少输出噪音
      cwd: __dirname,
      env: process.env // 直接使用当前环境变量，包括从 unittest.env 加载的
    });
    // console.log('✅ 数据库结构已推送');

    // 运行种子数据
    execSync('npx prisma db seed', {
      stdio: 'pipe', // 减少输出噪音
      cwd: __dirname,
      env: process.env // 直接使用当前环境变量
    });
    // console.log('✅ 测试数据已初始化');
    console.log('🔄 测试数据库已重置');
  } catch (error) {
    console.error('❌ 数据库重置失败:', error.message);
    throw error;
  }
});

// 在每个测试文件结束后清理
afterAll(async () => {
  // 给一些时间让数据库连接关闭
  await new Promise(resolve => setTimeout(resolve, 100));
});