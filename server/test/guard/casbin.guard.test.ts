import { createApp, close } from '@midwayjs/mock';
import { Framework } from '@midwayjs/koa';
import { Application } from '@midwayjs/koa';
import { CasbinGuard } from '../../src/guard/casbin';
import { PermissionCacheService } from '../../src/modules/base/service/permission-cache.service';
import { CasbinService } from '../../src/modules/base/service/casbin.service';

describe('test/guard/casbin.guard.test.ts', () => {
    let app: Application;
    let casbinGuard: CasbinGuard;
    let permissionCacheService: PermissionCacheService;
    let casbinService: CasbinService;

    beforeAll(async () => {
        try {
            app = await createApp<Framework>();
            casbinGuard = await app.getApplicationContext().getAsync(CasbinGuard);
            permissionCacheService = await app.getApplicationContext().getAsync(PermissionCacheService);
            casbinService = await app.getApplicationContext().getAsync(CasbinService);
        } catch (error) {
            console.error('Setup failed:', error);
            throw error;
        }
    });

    afterAll(async () => {
        // Stop the cleanup task to prevent Jest from hanging
        permissionCacheService.stopCleanupTask();
        await close(app);
    });

    beforeEach(async () => {
        // 清除缓存以确保每个测试的独立性
        await casbinGuard.clearAllCache();
        // 重置统计信息以确保测试独立性
        permissionCacheService.resetStats();
    });

    describe('缓存集成权限验证', () => {
        it('应该使用缓存机制进行权限验证', async () => {
            const username = 'testuser';
            const resource = 'test_resource';
            const action = 'access';

            // 模拟 Casbin enforcer 返回 true
            const mockEnforce = jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(true);

            // 第一次验证权限
            const result1 = await casbinGuard.validatePermissionWithCache(username, resource, action);
            expect(result1).toBe(true);
            expect(mockEnforce).toHaveBeenCalledTimes(1);

            // 第二次验证相同权限应该命中缓存
            const result2 = await casbinGuard.validatePermissionWithCache(username, resource, action);
            expect(result2).toBe(true);
            expect(mockEnforce).toHaveBeenCalledTimes(1); // 没有再次调用

            mockEnforce.mockRestore();
        });

        it('应该能够清除用户缓存', async () => {
            const username = 'testuser';
            const resource = 'test_resource';
            const action = 'access';

            // 先设置缓存
            permissionCacheService.setPermission(username, resource, action, true);
            expect(permissionCacheService.getPermission(username, resource, action)).toBe(true);

            // 清除用户缓存
            await casbinGuard.clearUserCache(username);
            expect(permissionCacheService.getPermission(username, resource, action)).toBeNull();
        });

        it('应该能够获取缓存统计信息', async () => {
            const username = 'testuser';
            const resource = 'test_resource';
            const action = 'access';

            // 生成一些统计数据
            permissionCacheService.setPermission(username, resource, action, true);
            await casbinGuard.validatePermissionWithCache(username, resource, action);

            const stats = casbinGuard.getCacheStats();
            expect(stats.hits).toBe(1);
            expect(stats.totalRequests).toBe(1);
            expect(stats.hitRate).toBe(1);
        });
    });

    describe('性能测试', () => {
        it('权限验证响应时间应该在合理范围内', async () => {
            const username = 'testuser';
            const resource = 'test_resource';
            const action = 'access';

            // 模拟 Casbin enforcer
            const mockEnforce = jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(true);

            // 测试响应时间
            const startTime = Date.now();
            const result = await casbinGuard.validatePermissionWithCache(username, resource, action);
            const endTime = Date.now();

            expect(result).toBe(true);
            expect(endTime - startTime).toBeLessThan(50); // 应该在50ms内完成

            mockEnforce.mockRestore();
        });

        it('缓存命中时响应时间应该更快', async () => {
            const username = 'testuser';
            const resource = 'test_resource';
            const action = 'access';

            // 先设置缓存
            permissionCacheService.setPermission(username, resource, action, true);

            // 测试缓存命中的响应时间
            const startTime = Date.now();
            const result = await casbinGuard.validatePermissionWithCache(username, resource, action);
            const endTime = Date.now();

            expect(result).toBe(true);
            expect(endTime - startTime).toBeLessThan(10); // 缓存命中应该在10ms内完成
        });
    });

    describe('Guard接口实现', () => {
        it('canActivate方法应该正确处理权限验证', async () => {
            // 模拟上下文
            const mockCtx = {
                state: {
                    user: {
                        username: 'testuser'
                    }
                }
            } as any;

            // 模拟 Casbin enforcer
            const mockEnforce = jest.spyOn(casbinService.enforcer, 'enforce').mockResolvedValue(true);

            // 模拟 supplierClz 和 methodName
            const mockSupplierClz = {};
            const mockMethodName = 'testMethod';

            // 模拟 getPropertyMetadata 返回值
            jest.doMock('@midwayjs/core', () => ({
                ...jest.requireActual('@midwayjs/core'),
                getPropertyMetadata: jest.fn().mockReturnValue('test_resource')
            }));

            const result = await casbinGuard.canActivate(mockCtx, mockSupplierClz, mockMethodName);
            expect(result).toBe(true);

            mockEnforce.mockRestore();
        });
    });
});