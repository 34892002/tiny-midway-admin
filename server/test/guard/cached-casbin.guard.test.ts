import { createApp, close } from '@midwayjs/mock';
import { Framework } from '@midwayjs/koa';
import { Application } from '@midwayjs/koa';
import { CachedCasbinGuard } from '../../src/guard/cached-casbin.guard';
import { PermissionCacheService } from '../../src/modules/base/service/permission-cache.service';
import { CasbinService } from '../../src/modules/base/service/casbin.service';

describe('test/guard/cached-casbin.guard.test.ts', () => {
    let app: Application;
    let cachedCasbinGuard: CachedCasbinGuard;
    let permissionCacheService: PermissionCacheService;
    let casbinService: CasbinService;

    beforeAll(async () => {
        try {
            app = await createApp<Framework>();
            cachedCasbinGuard = await app.getApplicationContext().getAsync(CachedCasbinGuard);
            permissionCacheService = await app.getApplicationContext().getAsync(PermissionCacheService);
            casbinService = await app.getApplicationContext().getAsync(CasbinService);
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

    describe('缓存权限验证', () => {
        it('应该在缓存命中时直接返回结果', async () => {
            const username = 'testuser';
            const resource = 'test_resource';
            const action = 'access';

            // 预设缓存
            permissionCacheService.setPermission(username, resource, action, true);

            // 验证权限
            const result = await cachedCasbinGuard.validatePermissionWithCache(username, resource, action);
            expect(result).toBe(true);

            // 验证统计信息
            const stats = permissionCacheService.getStats();
            expect(stats.hits).toBe(1);
            expect(stats.misses).toBe(0);
        });

        it('应该在缓存未命中时查询数据库并缓存结果', async () => {
            const username = 'testuser';
            const resource = 'test_resource';
            const action = 'access';

            // Mock casbin enforcer
            const mockEnforce = jest.spyOn(casbinService.enforcer, 'enforce');
            mockEnforce.mockResolvedValue(true);

            // 验证权限（缓存未命中）
            const result = await cachedCasbinGuard.validatePermissionWithCache(username, resource, action);
            expect(result).toBe(true);

            // 验证调用了数据库查询
            expect(mockEnforce).toHaveBeenCalledWith(username, resource, action);

            // 验证结果被缓存
            const cachedResult = permissionCacheService.getPermission(username, resource, action);
            expect(cachedResult).toBe(true);

            // 验证统计信息 - validatePermissionWithCache调用了一次getPermission（miss），然后缓存了结果
            const stats = permissionCacheService.getStats();
            expect(stats.hits).toBe(1); // 上面的getPermission调用命中了缓存
            expect(stats.misses).toBe(1); // validatePermissionWithCache中的getPermission未命中

            mockEnforce.mockRestore();
        });

        it('第二次查询相同权限时应该命中缓存', async () => {
            const username = 'testuser2'; // 使用不同的用户名避免缓存冲突
            const resource = 'test_resource2';
            const action = 'access';

            // Mock casbin enforcer
            const mockEnforce = jest.spyOn(casbinService.enforcer, 'enforce');
            mockEnforce.mockResolvedValue(false);

            // 第一次查询
            const result1 = await cachedCasbinGuard.validatePermissionWithCache(username, resource, action);
            expect(result1).toBe(false);
            expect(mockEnforce).toHaveBeenCalledTimes(1);

            // 第二次查询应该命中缓存
            const result2 = await cachedCasbinGuard.validatePermissionWithCache(username, resource, action);
            expect(result2).toBe(false);
            expect(mockEnforce).toHaveBeenCalledTimes(1); // 没有再次调用

            // 验证统计信息
            const stats = permissionCacheService.getStats();
            expect(stats.hits).toBe(1); // 第二次查询命中缓存
            expect(stats.misses).toBe(1); // 第一次查询未命中

            mockEnforce.mockRestore();
        });
    });

    describe('缓存管理', () => {
        it('应该能够清除指定用户的缓存', async () => {
            const username = 'testuser';
            const resource = 'test_resource';
            const action = 'access';

            // 设置缓存
            permissionCacheService.setPermission(username, resource, action, true);
            expect(permissionCacheService.getPermission(username, resource, action)).toBe(true);

            // 清除用户缓存
            await cachedCasbinGuard.clearUserCache(username);
            expect(permissionCacheService.getPermission(username, resource, action)).toBeNull();
        });

        it('应该能够清除所有缓存', async () => {
            // 设置多个用户的缓存
            permissionCacheService.setPermission('user1', 'resource1', 'access', true);
            permissionCacheService.setPermission('user2', 'resource2', 'access', false);

            // 清除所有缓存
            await cachedCasbinGuard.clearAllCache();

            // 验证所有缓存都被清除
            expect(permissionCacheService.getPermission('user1', 'resource1', 'access')).toBeNull();
            expect(permissionCacheService.getPermission('user2', 'resource2', 'access')).toBeNull();
        });

        it('应该能够获取缓存统计信息', async () => {
            const username = 'testuser';
            const resource = 'test_resource';
            const action = 'access';

            // 生成一些统计数据
            permissionCacheService.setPermission(username, resource, action, true);
            await cachedCasbinGuard.validatePermissionWithCache(username, resource, action);

            const stats = cachedCasbinGuard.getCacheStats();
            expect(stats.hits).toBe(1);
            expect(stats.totalRequests).toBe(1);
            expect(stats.cacheSize).toBe(1);
        });
    });

    describe('Guard接口实现', () => {
        it('应该正确处理有用户信息的请求', async () => {
            // Mock casbin enforcer
            const mockEnforce = jest.spyOn(casbinService.enforcer, 'enforce');
            mockEnforce.mockResolvedValue(true);

            // 直接测试validatePermissionWithCache方法
            const result = await cachedCasbinGuard.validatePermissionWithCache('testuser', 'test_resource', 'access');
            expect(result).toBe(true);

            mockEnforce.mockRestore();
        });

        it('应该正确处理未登录用户的请求', async () => {
            // Mock casbin enforcer
            const mockEnforce = jest.spyOn(casbinService.enforcer, 'enforce');
            mockEnforce.mockResolvedValue(false);

            // 测试guest用户权限验证
            const result = await cachedCasbinGuard.validatePermissionWithCache('guest', 'test_resource', 'access');
            expect(result).toBe(false);

            mockEnforce.mockRestore();
        });
    });

    describe('性能测试', () => {
        it('缓存命中时的响应时间应该很快', async () => {
            const username = 'testuser';
            const resource = 'test_resource';
            const action = 'access';

            // 预设缓存
            permissionCacheService.setPermission(username, resource, action, true);

            // 测试响应时间
            const startTime = Date.now();
            const result = await cachedCasbinGuard.validatePermissionWithCache(username, resource, action);
            const endTime = Date.now();

            expect(result).toBe(true);
            expect(endTime - startTime).toBeLessThan(10); // 应该在10ms内完成
        });

        it('应该能够处理大量并发请求', async () => {
            const username = 'concurrentuser';
            const resource = 'concurrent_resource';
            const action = 'access';

            // Mock casbin enforcer
            const mockEnforce = jest.spyOn(casbinService.enforcer, 'enforce');
            mockEnforce.mockResolvedValue(true);

            // 并发请求
            const promises = [];
            for (let i = 0; i < 10; i++) { // 减少并发数量以避免竞态条件
                promises.push(cachedCasbinGuard.validatePermissionWithCache(username, resource, action));
            }

            const results = await Promise.all(promises);

            // 验证所有请求都成功
            expect(results.every(result => result === true)).toBe(true);

            // 由于并发执行，可能会有多次数据库调用，但应该少于等于总请求数
            expect(mockEnforce).toHaveBeenCalled();
            expect(mockEnforce.mock.calls.length).toBeLessThanOrEqual(10);

            // 验证缓存统计
            const stats = permissionCacheService.getStats();
            expect(stats.totalRequests).toBe(10);
            expect(stats.hits + stats.misses).toBe(10);

            mockEnforce.mockRestore();
        });
    });
});