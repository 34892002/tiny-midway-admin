<template>
  <CommonPage>
    <fs-crud ref="crudRef" v-bind="crudBinding" @reset="onReset">
      <template #form_policies="scope">
        <!-- {{ scope }} -->
        <n-tree-select
            multiple
            checkable
            default-expand-all
            label-field="name"
            key-field="code"
            check-strategy="all"
            :max-tag-count="3"
            :disabled="scope.mode === 'view'"
            :options="options"
            :default-value="scope.value"
            @update:value="value => handleUpdateValue(value, scope.form)"
          />
      </template>
    </fs-crud>
  </CommonPage>
</template>

<script setup>
  import { ref, onMounted } from "vue"
  import { useFs } from "@fast-crud/fast-crud"
  import createCrudOptions from "./crud"
  import { getTree } from "./api"
import { forEach } from "lodash-es";

  const context = 'demo' // 自定义参数
  const onExpose = (e) => {} // 将在createOptions之前触发
  const { crudRef, crudBinding, crudExpose } = useFs({ createCrudOptions, onExpose, context })
  const options = ref([])

  // crudExpose.doRemove = async (row) => {
  //   console.log("doRemove", row)
  // }

  // 页面打开后获取列表数据
  onMounted(async () => {
    crudExpose.doRefresh()
    const _data = await getTree()
    // 递归处理，没有children的全部删除
    const removeEmptyChildren = node => {
      if (node.children.length === 0) {
        delete node.children
      } else if (node.children) {
        node.children.forEach(child => removeEmptyChildren(child))
      }
    }
    _data.forEach(item => removeEmptyChildren(item))
    options.value = _data
  })

  const onReset = () => {
    console.log('reset')
  }
  const handleUpdateValue = (value, form) => {
    // console.log('value, option: ', value, option)
    form.policies = value
  }
</script>