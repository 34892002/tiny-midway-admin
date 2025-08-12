import { Framework, Application } from '@midwayjs/koa';
import { createApp, close } from '@midwayjs/mock';
import { ValidateService } from '@midwayjs/validate';
import { BaseController } from '../../src/core/crud_controller';
import { BaseService, Options } from '../../src/core/crud_service';
import { Crud } from '../../src/core/crud_decorator';
import { ListQuery, BaseQuery } from '../../src/core/dto';

// 模拟Prisma模型
const mockModel = {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
};

// 测试用的Service实现
class TestService extends BaseService<any> {
    protected model = mockModel;
}

// 测试用的Controller实现
@Crud('/test', {}, {
    apis: ['list', 'page', 'info', 'create', 'update', 'delete'],
    dto: { create: Object, update: Object }
})
class TestController extends BaseController {
    protected service = new TestService();
}

/**
 * Core模块集成测试
 * 包含CRUD控制器、服务、装饰器和DTO的完整测试覆盖
 */
describe('Core Module Integration Tests', () => {
    process.env.NODE_ENV = 'unittest';

    let app: Application;
    let validateService: ValidateService;
    let testService: TestService;
    let testController: TestController;

    beforeAll(async () => {
        app = await createApp<Framework>();
        validateService = await app.getApplicationContext().getAsync(ValidateService);
        testService = new TestService();
        testController = new TestController();

        // 注入依赖
        testController.validateService = validateService;
        testController['service'] = testService;
    });

    afterAll(async () => {
        await close(app);
    });

    beforeEach(() => {
        // 重置所有mock
        jest.clearAllMocks();
    });

    /**
     * 测试BaseController的list方法
     */
    describe('BaseController.list', () => {
        it('should return list data with default parameters', async () => {
            const mockData = [{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }];
            mockModel.findMany.mockResolvedValue(mockData);

            // 模拟ctx.query
            testController['ctx'] = {
                query: { take: '10' }
            } as any;

            const result = await testController.list();

            expect(mockModel.findMany).toHaveBeenCalledWith({
                take: 10
            });
            expect(result).toEqual({ take: 10, records: mockData });
        });

        it('should handle cursor-based pagination', async () => {
            const mockData = [{ id: 3, name: 'test3' }];
            mockModel.findMany.mockResolvedValue(mockData);

            testController['ctx'] = {
                query: { take: '5', cursorId: '2' }
            } as any;

            const result = await testController.list();

            expect(mockModel.findMany).toHaveBeenCalledWith({
                take: 5,
                cursor: { id: 2 },
                skip: 1
            });
            expect(result).toEqual({ take: 5, records: mockData });
        });
    });

    /**
     * 测试BaseController的page方法
     */
    describe('BaseController.page', () => {
        it('should return paginated data with default parameters', async () => {
            const mockRecords = [{ id: 1, name: 'test1' }];
            const mockTotal = 1;
            mockModel.findMany.mockResolvedValue(mockRecords);
            mockModel.count.mockResolvedValue(mockTotal);

            testController['ctx'] = {
                request: {
                    body: { name: 'test' }
                }
            } as any;

            const result = await testController.page();

            expect(result).toEqual({
                records: mockRecords,
                total: mockTotal,
                currentPage: 1,
                pageSize: 20
            });
        });

        it('should handle custom pagination parameters', async () => {
            const mockRecords = [{ id: 1, name: 'test1' }];
            const mockTotal = 50;
            mockModel.findMany.mockResolvedValue(mockRecords);
            mockModel.count.mockResolvedValue(mockTotal);

            testController['ctx'] = {
                request: {
                    body: {
                        currentPage: 2,
                        pageSize: 10,
                        sort: JSON.stringify({ name: 'asc' }),
                        name: 'test',
                        status: 1
                    }
                }
            } as any;

            const result = await testController.page();

            expect(mockModel.findMany).toHaveBeenCalledWith({
                where: { name: 'test', status: 1 },
                select: undefined,
                include: undefined,
                orderBy: { name: 'asc' },
                skip: 10,
                take: 10
            });
            expect(result.currentPage).toBe(2);
            expect(result.pageSize).toBe(10);
        });

        it('should filter out invalid values from where clause', async () => {
            mockModel.findMany.mockResolvedValue([]);
            mockModel.count.mockResolvedValue(0);

            testController['ctx'] = {
                request: {
                    body: {
                        name: 'test',
                        status: null,
                        description: '',
                        count: undefined,
                        active: false
                    }
                }
            } as any;

            await testController.page();

            expect(mockModel.findMany).toHaveBeenCalledWith({
                where: { name: 'test', active: false },
                select: undefined,
                include: undefined,
                orderBy: { id: 'desc' },
                skip: 0,
                take: 20
            });
        });

        it('should handle fuzzy search with % suffix', async () => {
            mockModel.findMany.mockResolvedValue([]);
            mockModel.count.mockResolvedValue(0);

            testController['ctx'] = {
                request: {
                    body: {
                        name: 'test%',
                        email: 'admin%'
                    }
                }
            } as any;

            await testController.page();

            expect(mockModel.findMany).toHaveBeenCalledWith({
                where: {
                    name: { contains: 'test' },
                    email: { contains: 'admin' }
                },
                select: undefined,
                include: undefined,
                orderBy: { id: 'desc' },
                skip: 0,
                take: 20
            });
        });
    });

    /**
     * 测试BaseController的info方法
     */
    describe('BaseController.info', () => {
        it('should return item by numeric id', async () => {
            const mockItem = { id: 1, name: 'test' };
            mockModel.findUnique.mockResolvedValue(mockItem);

            testController['ctx'] = {
                params: { id: '1' },
                query: {}
            } as any;

            const result = await testController.info();

            expect(mockModel.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
                select: undefined,
                include: undefined
            });
            expect(result).toBe(mockItem);
        });

        it('should return item by string id', async () => {
            const mockItem = { id: 'uuid-123', name: 'test' };
            mockModel.findUnique.mockResolvedValue(mockItem);

            testController['ctx'] = {
                params: { id: 'uuid-123' },
                query: { include: 'relations' }
            } as any;

            const result = await testController.info();

            expect(mockModel.findUnique).toHaveBeenCalledWith({
                where: { id: 'uuid-123' },
                select: undefined,
                include: 'relations'
            });
            expect(result).toBe(mockItem);
        });
    });

    /**
     * 测试BaseController的create方法
     */
    describe('BaseController.create', () => {
        it('should create new item and filter auto-generated fields', async () => {
            const mockCreated = { id: 1, name: 'test', createTime: new Date() };
            mockModel.create.mockResolvedValue(mockCreated);

            testController['ctx'] = {
                request: {
                    body: {
                        name: 'test',
                        createTime: new Date(),
                        updateTime: new Date(),
                        description: 'test desc'
                    }
                }
            } as any;

            const result = await testController.create();

            expect(mockModel.create).toHaveBeenCalledWith({
                data: {
                    name: 'test',
                    description: 'test desc'
                }
            });
            expect(result).toBe(mockCreated);
        });
    });

    /**
     * 测试BaseController的update方法
     */
    describe('BaseController.update', () => {
        it('should update item by numeric id and filter auto-generated fields', async () => {
            const mockUpdated = { id: 1, name: 'updated' };
            mockModel.upsert.mockResolvedValue(mockUpdated);

            testController['ctx'] = {
                params: { id: '1' },
                request: {
                    body: {
                        name: 'updated',
                        createTime: new Date(),
                        updateTime: new Date()
                    }
                }
            } as any;

            const result = await testController.update();

            expect(mockModel.upsert).toHaveBeenCalledWith({
                where: { id: 1 },
                update: { name: 'updated' },
                create: { name: 'updated' }
            });
            expect(result).toBe(mockUpdated);
        });

        it('should update item by string id', async () => {
            const mockUpdated = { id: 'uuid-123', name: 'updated' };
            mockModel.upsert.mockResolvedValue(mockUpdated);

            testController['ctx'] = {
                params: { id: 'uuid-123' },
                request: {
                    body: { name: 'updated' }
                }
            } as any;

            const result = await testController.update();

            expect(mockModel.upsert).toHaveBeenCalledWith({
                where: { id: 'uuid-123' },
                update: { name: 'updated' },
                create: { name: 'updated' }
            });
            expect(result).toBe(mockUpdated);
        });
    });

    /**
     * 测试BaseController的delete方法
     */
    describe('BaseController.delete', () => {
        it('should delete item by numeric id', async () => {
            const mockDeleted = { id: 1, name: 'deleted' };
            mockModel.delete.mockResolvedValue(mockDeleted);

            testController['ctx'] = {
                params: { id: '1' }
            } as any;

            const result = await testController.delete();

            expect(mockModel.delete).toHaveBeenCalledWith({
                where: { id: 1 }
            });
            expect(result).toBe(mockDeleted);
        });

        it('should delete item by string id', async () => {
            const mockDeleted = { id: 'uuid-123', name: 'deleted' };
            mockModel.delete.mockResolvedValue(mockDeleted);

            testController['ctx'] = {
                params: { id: 'uuid-123' }
            } as any;

            const result = await testController.delete();

            expect(mockModel.delete).toHaveBeenCalledWith({
                where: { id: 'uuid-123' }
            });
            expect(result).toBe(mockDeleted);
        });
    });

    /**
     * 测试BaseController的success方法
     */
    describe('BaseController.success', () => {
        it('should return success response with content', () => {
            const content = { data: 'test' };
            const result = testController['success'](content);

            expect(result).toEqual({
                header: { status: 0 },
                content
            });
        });

        it('should return success response without content', () => {
            const result = testController['success']();

            expect(result).toEqual({
                header: { status: 0 },
                content: undefined
            });
        });
    });

    /**
     * 测试BaseService的各种方法
     */
    describe('BaseService', () => {
        it('should list items with cursor pagination', async () => {
            const mockData = [{ id: 1, name: 'test1' }];
            mockModel.findMany.mockResolvedValue(mockData);

            const result = await testService.list(10, 5);

            expect(mockModel.findMany).toHaveBeenCalledWith({
                take: 10,
                cursor: { id: 5 },
                skip: 1
            });
            expect(result).toEqual({ take: 10, records: mockData });
        });

        it('should list items without cursor', async () => {
            const mockData = [{ id: 1, name: 'test1' }];
            mockModel.findMany.mockResolvedValue(mockData);

            const result = await testService.list(10, null);

            expect(mockModel.findMany).toHaveBeenCalledWith({
                take: 10
            });
            expect(result).toEqual({ take: 10, records: mockData });
        });

        it('should create new item', async () => {
            const mockData = { id: 1, name: 'test' };
            const createData = { name: 'test' };
            mockModel.create.mockResolvedValue(mockData);

            const result = await testService.create(createData);

            expect(mockModel.create).toHaveBeenCalledWith({ data: createData });
            expect(result).toBe(mockData);
        });

        it('should find all items with pagination and sorting', async () => {
            const mockRecords = [{ id: 1, name: 'test1' }];
            const mockTotal = 1;
            mockModel.findMany.mockResolvedValue(mockRecords);
            mockModel.count.mockResolvedValue(mockTotal);

            const where = { status: 1 };
            const options: Partial<Options> = {
                sort: { name: 'asc' },
                page: 2,
                limit: 10,
                select: { id: true, name: true },
                include: { relations: true }
            };

            const result = await testService.findAll(where, options);

            expect(mockModel.findMany).toHaveBeenCalledWith({
                where,
                select: options.select,
                include: options.include,
                orderBy: { name: 'asc' },
                skip: 10,
                take: 10
            });
            expect(mockModel.count).toHaveBeenCalledWith({ where });
            expect(result).toEqual({
                records: mockRecords,
                total: mockTotal,
                currentPage: 2,
                pageSize: 10
            });
        });

        it('should handle string sort parameter', async () => {
            mockModel.findMany.mockResolvedValue([]);
            mockModel.count.mockResolvedValue(0);

            const options: Partial<Options> = {
                sort: '{"name": "desc"}'
            };

            await testService.findAll({}, options);

            expect(mockModel.findMany).toHaveBeenCalledWith({
                where: {},
                select: undefined,
                include: undefined,
                orderBy: { name: 'desc' },
                skip: 0,
                take: 20
            });
        });

        it('should find item by id', async () => {
            const mockItem = { id: '1', name: 'test' };
            mockModel.findUnique.mockResolvedValue(mockItem);

            const result = await testService.findById('1', {
                select: { id: true, name: true },
                include: { relations: true }
            });

            expect(mockModel.findUnique).toHaveBeenCalledWith({
                where: { id: '1' },
                select: { id: true, name: true },
                include: { relations: true }
            });
            expect(result).toBe(mockItem);
        });

        it('should find item by id without options', async () => {
            const mockItem = { id: '1', name: 'test' };
            mockModel.findUnique.mockResolvedValue(mockItem);

            const result = await testService.findById('1');

            expect(mockModel.findUnique).toHaveBeenCalledWith({
                where: { id: '1' },
                select: undefined,
                include: undefined
            });
            expect(result).toBe(mockItem);
        });

        it('should find one item by condition', async () => {
            const mockItem = { id: 1, name: 'test' };
            mockModel.findFirst.mockResolvedValue(mockItem);

            const where = { name: 'test' };
            const options = {
                select: { id: true, name: true },
                include: { relations: true }
            };

            const result = await testService.findOne(where, options);

            expect(mockModel.findFirst).toHaveBeenCalledWith({
                where,
                select: options.select,
                include: options.include
            });
            expect(result).toBe(mockItem);
        });

        it('should update one item', async () => {
            const mockUpdated = { id: 1, name: 'updated' };
            mockModel.upsert.mockResolvedValue(mockUpdated);

            const where = { id: 1 };
            const data = { name: 'updated' };

            const result = await testService.updateOne(where, data);

            expect(mockModel.upsert).toHaveBeenCalledWith({
                where,
                update: data,
                create: data
            });
            expect(result).toBe(mockUpdated);
        });

        it('should delete item by id', async () => {
            const mockDeleted = { id: '1', name: 'deleted' };
            mockModel.delete.mockResolvedValue(mockDeleted);

            const result = await testService.deleteById('1');

            expect(mockModel.delete).toHaveBeenCalledWith({
                where: { id: '1' }
            });
            expect(result).toBe(mockDeleted);
        });
    });

    /**
     * 测试DTO类
     */
    describe('DTO Classes', () => {
        it('should validate ListQuery with default values', () => {
            const query = new ListQuery();
            expect(query).toBeDefined();
        });

        it('should create BaseQuery instance', () => {
            const baseQuery = new BaseQuery();
            expect(baseQuery).toBeDefined();
            expect(baseQuery.select).toBeUndefined();
            expect(baseQuery.include).toBeUndefined();
            expect(baseQuery.sort).toBeUndefined();
            expect(baseQuery.page).toBeUndefined();
            expect(baseQuery.limit).toBeUndefined();
        });
    });

    /**
     * 测试Crud装饰器的基本功能
     */
    describe('Crud Decorator', () => {
        it('should create controller with crud decorator', () => {
            expect(TestController).toBeDefined();
            expect(TestController.prototype.list).toBeDefined();
            expect(TestController.prototype.page).toBeDefined();
            expect(TestController.prototype.info).toBeDefined();
            expect(TestController.prototype.create).toBeDefined();
            expect(TestController.prototype.update).toBeDefined();
            expect(TestController.prototype.delete).toBeDefined();
        });

        it('should apply crud decorator with custom options', () => {
            @Crud('/custom', {}, {
                apis: ['list', 'create'],
                dto: { create: Object },
                guard: null,
                access: ['read', 'write']
            })
            class CustomController extends BaseController {
                protected service = new TestService();
            }

            expect(CustomController).toBeDefined();
            expect(CustomController.prototype.list).toBeDefined();
            expect(CustomController.prototype.create).toBeDefined();
        });
    });
});