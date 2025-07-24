import { createApp, close } from '@midwayjs/mock';
import { Framework } from '@midwayjs/koa';
import { Application } from '@midwayjs/koa';
import { PermissionCacheService } from '../../src/modules/base/service/permission-cache.service';

describe('test/service/permission-cache.service.test.ts', () => {
  let app: Application;
  let permissionCacheService: PermissionCacheService;

  beforeAll(async () => {
    try {
      app = await createApp<Framework>();
      permissionCacheService = await app.getApplicationContext().getAsync(PermissionCacheService);
    } catch (err) {
      console.error('setup error', err);
      throw err;
    }
  });

  afterAll(async () => {
    permissionCacheService.stopCleanupTask();
    await close(app);
  });

  beforeEach(async () => {
    // 每个测试前清空缓存和统计
    permissionCacheService.clearAllCache();
    permissionCacheService.resetStats();
    // 重置配置为默认值
    permissionCacheService.updateConfig({
      ttl: 300,
      maxSize: 1000,
      enableCache: true
    });
  });

  describe('基础缓存功能', () => {
    it('应该能够设置和获取权限缓存', async () => {
      const username = 'testuser';
      const resource = 'test_resource';
      const action = 'read';
      const allowed = true;

      // 设置权限缓存
      permissionCacheService.setPermission(username, resource, action, allowed);

      // 获取权限缓存
      const result = permissionCacheService.getPermission(username, resource, action);
      expect(result).toBe(allowed);
    });

    it('缓存未命中时应该返回null', async () => {
      const result = permissionCacheService.getPermission('nonexistent', 'resource', 'action');
      expect(result).toBeNull();
    });

    it('应该能够清除指定用户的缓存', async () => {
      const username = 'testuser';
      const resource = 'test_resource';
      const action = 'read';

      // 设置缓存
      permissionCacheService.setPermission(username, resource, action, true);
      expect(permissionCacheService.getPermission(username, resource, action)).toBe(true);

      // 清除用户缓存
      permissionCacheService.clearUserCache(username);
      expect(permissionCacheService.getPermission(username, resource, action)).toBeNull();
    });

    it('应该能够清除所有缓存', async () => {
      // 设置多个用户的缓存
      permissionCacheService.setPermission('user1', 'resource1', 'read', true);
      permissionCacheService.setPermission('user2', 'resource2', 'write', false);

      // 清除所有缓存
      permissionCacheService.clearAllCache();

      // 验证所有缓存都被清除
      expect(permissionCacheService.getPermission('user1', 'resource1', 'read')).toBeNull();
      expect(permissionCacheService.getPermission('user2', 'resource2', 'write')).toBeNull();
    });
  });

  describe('TTL功能', () => {
    it('过期的缓存应该被自动清除', async () => {
      // 更新配置，设置很短的TTL
      permissionCacheService.updateConfig({ ttl: 1 }); // 1秒过期

      const username = 'testuser';
      const resource = 'test_resource';
      const action = 'read';

      // 设置缓存
      permissionCacheService.setPermission(username, resource, action, true);
      expect(permissionCacheService.getPermission(username, resource, action)).toBe(true);

      // 等待缓存过期
      await new Promise(resolve => setTimeout(resolve, 1100));

      // 缓存应该已过期
      expect(permissionCacheService.getPermission(username, resource, action)).toBeNull();
    });
  });

  describe('容量管理', () => {
    it('应该在达到最大容量时清理最旧的缓存', async () => {
      // 设置很小的最大容量
      permissionCacheService.updateConfig({ maxSize: 2 });

      // 添加缓存项
      permissionCacheService.setPermission('user1', 'resource', 'read', true);
      await new Promise(resolve => setTimeout(resolve, 10)); // 确保时间差异
      
      permissionCacheService.setPermission('user2', 'resource', 'read', true);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // 添加第三个用户，应该清理最旧的user1
      permissionCacheService.setPermission('user3', 'resource', 'read', true);

      // user1应该被清理，user2和user3应该存在
      expect(permissionCacheService.getPermission('user1', 'resource', 'read')).toBeNull();
      expect(permissionCacheService.getPermission('user2', 'resource', 'read')).toBe(true);
      expect(permissionCacheService.getPermission('user3', 'resource', 'read')).toBe(true);
    });
  });

  describe('统计功能', () => {
    it('应该正确统计缓存命中和未命中', async () => {
      const username = 'testuser';
      const resource = 'test_resource';
      const action = 'read';

      // 设置缓存
      permissionCacheService.setPermission(username, resource, action, true);

      // 命中缓存
      permissionCacheService.getPermission(username, resource, action);
      permissionCacheService.getPermission(username, resource, action);

      // 未命中缓存
      permissionCacheService.getPermission('nonexistent', 'resource', 'action');

      const stats = permissionCacheService.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.totalRequests).toBe(3);
      expect(stats.hitRate).toBeCloseTo(2/3, 2);
    });

    it('应该正确统计缓存大小', async () => {
      let stats = permissionCacheService.getStats();
      expect(stats.cacheSize).toBe(0);

      // 添加缓存项
      permissionCacheService.setPermission('user1', 'resource', 'read', true);
      permissionCacheService.setPermission('user2', 'resource', 'write', false);

      stats = permissionCacheService.getStats();
      expect(stats.cacheSize).toBe(2);

      // 清除一个用户的缓存
      permissionCacheService.clearUserCache('user1');
      stats = permissionCacheService.getStats();
      expect(stats.cacheSize).toBe(1);
    });

    it('应该能够重置统计信息', async () => {
      // 生成一些统计数据
      permissionCacheService.setPermission('user1', 'resource', 'read', true);
      permissionCacheService.getPermission('user1', 'resource', 'read');
      permissionCacheService.getPermission('nonexistent', 'resource', 'action');

      let stats = permissionCacheService.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);

      // 重置统计
      permissionCacheService.resetStats();
      stats = permissionCacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('配置管理', () => {
    it('应该能够获取和更新配置', async () => {
      const originalConfig = permissionCacheService.getConfig();
      expect(originalConfig.enableCache).toBe(true);

      // 更新配置
      permissionCacheService.updateConfig({ 
        enableCache: false,
        ttl: 600,
        maxSize: 500
      });

      const updatedConfig = permissionCacheService.getConfig();
      expect(updatedConfig.enableCache).toBe(false);
      expect(updatedConfig.ttl).toBe(600);
      expect(updatedConfig.maxSize).toBe(500);
    });

    it('禁用缓存时应该直接返回null', async () => {
      // 禁用缓存
      permissionCacheService.updateConfig({ enableCache: false });

      // 尝试设置和获取缓存
      permissionCacheService.setPermission('user1', 'resource', 'read', true);
      const result = permissionCacheService.getPermission('user1', 'resource', 'read');
      
      expect(result).toBeNull();
    });

    it('更新最大容量时应该清理超出的缓存', async () => {
      // 添加多个缓存项
      permissionCacheService.setPermission('user1', 'resource', 'read', true);
      await new Promise(resolve => setTimeout(resolve, 10));
      permissionCacheService.setPermission('user2', 'resource', 'read', true);
      await new Promise(resolve => setTimeout(resolve, 10));
      permissionCacheService.setPermission('user3', 'resource', 'read', true);

      let stats = permissionCacheService.getStats();
      expect(stats.cacheSize).toBe(3);

      // 更新最大容量为2
      permissionCacheService.updateConfig({ maxSize: 2 });

      stats = permissionCacheService.getStats();
      expect(stats.cacheSize).toBe(2);
      expect(stats.maxSize).toBe(2);
    });
  });

  describe('多权限缓存', () => {
    it('应该能够为同一用户缓存多个权限', async () => {
      const username = 'testuser';

      // 设置多个权限
      permissionCacheService.setPermission(username, 'resource1', 'read', true);
      permissionCacheService.setPermission(username, 'resource1', 'write', false);
      permissionCacheService.setPermission(username, 'resource2', 'read', true);

      // 验证所有权限都被正确缓存
      expect(permissionCacheService.getPermission(username, 'resource1', 'read')).toBe(true);
      expect(permissionCacheService.getPermission(username, 'resource1', 'write')).toBe(false);
      expect(permissionCacheService.getPermission(username, 'resource2', 'read')).toBe(true);
      expect(permissionCacheService.getPermission(username, 'resource2', 'write')).toBeNull();
    });

    it('清除用户缓存时应该清除该用户的所有权限', async () => {
      const username = 'testuser';

      // 设置多个权限
      permissionCacheService.setPermission(username, 'resource1', 'read', true);
      permissionCacheService.setPermission(username, 'resource1', 'write', false);
      permissionCacheService.setPermission(username, 'resource2', 'read', true);

      // 清除用户缓存
      permissionCacheService.clearUserCache(username);

      // 验证所有权限都被清除
      expect(permissionCacheService.getPermission(username, 'resource1', 'read')).toBeNull();
      expect(permissionCacheService.getPermission(username, 'resource1', 'write')).toBeNull();
      expect(permissionCacheService.getPermission(username, 'resource2', 'read')).toBeNull();
    });
  });
});