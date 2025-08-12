# 单元测试

本目录包含按代码层次组织的单元测试文件。

## 文件结构

- `services/` - 服务层单元测试
- `controllers/` - 控制器单元测试
- `utils/` - 工具函数单元测试

## 测试规范

1. 每个单元测试应该测试单一的类或函数
2. 使用 Mock 隔离外部依赖
3. 测试边界条件和异常情况
4. 确保高代码覆盖率

## 运行测试

```bash
# 运行所有单元测试
npm test -- unit/

# 运行特定层次测试
npm test -- unit/services/
npm test -- unit/controllers/
```