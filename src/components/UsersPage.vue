<template>
  <el-card class="users-card">
    <template #header>
      <div class="card-header">
        <span>人员管理</span>
        <div class="header-actions">
          <el-button type="primary" @click="handleAddUser">
            <el-icon><Plus /></el-icon> 添加人员
          </el-button>
          <el-button @click="handleImport">
            <el-icon><Upload /></el-icon> 导入
          </el-button>
          <el-button @click="handleExport">
            <el-icon><Download /></el-icon> 导出
          </el-button>
        </div>
      </div>
    </template>
    
    <el-form :model="searchForm" label-width="80px" class="search-form">
      <el-form-item label="搜索">
        <el-input v-model="searchForm.keyword" placeholder="请输入姓名、邮箱或电话" clearable>
          <template #append>
            <el-button @click="handleSearch"><el-icon><Search /></el-icon></el-button>
          </template>
        </el-input>
      </el-form-item>
    </el-form>
    
    <el-table :data="usersList" style="width: 100%" border>
      <el-table-column prop="id" label="ID" width="80"></el-table-column>
      <el-table-column prop="name" label="姓名"></el-table-column>
      <el-table-column prop="email" label="邮箱"></el-table-column>
      <el-table-column prop="phone" label="电话"></el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180"></el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="scope">
          <el-button size="small" @click="handleEditUser(scope.row)">
            <el-icon><Edit /></el-icon> 编辑
          </el-button>
          <el-button size="small" type="danger" @click="handleDeleteUser(scope.row.id)">
            <el-icon><Delete /></el-icon> 删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </el-card>
  
  <!-- 添加/编辑人员对话框 -->
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="500px"
  >
    <el-form :model="userForm" label-width="80px">
      <el-form-item label="姓名" prop="name" :rules="[{ required: true, message: '请输入姓名', trigger: 'blur' }]">
        <el-input v-model="userForm.name" placeholder="请输入姓名"></el-input>
      </el-form-item>
      <el-form-item label="邮箱" prop="email" :rules="[{ required: true, message: '请输入邮箱', trigger: 'blur' }, { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }]">
        <el-input v-model="userForm.email" placeholder="请输入邮箱"></el-input>
      </el-form-item>
      <el-form-item label="电话" prop="phone" :rules="[{ required: true, message: '请输入电话', trigger: 'blur' }]">
        <el-input v-model="userForm.phone" placeholder="请输入电话"></el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveUser">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Plus, Upload, Download, Search, Edit, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 状态管理
const usersList = ref([]);
const searchForm = ref({ keyword: '' });
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const dialogVisible = ref(false);
const dialogTitle = ref('添加人员');
const userForm = ref({
  id: '',
  name: '',
  email: '',
  phone: ''
});

// 初始化数据
onMounted(() => {
  fetchUsers();
});

// 获取人员列表
const fetchUsers = async () => {
  try {
    const response = await fetch(`/api/users?page=${currentPage.value}&pageSize=${pageSize.value}&keyword=${searchForm.value.keyword}`);
    const data = await response.json();
    usersList.value = data.users;
    total.value = data.total;
  } catch (error) {
    console.error('获取人员列表失败:', error);
    ElMessage.error('获取人员列表失败');
  }
};

// 搜索
const handleSearch = () => {
  currentPage.value = 1;
  fetchUsers();
};

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size;
  fetchUsers();
};

const handleCurrentChange = (current) => {
  currentPage.value = current;
  fetchUsers();
};

// 添加人员
const handleAddUser = () => {
  dialogTitle.value = '添加人员';
  userForm.value = {
    id: '',
    name: '',
    email: '',
    phone: ''
  };
  dialogVisible.value = true;
};

// 编辑人员
const handleEditUser = (user) => {
  dialogTitle.value = '编辑人员';
  userForm.value = { ...user };
  dialogVisible.value = true;
};

// 保存人员
const handleSaveUser = async () => {
  try {
    const method = userForm.value.id ? 'PUT' : 'POST';
    const url = userForm.value.id ? `/api/users/${userForm.value.id}` : '/api/users';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userForm.value)
    });
    
    const data = await response.json();
    if (data.success) {
      ElMessage.success(userForm.value.id ? '编辑成功' : '添加成功');
      dialogVisible.value = false;
      fetchUsers();
    } else {
      ElMessage.error(data.message || '操作失败');
    }
  } catch (error) {
    console.error('保存人员失败:', error);
    ElMessage.error('保存人员失败');
  }
};

// 删除人员
const handleDeleteUser = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除该人员吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    if (data.success) {
      ElMessage.success('删除成功');
      fetchUsers();
    } else {
      ElMessage.error(data.message || '删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除人员失败:', error);
      ElMessage.error('删除人员失败');
    }
  }
};

// 导入人员
const handleImport = () => {
  // 这里可以实现文件上传功能
  ElMessage.info('导入功能待实现');
};

// 导出人员
const handleExport = async () => {
  try {
    const response = await fetch('/api/users/export');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `人员列表_${new Date().getTime()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (error) {
    console.error('导出人员失败:', error);
    ElMessage.error('导出人员失败');
  }
};
</script>

<style scoped>
.users-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.search-form {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>