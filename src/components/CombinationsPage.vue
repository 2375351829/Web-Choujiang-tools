<template>
  <el-card class="combinations-card">
    <template #header>
      <div class="card-header">
        <span>抽奖组合配置</span>
        <div class="header-actions">
          <el-button type="primary" @click="handleAddCombination">
            <el-icon><Plus /></el-icon> 添加组合
          </el-button>
        </div>
      </div>
    </template>
    
    <el-form :model="searchForm" label-width="80px" class="search-form">
      <el-form-item label="搜索">
        <el-input v-model="searchForm.keyword" placeholder="请输入组合名称" clearable>
          <template #append>
            <el-button @click="handleSearch"><el-icon><Search /></el-icon></el-button>
          </template>
        </el-input>
      </el-form-item>
    </el-form>
    
    <el-table :data="combinationsList" style="width: 100%" border>
      <el-table-column prop="id" label="ID" width="80"></el-table-column>
      <el-table-column prop="name" label="组合名称"></el-table-column>
      <el-table-column prop="description" label="描述"></el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180"></el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="scope">
          <el-button size="small" @click="handleEditCombination(scope.row)">
            <el-icon><Edit /></el-icon> 编辑
          </el-button>
          <el-button size="small" @click="handleConfigurePrizes(scope.row)">
            <el-icon><Setting /></el-icon> 配置奖品
          </el-button>
          <el-button size="small" type="danger" @click="handleDeleteCombination(scope.row.id)">
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
  
  <!-- 添加/编辑组合对话框 -->
  <el-dialog
    v-model="dialogVisible"
    :title="dialogTitle"
    width="500px"
  >
    <el-form :model="combinationForm" label-width="100px">
      <el-form-item label="组合名称" prop="name" :rules="[{ required: true, message: '请输入组合名称', trigger: 'blur' }]">
        <el-input v-model="combinationForm.name" placeholder="请输入组合名称"></el-input>
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input v-model="combinationForm.description" type="textarea" placeholder="请输入组合描述"></el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveCombination">保存</el-button>
      </span>
    </template>
  </el-dialog>
  
  <!-- 配置奖品对话框 -->
  <el-dialog
    v-model="prizeConfigVisible"
    title="配置奖品"
    width="800px"
  >
    <div class="prize-config">
      <el-form :model="prizeConfigForm" label-width="100px">
        <el-form-item label="组合名称">
          <el-input v-model="prizeConfigForm.name" disabled></el-input>
        </el-form-item>
        <el-form-item label="可用奖品">
          <el-select
            v-model="selectedPrizeId"
            placeholder="请选择奖品"
            style="width: 100%"
          >
            <el-option
              v-for="prize in availablePrizes"
              :key="prize.id"
              :label="prize.name"
              :value="prize.id"
            >
              <div class="option-content">
                <span>{{ prize.name }}</span>
                <span class="option-desc">(数量: {{ prize.quantity }}, 概率: {{ prize.probability }}%)</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleAddPrizeToCombination" :disabled="!selectedPrizeId">
            <el-icon><Plus /></el-icon> 添加到组合
          </el-button>
        </el-form-item>
      </el-form>
      
      <el-table :data="combinationPrizes" style="width: 100%" border>
        <el-table-column prop="id" label="ID" width="80"></el-table-column>
        <el-table-column prop="name" label="奖品名称"></el-table-column>
        <el-table-column prop="quantity" label="数量" width="100"></el-table-column>
        <el-table-column prop="probability" label="中奖概率" width="120">
          <template #default="scope">
            {{ scope.row.probability }}%
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="scope">
            <el-button size="small" type="danger" @click="handleRemovePrizeFromCombination(scope.row.id)">
              <el-icon><Delete /></el-icon> 移除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="prizeConfigVisible = false">关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Plus, Search, Edit, Setting, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

// 状态管理
const combinationsList = ref([]);
const searchForm = ref({ keyword: '' });
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const dialogVisible = ref(false);
const dialogTitle = ref('添加组合');
const combinationForm = ref({
  id: '',
  name: '',
  description: ''
});

// 奖品配置相关
const prizeConfigVisible = ref(false);
const prizeConfigForm = ref({ name: '' });
const selectedPrizeId = ref('');
const availablePrizes = ref([]);
const combinationPrizes = ref([]);
let currentCombinationId = null;

// 初始化数据
onMounted(() => {
  fetchCombinations();
  fetchAvailablePrizes();
});

// 获取组合列表
const fetchCombinations = async () => {
  try {
    const response = await fetch(`/api/combinations?page=${currentPage.value}&pageSize=${pageSize.value}&keyword=${searchForm.value.keyword}`);
    const data = await response.json();
    combinationsList.value = data.combinations;
    total.value = data.total;
  } catch (error) {
    console.error('获取组合列表失败:', error);
    ElMessage.error('获取组合列表失败');
  }
};

// 获取可用奖品
const fetchAvailablePrizes = async () => {
  try {
    const response = await fetch('/api/prizes');
    const data = await response.json();
    availablePrizes.value = data.prizes;
  } catch (error) {
    console.error('获取可用奖品失败:', error);
    ElMessage.error('获取可用奖品失败');
  }
};

// 搜索
const handleSearch = () => {
  currentPage.value = 1;
  fetchCombinations();
};

// 分页处理
const handleSizeChange = (size) => {
  pageSize.value = size;
  fetchCombinations();
};

const handleCurrentChange = (current) => {
  currentPage.value = current;
  fetchCombinations();
};

// 添加组合
const handleAddCombination = () => {
  dialogTitle.value = '添加组合';
  combinationForm.value = {
    id: '',
    name: '',
    description: ''
  };
  dialogVisible.value = true;
};

// 编辑组合
const handleEditCombination = (combination) => {
  dialogTitle.value = '编辑组合';
  combinationForm.value = { ...combination };
  dialogVisible.value = true;
};

// 保存组合
const handleSaveCombination = async () => {
  try {
    const method = combinationForm.value.id ? 'PUT' : 'POST';
    const url = combinationForm.value.id ? `/api/combinations/${combinationForm.value.id}` : '/api/combinations';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(combinationForm.value)
    });
    
    const data = await response.json();
    if (data.success) {
      ElMessage.success(combinationForm.value.id ? '编辑成功' : '添加成功');
      dialogVisible.value = false;
      fetchCombinations();
    } else {
      ElMessage.error(data.message || '操作失败');
    }
  } catch (error) {
    console.error('保存组合失败:', error);
    ElMessage.error('保存组合失败');
  }
};

// 删除组合
const handleDeleteCombination = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除该组合吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    const response = await fetch(`/api/combinations/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    if (data.success) {
      ElMessage.success('删除成功');
      fetchCombinations();
    } else {
      ElMessage.error(data.message || '删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除组合失败:', error);
      ElMessage.error('删除组合失败');
    }
  }
};

// 配置奖品
const handleConfigurePrizes = async (combination) => {
  currentCombinationId = combination.id;
  prizeConfigForm.value.name = combination.name;
  await fetchCombinationPrizes(combination.id);
  prizeConfigVisible.value = true;
};

// 获取组合奖品
const fetchCombinationPrizes = async (combinationId) => {
  try {
    const response = await fetch(`/api/combinations/${combinationId}/prizes`);
    const data = await response.json();
    combinationPrizes.value = data.prizes;
  } catch (error) {
    console.error('获取组合奖品失败:', error);
    ElMessage.error('获取组合奖品失败');
  }
};

// 添加奖品到组合
const handleAddPrizeToCombination = async () => {
  if (!selectedPrizeId.value || !currentCombinationId) return;
  
  try {
    const response = await fetch(`/api/combinations/${currentCombinationId}/prizes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prize_id: selectedPrizeId.value })
    });
    
    const data = await response.json();
    if (data.success) {
      ElMessage.success('添加成功');
      await fetchCombinationPrizes(currentCombinationId);
      selectedPrizeId.value = '';
    } else {
      ElMessage.error(data.message || '添加失败');
    }
  } catch (error) {
    console.error('添加奖品失败:', error);
    ElMessage.error('添加奖品失败');
  }
};

// 从组合移除奖品
const handleRemovePrizeFromCombination = async (prizeId) => {
  if (!currentCombinationId) return;
  
  try {
    const response = await fetch(`/api/combinations/${currentCombinationId}/prizes/${prizeId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    if (data.success) {
      ElMessage.success('移除成功');
      await fetchCombinationPrizes(currentCombinationId);
    } else {
      ElMessage.error(data.message || '移除失败');
    }
  } catch (error) {
    console.error('移除奖品失败:', error);
    ElMessage.error('移除奖品失败');
  }
};
</script>

<style scoped>
.combinations-card {
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

.prize-config {
  max-height: 500px;
  overflow-y: auto;
}

.option-content {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.option-desc {
  font-size: 12px;
  color: #909399;
}
</style>