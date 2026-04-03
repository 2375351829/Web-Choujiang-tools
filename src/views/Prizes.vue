<template>
  <div class="prizes">
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>奖品管理</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon>
            新增奖品
          </el-button>
        </div>
      </template>

      <el-table :data="prizes" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="image_url" label="图片" width="120">
          <template #default="{ row }">
            <el-image
              v-if="row.image_url"
              :src="`http://localhost:3000${row.image_url}`"
              fit="cover"
              style="width: 80px; height: 80px; border-radius: 8px"
              :preview-src-list="[`http://localhost:3000${row.image_url}`]"
            />
            <el-empty v-else description="暂无图片" :image-size="40" />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="奖品名称" min-width="200" />
        <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
        <el-table-column prop="count" label="总数量" width="100" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button size="small" @click="handleUploadImage(row)">
              <el-icon><Upload /></el-icon>
              图片
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="prizes.length === 0 && !loading" description="暂无奖品" />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑奖品' : '新增奖品'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="奖品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入奖品名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入奖品描述"
          />
        </el-form-item>
        <el-form-item label="总数量" prop="count">
          <el-input-number v-model="form.count" :min="1" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="imageDialogVisible"
      title="上传奖品图片"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-upload
        class="avatar-uploader"
        :show-file-list="false"
        :http-request="handleUpload"
        :before-upload="beforeUpload"
        accept="image/jpeg,image/png,image/gif"
      >
        <img v-if="imagePreview" :src="imagePreview" class="avatar" />
        <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
      </el-upload>
      <div class="el-upload__tip" style="margin-top: 8px">
        只能上传 jpg/png/gif 格式的图片，且不超过 10MB
      </div>
      <template #footer>
        <el-button @click="imageDialogVisible = false">取消</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type UploadProps } from 'element-plus'
import { Plus, Edit, Delete, Upload } from '@element-plus/icons-vue'
import axios from 'axios'

const API_BASE = 'http://localhost:3000/api'

interface Prize {
  id: number
  name: string
  description: string
  image_url: string
  count: number
  created_at: string
  updated_at: string
}

const prizes = ref<Prize[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const imageDialogVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const currentPrize = ref<Prize | null>(null)
const imagePreview = ref('')

const form = reactive({
  name: '',
  description: '',
  count: 1
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入奖品名称', trigger: 'blur' }
  ],
  count: [
    { required: true, message: '请输入总数量', trigger: 'blur' }
  ]
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const loadPrizes = async () => {
  loading.value = true
  try {
    const res = await axios.get(`${API_BASE}/prizes`)
    prizes.value = res.data
  } catch (error) {
    console.error('加载奖品列表失败:', error)
    ElMessage.error('加载奖品列表失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = () => {
  isEdit.value = false
  Object.assign(form, {
    name: '',
    description: '',
    count: 1
  })
  dialogVisible.value = true
}

const handleEdit = (row: Prize) => {
  isEdit.value = true
  currentPrize.value = row
  Object.assign(form, {
    name: row.name,
    description: row.description,
    count: row.count
  })
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitLoading.value = true
      try {
        if (isEdit.value && currentPrize.value) {
          await axios.put(`${API_BASE}/prizes/${currentPrize.value.id}`, form)
          ElMessage.success('更新成功')
        } else {
          await axios.post(`${API_BASE}/prizes`, form)
          ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        loadPrizes()
      } catch (error: any) {
        console.error('提交失败:', error)
        ElMessage.error(error.response?.data?.error || '提交失败')
      } finally {
        submitLoading.value = false
      }
    }
  })
}

const handleDelete = (row: Prize) => {
  ElMessageBox.confirm('确定要删除该奖品吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await axios.delete(`${API_BASE}/prizes/${row.id}`)
      ElMessage.success('删除成功')
      loadPrizes()
    } catch (error: any) {
      console.error('删除失败:', error)
      ElMessage.error(error.response?.data?.error || '删除失败')
    }
  }).catch(() => {})
}

const handleUploadImage = (row: Prize) => {
  currentPrize.value = row
  imagePreview.value = row.image_url ? `http://localhost:3000${row.image_url}` : ''
  imageDialogVisible.value = true
}

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const isImage = file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/gif'
  if (!isImage) {
    ElMessage.error('只能上传 JPG/PNG/GIF 格式的图片!')
    return false
  }
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过 10MB!')
    return false
  }
  return true
}

const handleUpload = async (option: any) => {
  const { file } = option
  const formData = new FormData()
  formData.append('image', file)

  try {
    const res = await axios.post(`${API_BASE}/prizes/${currentPrize.value?.id}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    ElMessage.success('上传成功')
    if (currentPrize.value) {
      currentPrize.value.image_url = res.data.image_url
      imagePreview.value = `http://localhost:3000${res.data.image_url}`
    }
    loadPrizes()
  } catch (error: any) {
    console.error('上传失败:', error)
    ElMessage.error(error.response?.data?.error || '上传失败')
  }
}

onMounted(() => {
  loadPrizes()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.mb-4 {
  margin-bottom: 16px;
}

.avatar-uploader .avatar {
  width: 178px;
  height: 178px;
  display: block;
  border-radius: 8px;
}

.avatar-uploader :deep(.el-upload) {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.avatar-uploader :deep(.el-upload:hover) {
  border-color: var(--el-color-primary);
}

.el-icon.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
