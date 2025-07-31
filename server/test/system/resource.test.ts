import { Framework, Application } from '@midwayjs/koa';
import { createApp, close, createHttpRequest } from '@midwayjs/mock';

// 登录配置常量
const LOGIN_CONFIG = {
    username: 'admin',
    password: '123456',
    passwordKey: 'mn-admin',
    captcha: '0000'
};

/**
 * 加密密码的辅助函数
 */
function encryptPassword(password: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(password + LOGIN_CONFIG.passwordKey).digest('hex');
    return Buffer.from(hash, 'hex').toString('base64');
}

/**
 * 执行登录操作的辅助函数
 */
async function performLogin(app: Application, username: string = LOGIN_CONFIG.username, password: string = LOGIN_CONFIG.password): Promise<any> {
    const http = createHttpRequest(app);
    const captchaResult = await http.get('/auth/captcha');
    const captchaId = captchaResult.body.data.id;
    const encryptedPassword = encryptPassword(password);

    return await http.post('/auth/login').send({
        username,
        password: encryptedPassword,
        captchaId,
        captcha: LOGIN_CONFIG.captcha,
        isRemember: false
    });
}

/**
 * 辅助函数：将菜单树扁平化为数组
 */
function flattenMenuTree(menuTree: any[]): any[] {
    const result: any[] = [];
    
    function flatten(menus: any[]) {
        for (const menu of menus) {
            result.push(menu);
            if (menu.children && menu.children.length > 0) {
                flatten(menu.children);
            }
        }
    }
    
    flatten(menuTree);
    return result;
}

/**
 * 资源模块端到端测试
 * 测试完整的资源管理流程
 */
describe('Resource Module E2E Tests', () => {
    process.env.NODE_ENV = 'unittest';

    let app: Application;
    let adminToken: string;
    let http: any;
    let testResourceId: number;

    beforeAll(async () => {
        app = await createApp<Framework>();
        http = createHttpRequest(app);

        // 获取管理员token
        const loginResult = await performLogin(app);
        adminToken = loginResult.body.data.accessToken;
    });

    afterAll(async () => {
        await close(app);
    });

    /**
     * 测试getAllRouters方法
     * 覆盖service层的getAllRouters方法
     */
    it('should test getAllRouters method', async () => {
        const routersResponse = await http
            .get('/system/resource/routers')
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(routersResponse.status).toBe(200);
        expect(routersResponse.body.code).toBe(0);
        expect(Array.isArray(routersResponse.body.data)).toBe(true);
    });

    /**
     * 测试createMenu的错误处理
     * 覆盖service层createMenu方法的异常分支
     */
    it('should test createMenu error handling', async () => {
        // 先创建一个菜单
        const menuData = {
            name: '重复编码测试菜单',
            code: 'duplicate_code_test_' + Date.now(),
            path: '/duplicate-test',
            type: '1',
            parentId: null
        };

        const createResponse = await http
            .post('/system/resource')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(menuData);
        
        expect(createResponse.status).toBe(200);
        expect(createResponse.body.code).toBe(0);
        
        const createdMenuId = createResponse.body.data.id;
        
        // 尝试创建相同编码的菜单（应该失败）
        const duplicateResponse = await http
            .post('/system/resource')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(menuData);
        
        expect(duplicateResponse.status).toBe(200);
        expect(duplicateResponse.body.code).toBe(1000);
        expect(duplicateResponse.body.message).toContain('已经存在');
        
        // 清理创建的菜单
        await http
            .delete(`/system/resource/${createdMenuId}`)
            .set('Authorization', `Bearer ${adminToken}`);
    });

    /**
     * 测试updateMenu的权限变更逻辑
     * 覆盖service层updateMenu方法的权限变更分支
     */
    it('should test updateMenu permission change logic', async () => {
        // 创建测试菜单
        const menuData = {
            name: '权限变更测试菜单',
            code: 'permission_change_test_' + Date.now(),
            path: '/permission-test',
            type: '1',
            parentId: null,
            enable: true
        };

        const createResponse = await http
            .post('/system/resource')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(menuData);
        
        expect(createResponse.status).toBe(200);
        const menuId = createResponse.body.data.id;
        
        // 测试修改code（触发权限变更逻辑）
        const updateCodeData = {
            code: 'permission_change_updated_' + Date.now()
        };

        const updateCodeResponse = await http
            .put(`/system/resource/${menuId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updateCodeData);
        
        expect(updateCodeResponse.status).toBe(200);
        expect(updateCodeResponse.body.code).toBe(0);
        
        // 测试禁用菜单（触发权限变更逻辑）
        const disableData = {
            enable: false
        };

        const disableResponse = await http
            .put(`/system/resource/${menuId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(disableData);
        
        expect(disableResponse.status).toBe(200);
        expect(disableResponse.body.code).toBe(0);
        
        // 清理创建的菜单
        await http
            .delete(`/system/resource/${menuId}`)
            .set('Authorization', `Bearer ${adminToken}`);
    });

    /**
     * 测试deleteMenu的子菜单检查逻辑
     * 覆盖service层deleteMenu方法的子菜单检查分支
     */
    it('should test deleteMenu with child menu restriction', async () => {
        // 创建父菜单
        const parentMenuData = {
            name: '父菜单测试',
            code: 'parent_menu_test_' + Date.now(),
            path: '/parent-test',
            type: '1',
            parentId: null
        };

        const parentResponse = await http
            .post('/system/resource')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(parentMenuData);
        
        expect(parentResponse.status).toBe(200);
        const parentMenuId = parentResponse.body.data.id;
        
        // 创建子菜单
        const childMenuData = {
            name: '子菜单测试',
            code: 'child_menu_test_' + Date.now(),
            path: '/child-test',
            type: '1',
            parentId: parentMenuId
        };

        const childResponse = await http
            .post('/system/resource')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(childMenuData);
        
        expect(childResponse.status).toBe(200);
        const childMenuId = childResponse.body.data.id;
        
        // 尝试删除有子菜单的父菜单（应该失败）
        const deleteParentResponse = await http
            .delete(`/system/resource/${parentMenuId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(deleteParentResponse.status).toBe(200);
        expect(deleteParentResponse.body.code).toBe(1000);
        expect(deleteParentResponse.body.message).toContain('该菜单下有子菜单');
        
        // 先删除子菜单
        const deleteChildResponse = await http
            .delete(`/system/resource/${childMenuId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(deleteChildResponse.status).toBe(200);
        expect(deleteChildResponse.body.code).toBe(0);
        
        // 再删除父菜单（应该成功）
        const deleteParentFinalResponse = await http
            .delete(`/system/resource/${parentMenuId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(deleteParentFinalResponse.status).toBe(200);
        expect(deleteParentFinalResponse.body.code).toBe(0);
    });

    /**
     * 测试创建菜单时的order字段默认值逻辑
     * 覆盖controller中的order字段检查
     */
    it('should test menu creation with order field logic', async () => {
        // 测试不传入order字段的情况（应该默认为0）
        const menuDataWithoutOrder = {
            name: '测试菜单无Order',
            code: 'test_menu_no_order_' + Date.now(),
            path: '/test-no-order',
            type: '1',
            parentId: null
        };

        const createResponse = await http
            .post('/system/resource')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(menuDataWithoutOrder);
        
        expect(createResponse.status).toBe(200);
        expect(createResponse.body.code).toBe(0);
        
        // 清理创建的菜单
        if (createResponse.body.data && createResponse.body.data.id) {
            await http
                .delete(`/system/resource/${createResponse.body.data.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
        }
        
        // 测试传入order字段的情况
        const menuDataWithOrder = {
            name: '测试菜单有Order',
            code: 'test_menu_with_order_' + Date.now(),
            path: '/test-with-order',
            type: '1',
            parentId: null,
            order: 10
        };

        const createWithOrderResponse = await http
            .post('/system/resource')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(menuDataWithOrder);
        
        expect(createWithOrderResponse.status).toBe(200);
        expect(createWithOrderResponse.body.code).toBe(0);
        
        // 清理创建的菜单
        if (createWithOrderResponse.body.data && createWithOrderResponse.body.data.id) {
            await http
                .delete(`/system/resource/${createWithOrderResponse.body.data.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
        }
    });

    /**
     * 测试演示环境下的删除限制
     * 覆盖controller中的演示环境检查逻辑
     */
    it('should test demo environment delete restrictions', async () => {
        // 先创建一个测试菜单
        const testMenuData = {
            name: '演示环境测试菜单',
            code: 'demo_test_menu_' + Date.now(),
            path: '/demo-test',
            type: '1',
            parentId: null,
            order: 0
        };

        const createResponse = await http
            .post('/system/resource')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(testMenuData);
        
        expect(createResponse.status).toBe(200);
        expect(createResponse.body.code).toBe(0);
        
        const testMenuId = createResponse.body.data.id;
        
        // 临时设置演示环境
        const originalEnv = process.env.RUN_DEMO;
        process.env.RUN_DEMO = 'true';
        
        try {
            // 尝试删除菜单（应该被阻止）
            const deleteResponse = await http
                .delete(`/system/resource/${testMenuId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(deleteResponse.status).toBe(200);
            expect(deleteResponse.body.code).toBe(1000);
            expect(deleteResponse.body.message).toContain('演示环境下不能删除菜单');
        } finally {
            // 恢复原始环境变量
            if (originalEnv !== undefined) {
                process.env.RUN_DEMO = originalEnv;
            } else {
                delete process.env.RUN_DEMO;
            }
            
            // 清理测试菜单（在非演示环境下）
            await http
                .delete(`/system/resource/${testMenuId}`)
                .set('Authorization', `Bearer ${adminToken}`);
        }
    });

    /**
     * 端到端测试：完整的菜单管理流程
     * 包括：登录 -> 获取菜单树 -> 创建菜单 -> 更新菜单 -> 删除菜单
     */
    it('should complete full menu management workflow', async () => {
        // 1. 获取菜单树
        const menuTreeResponse = await http
            .get('/system/resource/list')
            .set('Authorization', `Bearer ${adminToken}`);
        

        
        expect(menuTreeResponse.status).toBe(200);
        expect(menuTreeResponse.body.code).toBe(0);
        expect(menuTreeResponse.body.data).toBeDefined();

        // 2. 创建新菜单
        const createMenuData = {
            name: 'E2E测试菜单',
            code: 'e2e_test_menu_' + Date.now(),
            type: '1',
            parentId: null,
            path: '/e2e-test',
            icon: 'test-icon',
            order: 999,
            enable: true
        };

        const createResponse = await http
            .post('/system/resource')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(createMenuData);
        

        
        expect(createResponse.status).toBe(200);
        expect(createResponse.body.code).toBe(0);
        expect(createResponse.body.data).toHaveProperty('id');
        
        testResourceId = createResponse.body.data.id;

        // 3. 验证菜单创建成功 - 再次获取菜单树
        const menuTreeAfterCreateResponse = await http
            .get('/system/resource/list')
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(menuTreeAfterCreateResponse.status).toBe(200);
        expect(menuTreeAfterCreateResponse.body.code).toBe(0);
        
        // 验证新菜单存在
        const allMenus = flattenMenuTree(menuTreeAfterCreateResponse.body.data);
        const createdMenu = allMenus.find((menu: any) => menu.id === testResourceId);
        expect(createdMenu).toBeDefined();
        expect(createdMenu.name).toBe(createMenuData.name);
        expect(createdMenu.code).toBe(createMenuData.code);

        // 4. 更新菜单信息
        const updateMenuData = {
            name: 'E2E测试菜单(已更新)',
            path: '/e2e-test-updated',
            icon: 'updated-icon'
        };

        const updateResponse = await http
            .put(`/system/resource/${testResourceId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updateMenuData);
        
        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.code).toBe(0);

        // 5. 验证菜单更新成功 - 再次获取菜单树验证
        const menuTreeAfterUpdateResponse = await http
            .get('/system/resource/list')
            .set('Authorization', `Bearer ${adminToken}`);
        
        const allMenusAfterUpdate = flattenMenuTree(menuTreeAfterUpdateResponse.body.data);
        const updatedMenu = allMenusAfterUpdate.find((menu: any) => menu.id === testResourceId);
        
        expect(menuTreeAfterUpdateResponse.status).toBe(200);
        expect(menuTreeAfterUpdateResponse.body.code).toBe(0);
        expect(updatedMenu).toBeDefined();
        expect(updatedMenu.name).toBe(updateMenuData.name);
        expect(updatedMenu.path).toBe(updateMenuData.path);
        expect(updatedMenu.icon).toBe(updateMenuData.icon);

        // 6. 删除菜单
        const deleteResponse = await http
            .delete(`/system/resource/${testResourceId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.code).toBe(0);

        // 7. 验证菜单删除成功 - 最终获取菜单树
        const menuTreeAfterDeleteResponse = await http
            .get('/system/resource/list')
            .set('Authorization', `Bearer ${adminToken}`);
        
        const allMenusAfterDelete = flattenMenuTree(menuTreeAfterDeleteResponse.body.data);
        
        // 确认菜单已被删除
        const deletedMenu = allMenusAfterDelete.find((menu: any) => menu.id === testResourceId);
        expect(deletedMenu).toBeUndefined();
    });

});