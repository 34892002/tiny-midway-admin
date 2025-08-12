import { createApp, close } from '@midwayjs/mock';
import { Framework } from '@midwayjs/koa';
import { Application } from '@midwayjs/koa';
import { DictService } from '../../src/modules/base/service/dict.service';
import { AuthHelper, HttpHelper, DatabaseHelper } from '../__helpers__';

/**
 * DictController 单元测试
 * 主要测试未覆盖的分支，特别是 getDict 方法中 data 为 null/undefined 时返回空数组的情况
 */
describe('test/unit/dict.controller.test.ts', () => {
  let app: Application;
  let adminToken: string;

  beforeAll(async () => {
    try {
      app = await createApp<Framework>();
      await DatabaseHelper.setupTestDatabase();
      adminToken = await AuthHelper.getAdminToken(app);
    } catch (err) {
      console.error('setup', err);
    }
  });

  afterAll(async () => {
    await DatabaseHelper.cleanupTestDatabase();
    await close(app);
  });

  /**
   * 测试 getDict 方法 - data 为 null 时返回空数组
   * 覆盖分支：data || []
   */
  it('should return empty array when dict data is null', async () => {
    // Mock DictService.getDictFromDB 返回 null
    const dictService = await app.getApplicationContext().getAsync(DictService);
    const spy = jest.spyOn(dictService, 'getDictFromDB').mockResolvedValue(null);

    const client = HttpHelper.createAuthenticatedClient(app, adminToken);
    const result = await client.get('/base/dict', { query: { code: 'test_code' } });

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(result.body.data).toEqual([]);
    expect(spy).toHaveBeenCalledWith('test_code');

    // 恢复原方法
    spy.mockRestore();
  });

  /**
   * 测试 getDict 方法 - data 为 undefined 时返回空数组
   * 覆盖分支：data || []
   */
  it('should return empty array when dict data is undefined', async () => {
    // Mock DictService.getDictFromDB 返回 undefined
    const dictService = await app.getApplicationContext().getAsync(DictService);
    const spy = jest.spyOn(dictService, 'getDictFromDB').mockResolvedValue(undefined);

    const client = HttpHelper.createAuthenticatedClient(app, adminToken);
    const result = await client.get('/base/dict', { query: { code: 'test_code' } });

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(result.body.data).toEqual([]);
    expect(spy).toHaveBeenCalledWith('test_code');

    // 恢复原方法
    spy.mockRestore();
  });

  /**
   * 测试 getDict 方法 - data 为空数组时返回空数组
   * 边界情况测试
   */
  it('should return empty array when dict data is empty array', async () => {
    // Mock DictService.getDictFromDB 返回空数组
    const dictService = await app.getApplicationContext().getAsync(DictService);
    const spy = jest.spyOn(dictService, 'getDictFromDB').mockResolvedValue([]);

    const client = HttpHelper.createAuthenticatedClient(app, adminToken);
    const result = await client.get('/base/dict', { query: { code: 'test_code' } });

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(result.body.data).toEqual([]);
    expect(spy).toHaveBeenCalledWith('test_code');

    // 恢复原方法
    spy.mockRestore();
  });

  /**
   * 测试 getDict 方法 - data 有值时正常返回
   * 正常情况测试
   */
  it('should return dict data when data exists', async () => {
    const mockData = [{ id: 1, name: 'test', value: 'test_value' }];
    
    // Mock DictService.getDictFromDB 返回有效数据
    const dictService = await app.getApplicationContext().getAsync(DictService);
    const spy = jest.spyOn(dictService, 'getDictFromDB').mockResolvedValue(mockData);

    const client = HttpHelper.createAuthenticatedClient(app, adminToken);
    const result = await client.get('/base/dict', { query: { code: 'test_code' } });

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(result.body.data).toEqual(mockData);
    expect(spy).toHaveBeenCalledWith('test_code');

    // 恢复原方法
    spy.mockRestore();
  });

  /**
   * 测试 getSysDict 方法 - permissions 分支
   */
  it('should return menu dict when code is permissions', async () => {
    const mockMenuDict = [
      {
        id: 1,
        parentId: null,
        name: '菜单1',
        label: '菜单1',
        code: 'menu1',
        children: []
      },
      {
        id: 2,
        parentId: null,
        name: '菜单2',
        label: '菜单2',
        code: 'menu2',
        children: []
      }
    ];
    
    const dictService = await app.getApplicationContext().getAsync(DictService);
    const spy = jest.spyOn(dictService, 'getMenuDict').mockResolvedValue(mockMenuDict as any);

    const result = await HttpHelper.createAuthenticatedClient(app, adminToken)
      .get('/base/dict/sys?code=permissions');

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(result.body.data).toEqual(mockMenuDict);
    expect(spy).toHaveBeenCalled();

    // 恢复原方法
    spy.mockRestore();
  });

  /**
   * 测试 getSysDict 方法 - role 分支
   */
  it('should return role dict when code is role', async () => {
    const mockRoleDict = [
      { value: 'admin_role', label: '超级管理员' },
      { value: 'business_role', label: '管理员' },
      { value: 'guest_role', label: '来宾' }
    ];
    
    const dictService = await app.getApplicationContext().getAsync(DictService);
    const spy = jest.spyOn(dictService, 'getRoleDict').mockResolvedValue(mockRoleDict as any);

    const result = await HttpHelper.createAuthenticatedClient(app, adminToken)
      .get('/base/dict/sys?code=role');

    expect(result.status).toBe(200);
    expect(result.body.code).toBe(0);
    expect(result.body.data).toEqual(mockRoleDict);
    expect(spy).toHaveBeenCalled();

    // 恢复原方法
    spy.mockRestore();
  });

  /**
   * 测试 getSysDict 方法 - 其他 code 返回错误
   */
  it('should return error when code is not supported', async () => {
    const client = HttpHelper.createAuthenticatedClient(app, adminToken);
    const result = await client.get('/base/dict/sys', { query: { code: 'unsupported_code' } });

    expect(result.status).toBe(200);
    // 应该返回 AdminErrorEnum.DICT_NOT_DATA
    expect(result.body).toBeDefined();
  });
});