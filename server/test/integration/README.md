# 集成测试

本目录包含按功能模块组织的集成测试文件，整合了原本分散在各个目录中的相关测试用例。

## 文件结构

### 已实现的集成测试
- `auth.integration.test.ts` - 认证模块集成测试
- `user.integration.test.ts` - 用户管理集成测试  
- `role.integration.test.ts` - 角色管理集成测试

### 已实现的集成测试（续）
- `system.integration.test.ts` - 系统管理集成测试
  - 资源路由管理测试
  - 菜单完整生命周期管理（CRUD）
  - 菜单创建验证逻辑
  - 菜单更新权限变更逻辑
  - 菜单删除限制（子菜单检查、演示环境限制）
  - 错误处理和边界情况测试

## 测试模块详细说明

### Authentication Integration Tests (`auth.integration.test.ts`)
整合所有认证相关的测试用例，包括：
- **Login Authentication**: 基础登录认证测试
- **Token Management**: Token刷新、验证、过期处理
- **Captcha Management**: 验证码生成和验证
- **Menu Permission**: 菜单权限检查
- **Logout**: 登出功能测试
- **Authentication Middleware**: 认证中间件测试

**测试覆盖范围**:
- 基础登录认证流程
- Token管理和验证机制
- 验证码生成和校验
- 菜单权限检查逻辑
- 登出功能完整性
- 认证中间件集成测试

### User Management Integration Tests (`user.integration.test.ts`)
整合用户管理相关的所有测试用例，包括：
- **User Lifecycle Management**: 完整的用户CRUD操作流程
- **User Query and Filtering**: 用户列表查询和过滤功能
- **Personal Information Management**: 个人信息获取和更新
- **User Permission Management**: 用户角色分配和权限验证
- **Demo Environment Restrictions**: 演示环境下的操作限制
- **Error Handling and Edge Cases**: 错误处理和边界情况

**测试覆盖范围**:
- 用户生命周期管理流程
- 用户查询和过滤功能
- 个人信息管理接口
- 用户权限分配验证
- 演示环境操作限制
- 用户管理错误处理

### Role Management Integration Tests (`role.integration.test.ts`)
整合角色管理和权限系统相关的所有测试用例，包括：
- **Role Lifecycle Management**: 完整的角色CRUD操作流程
- **Role Query and Filtering**: 角色列表查询和过滤功能
- **Permission System Integration**: Casbin权限引擎功能测试
- **Role Permission Association**: 角色与权限的关联管理
- **Demo Environment Restrictions**: 演示环境下的角色操作限制
- **Error Handling and Edge Cases**: 错误处理和边界情况

**测试覆盖范围**:
- 角色生命周期管理流程
- 角色查询和过滤功能
- Casbin权限引擎集成
- 角色权限关联管理
- 演示环境角色限制
- 角色管理错误处理

### System Management Integration Tests (`system.integration.test.ts`)
整合系统管理相关的所有测试用例，包括：
- **Resource Route Management**: 获取所有系统路由、未认证访问处理
- **Menu Lifecycle Management**: 完整的菜单CRUD操作流程
- **Menu Creation Validation**: 重复编码检查、order字段默认值处理
- **Menu Update Logic**: 权限变更检测（code修改、enable状态变更）
- **Menu Deletion Restrictions**: 子菜单检查、演示环境删除限制
- **Error Handling and Edge Cases**: 未认证访问、无效数据、不存在资源操作

**测试覆盖范围**:
- 系统路由管理功能
- 菜单生命周期管理
- 菜单创建验证逻辑
- 菜单更新权限处理
- 菜单删除限制检查
- 系统管理错误处理

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
npm test -- integration/auth
npm test -- integration/user
npm test -- integration/role

# 运行全部测试并输出详细信息 
npm run test -- --verbose
# 运行全部测试并生成覆盖率报告
npm run cov:html
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

## 集成测试开发指南

### 创建新的集成测试模块

当需要为新功能模块创建集成测试时，请遵循以下步骤：

1. **确定测试范围**：明确需要测试的功能边界和集成点
2. **创建测试文件**：在 `test/integration/` 目录下创建 `[module].integration.test.ts` 文件
3. **设计测试用例**：按照功能分组组织测试用例
4. **实现测试逻辑**：使用统一的测试工具和数据管理策略
5. **验证测试覆盖率**：确保关键功能路径都有测试覆盖

### 测试文件命名规范

- 认证相关：`auth.integration.test.ts`
- 用户管理：`user.integration.test.ts`
- 角色管理：`role.integration.test.ts`
- 系统管理：`system.integration.test.ts`
- 其他模块：`[module-name].integration.test.ts`

### 测试用例组织原则

- 按功能模块分组
- 每个模块包含完整的CRUD测试
- 包含权限验证测试
- 包含错误处理测试
- 包含边界条件测试

## 测试最佳实践

### 1. 测试编写原则
- **单一职责**: 每个测试用例只验证一个功能点
- **独立性**: 测试用例之间不应有依赖关系
- **可重复性**: 测试结果应该是确定的和可重复的
- **清晰命名**: 使用描述性的测试名称，明确测试目的
- **适当断言**: 使用有意义的断言，避免过度或不足的验证

### 2. 数据管理最佳实践
- **测试数据隔离**: 使用唯一标识符避免数据冲突
- **数据清理**: 在测试前后进行适当的数据清理
- **最小数据集**: 只创建测试所需的最少数据
- **真实数据**: 使用接近生产环境的测试数据

### 3. 性能优化建议
- **批量操作**: 合并相关的数据库操作
- **连接复用**: 复用数据库连接和HTTP客户端
- **并行执行**: 在安全的情况下启用测试并行执行
- **选择性运行**: 使用测试标签进行选择性测试执行

### 4. 错误处理测试
- **边界条件**: 测试输入的边界值和极端情况
- **异常路径**: 验证错误处理逻辑的正确性
- **错误消息**: 确保错误消息准确且有用
- **状态恢复**: 验证系统在错误后能正确恢复

## 故障排除指南

### 常见问题及解决方案

#### 1. 数据库连接问题
**症状**: 测试启动时出现数据库连接错误
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**解决方案**:
- 确保数据库服务正在运行
- 检查 `.env` 和 `unittest.env` 中的数据库配置
- 验证数据库用户权限
- 确保测试数据库已创建

#### 2. 权限认证失败
**症状**: 测试中出现 401 Unauthorized 错误
```
UnauthorizedError: Unauthorized
```
**解决方案**:
- 检查测试用户的角色和权限配置
- 验证JWT token的生成和传递
- 确保Casbin权限规则正确加载
- 检查演示环境限制设置

#### 3. 测试数据冲突
**症状**: 测试因为重复数据而失败
```
PrismaClientKnownRequestError: Unique constraint failed
```
**解决方案**:
- 使用唯一的测试数据标识符
- 在测试前清理相关数据
- 检查数据库约束设置
- 使用事务回滚机制

#### 4. 测试超时
**症状**: 测试执行超时
```
Timeout - Async callback was not invoked within the 5000ms timeout
```
**解决方案**:
- 增加Jest超时配置
- 优化数据库查询性能
- 检查异步操作的正确处理
- 使用适当的等待机制

#### 5. Mock数据问题
**症状**: Mock数据与实际数据不匹配
**解决方案**:
- 保持Mock数据与实际API响应一致
- 定期更新Mock数据
- 使用类型检查确保数据结构正确
- 优先使用真实的集成测试

### 调试技巧

#### 1. 数据库状态检查
```bash
# 连接测试数据库检查数据状态
npx prisma studio --schema=./prisma/schema.prisma

# 重置测试数据库
npx prisma migrate reset --force
```

### 性能分析

#### 1. 测试执行时间分析
```bash
# 显示每个测试的执行时间
npm test -- --verbose

# 分析慢测试
npm test -- --detectSlowTests
```

#### 2. 内存使用监控
```bash
# 监控内存使用
npm test -- --logHeapUsage

# 检测内存泄漏
npm test -- --detectLeaks
```

## 注意事项
* 请使用正确的测试命令，例子： npm run test -- test/integration/base.integration.test.ts -- --coverage
1. **环境变量**: 确保 `NODE_ENV=unittest` 以使用测试数据库
2. **数据库状态**: 测试会修改数据库状态，确保使用独立的测试数据库
3. **并行执行**: 当前测试设计为顺序执行，避免数据竞争
4. **Mock使用**: 谨慎使用Mock，优先进行真实的集成测试
5. **测试隔离**: 每个测试模块应该能够独立运行，不依赖其他测试的状态
6. **定期维护**: 定期更新测试数据和Mock数据，保持与生产环境的一致性
7. **文档同步**: 当API或业务逻辑发生变化时，及时更新相关测试用例