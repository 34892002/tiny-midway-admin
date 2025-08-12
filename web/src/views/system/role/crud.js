import { dict } from "@fast-crud/fast-crud";
import { addRequest, delRequest, editRequest, pageRequest } from "./api";

/**
 * 定义一个CrudOptions生成器方法
 */
export default function ({ crudExpose, context }) {
  return {
    crudOptions: {
      // 在这里自定义你的crudOptions配置
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      //这里定义两个字段
      columns: {
        name: {
          title: "角色",
          type: "text",
          search: {
            show: true,
            valueResolve({ key, value, form }) { // 利用格式转换实现模糊查询功能
              if(value) {
                // 如果查询name加上%结尾, 表示使用(contains)模糊查询
                form[key] = value + '%'
              }
            }
          },
          column: { width: 200 },
          form: {
            rule: [{ required: true, message: "请输入角色", trigger: 'blur' }],
          }
        },
        system: {
          title: "系统角色",
          type: "dict-select",
          readonly: true,
          dict: dict({
            data: [
              { value: true, label: "是" },
              { value: false, label: "否" },
            ]
          }),
          search: { show: true },
        },
        code: {
          title: "权限标识",
          type: "text",
          search: {
            show: true,
            valueResolve({ key, value, form }) { // 利用格式转换实现模糊查询功能
              if(value) {
                // 如果查询name加上%结尾, 表示使用(contains)模糊查询
                form[key] = value + '%'
              }
            }
          },
          form: {
            helper: '权限标识，不可修改，使用大小写字母、数字和下划线组成。',
            rule: [{ required: true, message: "请输入权限标识", trigger: 'blur' }],
          },
          editForm:{
            component: { disabled: true }
          }
        },
        policies: { // 插槽渲染
          title: "权限",
          search: { show: false },
          column: { show: false },
          form: {
            rule: [{ required: true, message: "请选择权限" }]
          },
        }
      },
      form:{
        wrapper:{
          // 禁止naiveui在所有表单拖动
          draggable: false,
          // 剁了重置按钮，不能v-model的组件要在reset之后处理重置的值
          buttons: {
            reset: { show: false }
          }
        }
      }
    }
  };
}