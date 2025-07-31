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
 * 用户模块端到端测试
 * 测试完整的用户管理流程
 */
describe('User Module E2E Tests', () => {
    process.env.NODE_ENV = 'unittest';

    let app: Application;
    let adminToken: string;
    let http: any;
    let testUserId: number;

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
     * 测试用户列表查询的过滤功能
     * 覆盖controller中的过滤逻辑
     */
    it('should test user list filtering logic', async () => {
        // 测试空值过滤
        const emptyFilterResponse = await http
            .post('/system/user/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                username: '',
                nickName: null,
                email: undefined,
                phone: ''
            });
        
        expect(emptyFilterResponse.status).toBe(200);
        expect(emptyFilterResponse.body.code).toBe(0);
        
        // 测试模糊查询
        const fuzzySearchResponse = await http
            .post('/system/user/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                username: 'admin%',
                nickName: '管理员%'
            });
        
        expect(fuzzySearchResponse.status).toBe(200);
        expect(fuzzySearchResponse.body.code).toBe(0);
        
        // 测试精确查询
        const exactSearchResponse = await http
            .post('/system/user/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                username: 'admin'
            });
        
        expect(exactSearchResponse.status).toBe(200);
        expect(exactSearchResponse.body.code).toBe(0);
    });

    /**
     * 测试演示环境下的限制
     * 覆盖controller中的演示环境检查逻辑
     */
    it('should test demo environment restrictions', async () => {
        // 临时设置演示环境
        const originalEnv = process.env.RUN_DEMO;
        process.env.RUN_DEMO = 'true';
        
        try {
            // 尝试修改系统用户（应该被阻止）
            const updateSystemUserResponse = await http
                .put('/system/user/1')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    username: 'admin',
                    nickName: '修改后的管理员',
                    system: true
                });
            
            expect(updateSystemUserResponse.status).toBe(200);
            expect(updateSystemUserResponse.body.code).toBe(1000);
            expect(updateSystemUserResponse.body.message).toContain('演示环境不能修改Root用户');
        } finally {
            // 恢复原始环境变量
            if (originalEnv !== undefined) {
                process.env.RUN_DEMO = originalEnv;
            } else {
                delete process.env.RUN_DEMO;
            }
        }
    });

    /**
     * 端到端测试：完整的用户管理流程
     * 包括：登录 -> 查询用户列表 -> 创建用户 -> 更新用户 -> 删除用户
     */
    it('should complete full user management workflow', async () => {
        // 1. 查询用户列表
        const listResponse = await http
            .post('/system/user/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        
        expect(listResponse.status).toBe(200);
        expect(listResponse.body.code).toBe(0);
        expect(listResponse.body.data).toHaveProperty('records');
        expect(listResponse.body.data).toHaveProperty('total');
        
        const initialCount = listResponse.body.data.total;

        // 2. 创建新用户
        const createUserData = {
            username: 'e2e_test_user_' + Date.now(),
            password: 'test123456',
            nickName: 'E2E测试用户',
            email: 'e2etest@example.com',
            phone: '13800138000',
            system: false,
            roles: ['admin']
        };

        const createResponse = await http
            .post('/system/user')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(createUserData);
        
        expect(createResponse.status).toBe(200);
        expect(createResponse.body.code).toBe(0);

        // 3. 验证用户创建成功 - 再次查询列表
        const listAfterCreateResponse = await http
            .post('/system/user/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        
        expect(listAfterCreateResponse.body.data.total).toBe(initialCount + 1);
        
        // 找到刚创建的用户
        const createdUser = listAfterCreateResponse.body.data.records.find(
            (user: any) => user.username === createUserData.username
        );
        expect(createdUser).toBeDefined();
        expect(createdUser.username).toBe(createUserData.username);
        expect(createdUser.nickName).toBe(createUserData.nickName);
        expect(createdUser.email).toBe(createUserData.email);
        expect(createdUser).not.toHaveProperty('password'); // 密码应该被过滤掉
        

        
        testUserId = createdUser.id;

        // 4. 更新用户信息
        const updateUserData = {
            username: createdUser.username,
            nickName: 'E2E测试用户(已更新)',
            email: 'updated_e2etest@example.com',
            phone: '13900139000',
            system: false,
            roles: ['admin']
        };

        const updateResponse = await http
            .put(`/system/user/${testUserId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updateUserData);
        

        
        expect(updateResponse.status).toBe(200);
        expect(updateResponse.body.code).toBe(0);

        // 5. 验证用户更新成功 - 再次查询列表验证
        const listAfterUpdateResponse = await http
            .post('/system/user/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        
        const updatedUser = listAfterUpdateResponse.body.data.records.find(
            (user: any) => user.id === testUserId
        );
        
        expect(listAfterUpdateResponse.status).toBe(200);
        expect(listAfterUpdateResponse.body.code).toBe(0);
        expect(updatedUser).toBeDefined();
        expect(updatedUser.nickName).toBe(updateUserData.nickName);
        expect(updatedUser.email).toBe(updateUserData.email);
        expect(updatedUser.phone).toBe(updateUserData.phone);

        // 6. 删除用户
        const deleteResponse = await http
            .delete(`/system/user/${testUserId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.code).toBe(0);

        // 7. 验证用户删除成功 - 最终查询列表
        const listAfterDeleteResponse = await http
            .post('/system/user/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});
        
        expect(listAfterDeleteResponse.body.data.total).toBe(initialCount);
        
        // 确认用户已被删除
        const deletedUser = listAfterDeleteResponse.body.data.records.find(
            (user: any) => user.id === testUserId
        );
        expect(deletedUser).toBeUndefined();
    });

    /**
     * 测试用户创建时的错误处理
     * 覆盖checkNameAndRoles方法的各种错误分支
     */
    it('should test user creation error handling', async () => {
        // 测试角色标识不符合规则
        const invalidRoleResponse = await http
            .post('/system/user')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                username: 'test_invalid_role',
                password: 'test123456',
                nickName: '测试用户',
                email: 'test@example.com',
                system: false,
                roles: ['123invalid'] // 以数字开头的角色标识
            });
        
        expect(invalidRoleResponse.status).toBe(200);
        expect(invalidRoleResponse.body.code).toBe(1000);
        expect(invalidRoleResponse.body.message).toContain('角色标识不符合规则');

        // 测试用户标识与现有角色标识重复
        const testUsername = 'admin_role_test_' + Date.now();
        const duplicateRoleResponse = await http
            .post('/system/user')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                username: testUsername,
                password: 'test123456',
                nickName: '测试用户',
                email: 'test@example.com',
                system: false,
                roles: [testUsername] // 用户标识包含在角色列表中
            });
        
        expect(duplicateRoleResponse.status).toBe(200);
        expect(duplicateRoleResponse.body.code).toBe(1000);
        expect(duplicateRoleResponse.body.message).toContain('用户标识不能跟角色标识重复');

        // 测试角色标识与权限标识重复
        const policyConflictResponse = await http
            .post('/system/user')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                username: 'test_policy_conflict',
                password: 'test123456',
                nickName: '测试用户',
                email: 'test@example.com',
                system: false,
                roles: ['UserMgt'] // 使用已存在的权限标识
            });
        
        expect(policyConflictResponse.status).toBe(200);
        expect(policyConflictResponse.body.code).toBe(1000);
        expect(policyConflictResponse.body.message).toContain('角色标识不能跟权限标识重复');
    });

    /**
     * 测试用户更新时的错误处理
     * 覆盖updateOne方法的系统用户限制分支
     */
    it('should test user update error handling', async () => {
        // 测试修改系统属性
        const systemPropertyResponse = await http
            .put('/system/user/1') // 假设ID为1的是系统用户
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                username: 'admin',
                nickName: '管理员',
                system: false, // 尝试修改系统属性
                roles: ['admin']
            });
        
        expect(systemPropertyResponse.status).toBe(200);
        expect(systemPropertyResponse.body.code).toBe(1000);
        expect(systemPropertyResponse.body.message).toContain('用户不能修改系统属性');

        // 测试系统用户修改角色
        const systemUserRoleResponse = await http
            .put('/system/user/1')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                username: 'admin',
                nickName: '管理员',
                system: true,
                roles: ['user'] // 尝试修改系统用户的角色
            });
        
        expect(systemUserRoleResponse.status).toBe(200);
        expect(systemUserRoleResponse.body.code).toBe(1000);
        expect(systemUserRoleResponse.body.message).toContain('系统用户不能修改角色');
    });

    /**
     * 测试用户删除时的错误处理
     * 覆盖deleteById方法的系统用户删除限制
     */
    it('should test user deletion error handling', async () => {
        // 测试删除系统用户
        const deleteSystemUserResponse = await http
            .delete('/system/user/1') // 假设ID为1的是系统用户
            .set('Authorization', `Bearer ${adminToken}`);
        
        expect(deleteSystemUserResponse.status).toBe(200);
        expect(deleteSystemUserResponse.body.code).toBe(1000);
        expect(deleteSystemUserResponse.body.message).toContain('系统用户不能删除');
    });

    /**
     * 测试用户列表分页和排序功能
     * 覆盖findAll方法的默认参数分支
     */
    it('should test user list pagination and sorting', async () => {
        // 测试默认分页参数
        const defaultPaginationResponse = await http
            .post('/system/user/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                currentPage: undefined, // 测试默认page参数
                pageSize: undefined     // 测试默认limit参数
            });
        
        expect(defaultPaginationResponse.status).toBe(200);
        expect(defaultPaginationResponse.body.code).toBe(0);
        expect(defaultPaginationResponse.body.data.currentPage).toBe(1);
        expect(defaultPaginationResponse.body.data.pageSize).toBe(20);

        // 测试字符串排序参数
        const stringSortResponse = await http
            .post('/system/user/page')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                sort: '{"id": "asc"}' // 测试字符串格式的排序参数
            });
        
        expect(stringSortResponse.status).toBe(200);
        expect(stringSortResponse.body.code).toBe(0);
    });
});