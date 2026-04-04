<template>
  <div class="field-config-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>扩展字段配置</span>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon> 添加字段
          </el-button>
        </div>
      </template>

      <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
        配置当前场景下的扩展字段，添加人员时可填写这些扩展信息
      </el-alert>

      <el-table :data="fieldConfigs" stripe border v-loading="loading">
        <el-table-column prop="sort_order" label="排序" width="70" />
        <el-table-column prop="field_key" label="字段标识" width="150" />
        <el-table-column prop="field_name" label="字段名称" width="150" />
        <el-table-column prop="field_type" label="字段类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ getTypeName(row.field_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="required" label="必填" width="80">
          <template #default="{ row }">
            <el-tag :type="row.required ? 'danger' : 'info'" size="small">
              {{ row.required ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="placeholder" label="占位提示" min-width="150" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="showEditDialog(row)">编辑</el-button>
            <el-popconfirm title="确定删除该字段?" @confirm="handleDelete(row.id)">
              <template #reference>
                <el-button size="small" type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑字段' : '添加字段'" width="550px" destroy-on-close>
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="字段标识" prop="field_key">
          <el-input 
            v-model="form.field_key" 
            placeholder="如：student_id（英文字母下划线）"
            :disabled="!!editingId"
          />
        </el-form-item>
        <el-form-item label="字段名称" prop="field_name">
          <el-input v-model="form.field_name" placeholder="如：学号" />
        </el-form-item>
        <el-form-item label="字段类型" prop="field_type">
          <el-select v-model="form.field_type" style="width: 100%">
            <el-option label="文本" value="text" />
            <el-option label="多行文本" value="textarea" />
            <el-option label="数字" value="number" />
            <el-option label="日期" value="date" />
            <el-option label="下拉选择" value="select" />
            <el-option label="JSON对象" value="json" />
          </el-select>
        </el-form-item>
        <el-form-item label="是否必填">
          <el-switch v-model="form.required" />
        </el-form-item>
        <el-form-item label="占位提示">
          <el-input v-model="form.placeholder" placeholder="输入框内的提示文字" />
        </el-form-item>
        <el-form-item label="默认值">
          <el-input v-model="form.default_value" placeholder="字段的默认值" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort_order" :min="0" :max="100" />
        </el-form-item>
        <el-form-item label="验证规则" v-if="form.field_type === 'text'">
          <el-input v-model="form.validation_rule" placeholder="正则表达式，如：^[A-Za-z0-9]+$" />
        </el-form-item>
        <el-form-item label="选项配置" v-if="form.field_type === 'select'">
          <el-input 
            v-model="optionsText" 
            type="textarea" 
            :rows="3"
            placeholder="每行一个选项值"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, inject } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getFieldConfigs, createFieldConfig, updateFieldConfig, deleteFieldConfig, type FieldConfig } from '../api/fieldConfigs'

const sceneId = inject<any>('sceneId')
const isInitialized = inject<any>('isInitialized')

const loading = ref(false)
const submitting = ref(false)
const fieldConfigs = ref<FieldConfig[]>([])
const editingId = ref<number | null>(null)
const dialogVisible = ref(false)
const formRef = ref<any>(null)

const form = ref<Partial<FieldConfig>>({
  field_key: '',
  field_name: '',
  field_type: 'text',
  required: false,
  placeholder: '',
  default_value: '',
  validation_rule: '',
  sort_order: 0,
  options: null
})

const optionsText = ref('')

const formRules = {
  field_key: [
    { required: true, message: '字段标识不能为空', trigger: 'blur' },
    { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '只能包含字母、数字和下划线，且不能以数字开头', trigger: 'blur' }
  ],
  field_name: [
    { required: true, message: '字段名称不能为空', trigger: 'blur' }
  ],
  field_type: [
    { required: true, message: '请选择字段类型', trigger: 'change' }
  ]
}

const getTypeName = (type: string) => {
  const map: Record<string, string> = {
    text: '文本',
    textarea: '多行文本',
    number: '数字',
    date: '日期',
    select: '下拉选择',
    json: 'JSON'
  }
  return map[type] || type
}

const loadFieldConfigs = async () => {
  if (!sceneId.value) return
  
  loading.value = true
  try {
    fieldConfigs.value = await getFieldConfigs(sceneId.value)
  } catch (error) {
    console.error('加载字段配置失败:', error)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.value = {
    field_key: '',
    field_name: '',
    field_type: 'text',
    required: false,
    placeholder: '',
    default_value: '',
    validation_rule: '',
    sort_order: fieldConfigs.value.length + 1,
    options: null
  }
  optionsText.value = ''
  editingId.value = null
}

const showAddDialog = () => {
  resetForm()
  dialogVisible.value = true
}

const showEditDialog = (row: FieldConfig) => {
  editingId.value = row.id!
  form.value = { ...row }
  if (row.options?.options && Array.isArray(row.options.options)) {
    optionsText.value = row.options.options.join('\n')
  } else {
    optionsText.value = ''
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    
    submitting.value = true
    try {
      const data = { ...form.value }
      
      if (data.field_type === 'select' && optionsText.value) {
        data.options = { options: optionsText.value.split('\n').filter(s => s.trim()) }
      } else {
        data.options = null
      }
      
      if (editingId.value) {
        await updateFieldConfig(editingId.value, data)
        ElMessage.success('更新成功')
      } else {
        await createFieldConfig(sceneId.value, data)
        ElMessage.success('添加成功')
      }
      
      dialogVisible.value = false
      loadFieldConfigs()
    } catch (error: any) {
      ElMessage.error(error.response?.data?.error || '操作失败')
    } finally {
      submitting.value = false
    }
  })
}

const handleDelete = async (id: number) => {
  try {
    await deleteFieldConfig(id)
    ElMessage.success('删除成功')
    loadFieldConfigs()
  } catch (error) {
    ElMessage.error('删除失败')
  }
}

watch(sceneId, () => {
  if (sceneId.value && isInitialized.value) {
    loadFieldConfigs()
  }
})

watch(isInitialized, () => {
  if (isInitialized.value && sceneId.value) {
    loadFieldConfigs()
  }
})

onMounted(() => {
  if (isInitialized.value && sceneId.value) {
    loadFieldConfigs()
  }
})
</script>

<style scoped>
.field-config-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
