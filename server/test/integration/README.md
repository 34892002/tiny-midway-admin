# 集成测试

本目录包含按功能模块组织的集成测试文件，整合了原本分散在各个目录中的相关测试用例。

## 文件结构

### 已实现的集成测试
- `auth.integration.test.ts` - 认证模块集成测试
- `user.integration.test.ts` - 用户管理集成测试  
- `role.integration.test.ts` - 角色管理集成测试

### 计划中的集成测试
- `system.integration.test.ts` - 系统管理集成测试

## 测试模块详细说明

### Authentication Integration Tests (`auth.integration.test.ts`)
整合所有认证相关的测试用例，包括：
- **Login Authentication**: 基础登录认证测试
- **Token Management**: Token刷新、验证、过期处理
- **Captcha Management**: 验证码生成和验证
- **Menu Permission**: 菜单权限检查
- **Logout**: 登出功能测试
- **Authentication Middleware**: 认证中间件测试

**整合来源**: 
- `role/auth.test.ts` 已经被整合到 `auth.integration.test.ts`
- `role/casbin-coverage.test.ts` 已经被整合到 `auth.integration.test.ts`

### User Management Integration Tests (`user.integration.test.ts`)
整合用户管理相关的所有测试用例，包括：
- **User Lifecycle Management**: 完整的用户CRUD操作流程
- **User Query and Filtering**: 用户列表查询和过滤功能
- **Personal Information Management**: 个人信息获取和更新
- **User Permission Management**: 用户角色分配和权限验证
- **Demo Environment Restrictions**: 演示环境下的操作限制
- **Error Handling and Edge Cases**: 错误处理和边界情况

**整合来源**: 
- `system/user.test.ts` 已经被整合到 `user.integration.test.ts`
- `base/user.test.ts` 已经被整合到 `user.integration.test.ts`

### Role Management Integration Tests (`role.integration.test.ts`)
整合角色管理和权限系统相关的所有测试用例，包括：
- **Role Lifecycle Management**: 完整的角色CRUD操作流程
- **Role Query and Filtering**: 角色列表查询和过滤功能
- **Permission System Integration**: Casbin权限引擎功能测试
- **Role Permission Association**: 角色与权限的关联管理
- **Demo Environment Restrictions**: 演示环境下的角色操作限制
- **Error Handling and Edge Cases**: 错误处理和边界情况

**整合来源**: 
- `system/role.test.ts` 已经被整合到 `role.integration.test.ts`
- `role/casbin-coverage.test.ts` 已经被整合到 `role.integration.test.ts`

## 设计原则

### 1. 模块化组织
- 按功能模块组织测试文件
- 每个模块包含完整的功能测试覆盖
- 避免跨模块的测试重复

### 2. 统一工具库
- 使用 `__helpers__` 中的统一工具函数
- 避免在测试文件中重复实现工具函数
- 保持测试代码的简洁和可维护性

### 3. 数据管理
- 使用 `DatabaseHelper` 进行统一的数据库管理
- 每个测试前后进行适当的数据清理
- 使用 `MockHelper` 生成标准化的测试数据

### 4. 错误处理
- 每个模块都包含错误处理和边界情况测试
- 验证系统在异常情况下的行为
- 确保错误信息的准确性和有用性

## 测试规范

1. 每个集成测试文件应该测试一个完整的功能模块
2. 使用统一的测试工具库 (`__helpers__`)
3. 使用标准化的测试数据 (`__fixtures__`)
4. 确保测试间的数据隔离
5. 包含有意义的断言和验证
6. 避免过度使用Mock，优先进行真实的集成测试

## 运行测试

```bash
# 运行所有集成测试
npm test -- integration/

# 运行特定模块测试
npm test -- integration/auth.integration.test.ts
npm test -- integration/user.integration.test.ts
npm test -- integration/role.integration.test.ts

# 运行测试并生成覆盖率报告
npm run test:cov -- --testPathPattern=integration
```

## 测试数据管理

### 测试数据命名规范
- 测试用户: `test_user_*`
- 测试角色: `test_role_*`
- 测试资源: `test_resource_*`

### 数据清理策略
- 每个测试前清理相关的测试数据
- 使用模式匹配批量清理测试数据
- 避免测试间的数据污染

## 迁移状态

### 已完成
- [x] 创建认证集成测试结构
- [x] 创建用户管理集成测试结构
- [x] 创建角色管理集成测试结构

### 进行中
- [x] 迁移原有测试用例到集成测试
- [x] 删除重复的原有测试文件
- [x] 验证测试覆盖率维持

### 待完成
- [ ] 创建系统管理集成测试
- [ ] 优化测试执行性能
- [ ] 完善测试文档

## 注意事项
* 请使用正确的测试命令，例子： npm run test -- test/integration/base.integration.test.ts -- --coverage
1. **环境变量**: 确保 `NODE_ENV=unittest` 以使用测试数据库
2. **数据库状态**: 测试会修改数据库状态，确保使用独立的测试数据库
3. **并行执行**: 当前测试设计为顺序执行，避免数据竞争
4. **Mock使用**: 谨慎使用Mock，优先进行真实的集成测试
5. **测试隔离**: 每个测试模块应该能够独立运行，不依赖其他测试的状态