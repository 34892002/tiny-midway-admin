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
 * 角色模块端到端测试
 * 测试完整的角色管理流程
 */
describe('Role Module E2E Tests', () => {
    process.env.NODE_ENV = 'unittest';

    let app: Application;
    let adminToken: string;
    let http: any;
    let testRoleId: number;

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
     * 测试角色列表查询的过滤功能
     * 覆盖controller中的过滤逻辑
     */
    it('should test role list filtering logic', async () => {
        // 测试空值过滤
        const emptyFilterResponse = await http
            .post('/system/role/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: '',
                code: null,
                system: undefined,
                description: ''
            });
        
        expect(emptyFilterResponse.status).toBe(200);
        expect(emptyFilterResponse.body.code).toBe(0);
        
        // 测试模糊查询
        const fuzzySearchResponse = await http
            .post('/system/role/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'admin%',
                code: 'admin%'
            });
        
        expect(fuzzySearchResponse.status).toBe(200);
        expect(fuzzySearchResponse.body.code).toBe(0);
        
        // 测试精确查询
        const exactSearchResponse = await http
            .post('/system/role/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: 'admin'
            });
        
        expect(exactSearchResponse.status).toBe(200);
        expect(exactSearchResponse.body.code).toBe(0);
    });

    /**
     * 端到端测试：完整的角色管理流程
     * 包括：登录 -> 查询角色列表 -> 创建角色 -> 更新角色 -> 删除角色
     */
    it('should complete full role management workflow', async () => {
        // 1. 查询角色列表
        const listResponse = await http
            .post('/system/role/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        
        expect(listResponse.status).toBe(200);
        expect(listResponse.body.code).toBe(0);
        expect(listResponse.body.data).toHaveProperty('records');
        expect(listResponse.body.data).toHaveProperty('total');
        
        const initialCount = listResponse.body.data.total;

        // 2. 创建新角色
        const createRoleData = {
            name: 'E2E测试角色',
            code: 'e2e_test_role_' + Date.now(),
            policys: ['test:read', 'test:write']
        };

        const createResponse = await http
            .post('/system/role')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(createRoleData);
        
        expect(createResponse.status).toBe(200);
        expect(createResponse.body.code).toBe(0);

        // 3. 验证角色创建成功 - 再次查询列表
        const listAfterCreateResponse = await http
            .post('/system/role/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        
        expect(listAfterCreateResponse.body.data.total).toBe(initialCount + 1);
        
        // 找到刚创建的角色
        const createdRole = listAfterCreateResponse.body.data.records.find(
            (role: any) => role.code === createRoleData.code
        );
        expect(createdRole).toBeDefined();
        expect(createdRole.name).toBe(createRoleData.name);
        expect(createdRole.code).toBe(createRoleData.code);
        
        testRoleId = createdRole.id;

        // 4. 更新角色信息
        const updateRoleData = {
            name: 'E2E测试角色(已更新)',
            policys: ['test:read', 'test:write', 'test:delete'],
            system: false
        };

        const updateResponse = await http
            .put(`/system/role/${testRoleId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updateRoleData);
        
        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.code).toBe(0);

        // 5. 验证角色更新成功 - 再次查询列表验证
        const listAfterUpdateResponse = await http
            .post('/system/role/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        
        const updatedRole = listAfterUpdateResponse.body.data.records.find(
            (role: any) => role.id === testRoleId
        );
        
        expect(listAfterUpdateResponse.status).toBe(200);
        expect(listAfterUpdateResponse.body.code).toBe(0);
        expect(updatedRole).toBeDefined();
        expect(updatedRole.name).toBe(updateRoleData.name);
        expect(updatedRole.policys).toEqual(expect.arrayContaining(updateRoleData.policys));

        // 6. 删除角色
        const deleteResponse = await http
            .delete(`/system/role/${testRoleId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.code).toBe(0);

        // 7. 验证角色删除成功 - 最终查询列表
        const listAfterDeleteResponse = await http
            .post('/system/role/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        
        expect(listAfterDeleteResponse.body.data.total).toBe(initialCount);
        
        // 确认角色已被删除
        const deletedRole = listAfterDeleteResponse.body.data.records.find(
            (role: any) => role.id === testRoleId
        );
        expect(deletedRole).toBeUndefined();
    });

    /**
     * 测试角色创建时的错误处理
     * 覆盖checkCodeAndPolicys方法的各种错误分支
     */
    it('should test role creation error handling', async () => {
        // 测试权限标识格式错误
        const invalidPolicyResponse = await http
            .post('/system/role')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: '测试角色',
                code: 'test_role_invalid',
                policys: ['123invalid', 'test:read'] // 以数字开头的无效权限
            });
        
        expect(invalidPolicyResponse.status).toBe(200);
        expect(invalidPolicyResponse.body.code).toBe(1000);
        expect(invalidPolicyResponse.body.message).toContain('不符合规则');

        // 测试权限标识与用户标识重复
        const duplicateUserResponse = await http
            .post('/system/role')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: '测试角色',
                code: 'test_role_duplicate',
                policys: ['admin'] // 与现有用户标识重复
            });
        
        expect(duplicateUserResponse.status).toBe(200);
        expect(duplicateUserResponse.body.code).toBe(1000);
        expect(duplicateUserResponse.body.message).toContain('不能跟用户标识重复');

        // 测试权限标识与角色标识重复
        const duplicateRoleResponse = await http
            .post('/system/role')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: '测试角色',
                code: 'test_role_duplicate2',
                policys: ['admin'] // 与现有角色标识重复
            });
        
        expect(duplicateRoleResponse.status).toBe(200);
        expect(duplicateRoleResponse.body.code).toBe(1000);
        expect(duplicateRoleResponse.body.message).toContain('重复');
    });

    /**
     * 测试角色更新时的错误处理
     * 覆盖updateOne方法的错误分支
     */
    it('should test role update error handling', async () => {
        // 测试更新不存在的角色
        const nonExistentRoleResponse = await http
            .put('/system/role/99999')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                name: '不存在的角色',
                policys: ['test:read']
            });
        
        expect(nonExistentRoleResponse.status).toBe(200);
        expect(nonExistentRoleResponse.body.code).toBe(1000);
        expect(nonExistentRoleResponse.body.message).toBe('角色不存在');

        // 测试修改系统属性
        // 首先获取一个系统角色
        const listResponse = await http
            .post('/system/role/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        
        const systemRole = listResponse.body.data.records.find(
            (role: any) => role.system === true
        );
        
        if (systemRole) {
            const modifySystemResponse = await http
                .put(`/system/role/${systemRole.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: systemRole.name,
                    system: false, // 尝试修改系统属性
                    policys: ['test:read']
                });
            
            expect(modifySystemResponse.status).toBe(200);
            expect(modifySystemResponse.body.code).toBe(1000);
            expect(modifySystemResponse.body.message).toBe('用户不能修改系统属性');
        }
    });

    /**
     * 测试角色删除时的错误处理
     * 覆盖deleteById方法的错误分支
     */
    it('should test role deletion error handling', async () => {
        // 测试删除系统角色
        const listResponse = await http
            .post('/system/role/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        
        const systemRole = listResponse.body.data.records.find(
            (role: any) => role.system === true
        );
        
        if (systemRole) {
            const deleteSystemRoleResponse = await http
                .delete(`/system/role/${systemRole.id}`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(deleteSystemRoleResponse.status).toBe(200);
            expect(deleteSystemRoleResponse.body.code).toBe(1000);
            expect(deleteSystemRoleResponse.body.message).toBe('系统角色不能删除');
        }
    });

    /**
     * 测试findAll方法的分页和排序功能
     * 覆盖findAll方法的分支逻辑
     */
    it('should test role list pagination and sorting', async () => {
        // 测试自定义分页参数
        const paginationResponse = await http
            .post('/system/role/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                currentPage: 1,
                pageSize: 5
            });
        
        expect(paginationResponse.status).toBe(200);
        expect(paginationResponse.body.code).toBe(0);
        expect(paginationResponse.body.data.pageSize).toBe(5);
        expect(paginationResponse.body.data.currentPage).toBe(1);

        // 测试字符串格式的排序参数
        const sortResponse = await http
            .post('/system/role/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                sort: '{"name": "asc"}'
            });
        
        expect(sortResponse.status).toBe(200);
        expect(sortResponse.body.code).toBe(0);
    });
});