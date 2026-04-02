<template>
  <el-card class="prizes-card">
    <template #header>
      <div class="card-header">
        <span>奖品管理</span>
        <div class="header-actions">
          <el-button type="primary" @click="handleAddPrize">
            <el-icon><Plus /></el-icon> 添加奖品
          </el-button>
        </div>
      </div>
    </template>
    
    <el-form :model="searchForm" label-width="80px" class="search-form">
      <el-form-item label="搜索">
        <el-input v-model="searchForm.keyword" placeholder="请输入奖品名称" clearable>
          <template #append>
            <el-button @click="handleSearch"><el-icon><Search /></el-icon></el-button>
          </template>
        </el-input>
      </el-form-item>
    </el-form>
    
    <el-table :data="prizesList" style="width: 100%" border>
      <el-table-column prop="id" label="ID" width="80"></el-table-column>
      <el-table-column prop="name" label="奖品名称"></el-table-column>
      <el-table-column prop="quantity" label="数量" width="100"></el-table-column>
      <el-table-column prop="probability" label="中奖概率" width="120">
        <template #default="scope">
          {{ scope.row.probability }}%
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180"></el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="scope">
          <el-button size="small" @click="handleEditPrize(scope.row)">
            <el-icon><Edit /></el-icon> 编辑
          </el-button>
          <el-button size="small" type="danger" @click="handleDeletePrize(scope.row.id)">
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
  
  <!-- 添加/编辑奖品对话框 -->
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="500px"
  >
    <el-form :model="prizeForm" label-width="100px">
      <el-form-item label="奖品名称" prop="name" :rules="[{ required: true, message: '请输入奖品名称', trigger: 'blur' }]">
        <el-input v-model="prizeForm.name" placeholder="请输入奖品名称"></el-input>
      </el-form-item>
      <el-form-item label="数量" prop="quantity" :rules="[{ required: true, message: '请输入数量', trigger: 'blur' }, { type: 'number', min: 1, message: '数量必须大于0', trigger: 'blur' }]">
        <el-input-number v-model="prizeForm.quantity" :min="1" :step="1"></el-input-number>
      </el-form-item>
      <el-form-item label="中奖概率" prop="probability" :rules="[{ required: true, message: '请输入中奖概率', trigger: 'blur' }, { type: 'number', min: 0, max: 100, message: '概率必须在0-100之间', trigger: 'blur' }]">
        <el-input-number v-model="prizeForm.probability" :min="0" :max="100" :step="0.1"></el-input-number>
        <span class="unit">%</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSavePrize">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 状态管理
const prizesList = ref([]);
const searchForm = ref({ keyword: '' });
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const dialogVisible = ref(false);
const dialogTitle = ref('添加奖品');
const prizeForm = ref({
  id: '',
  name: '',
  quantity: 1,
  probability: 0
});

// 初始化数据
onMounted(() => {
  fetchPrizes();
});

// 获取奖品列表
const fetchPrizes = async () => {
  try {
    const response = await fetch(`/api/prizes?page=${currentPage.value}&pageSize=${pageSize.value}&keyword=${searchForm.value.keyword}`);
    const data = await response.json();
    prizesList.value = data.prizes;
    total.value = data.total;
  } catch (error) {
    console.error('获取奖品列表失败:', error);
    ElMessage.error('获取奖品列表失败');
  }
};

// 搜索
const handleSearch = () => {
  currentPage.value = 1;
  fetchPrizes();
};

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size;
  fetchPrizes();
};

const handleCurrentChange = (current) => {
  currentPage.value = current;
  fetchPrizes();
};

// 添加奖品
const handleAddPrize = () => {
  dialogTitle.value = '添加奖品';
  prizeForm.value = {
    id: '',
    name: '',
    quantity: 1,
    probability: 0
  };
  dialogVisible.value = true;
};

// 编辑奖品
const handleEditPrize = (prize) => {
  dialogTitle.value = '编辑奖品';
  prizeForm.value = { ...prize };
  dialogVisible.value = true;
};

// 保存奖品
const handleSavePrize = async () => {
  try {
    const method = prizeForm.value.id ? 'PUT' : 'POST';
    const url = prizeForm.value.id ? `/api/prizes/${prizeForm.value.id}` : '/api/prizes';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prizeForm.value)
    });
    
    const data = await response.json();
    if (data.success) {
      ElMessage.success(prizeForm.value.id ? '编辑成功' : '添加成功');
      dialogVisible.value = false;
      fetchPrizes();
    } else {
      ElMessage.error(data.message || '操作失败');
    }
  } catch (error) {
    console.error('保存奖品失败:', error);
    ElMessage.error('保存奖品失败');
  }
};

// 删除奖品
const handleDeletePrize = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除该奖品吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    const response = await fetch(`/api/prizes/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    if (data.success) {
      ElMessage.success('删除成功');
      fetchPrizes();
    } else {
      ElMessage.error(data.message || '删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除奖品失败:', error);
      ElMessage.error('删除奖品失败');
    }
  }
};
</script>

<style scoped>
.prizes-card {
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

.unit {
  margin-left: 10px;
  color: #606266;
}
</style>