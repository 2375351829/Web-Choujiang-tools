<template>
  <el-card class="animation-card">
    <template #header>
      <div class="card-header">
        <span>抽奖动画展示</span>
      </div>
    </template>
    
    <div class="animation-container">
      <!-- 抽奖动画组件 -->
      <LuckyDrawAnimation 
        :items="participants" 
        @start="handleStart" 
        @pause="handlePause" 
        @stop="handleStop" 
        @reset="handleReset" 
        @result="handleResult"
      />
    </div>
    
    <!-- 参与者管理 -->
    <el-card class="participants-card">
      <template #header>
        <div class="card-header">
          <span>参与者管理</span>
          <el-button type="primary" size="small" @click="addParticipant">
            <el-icon><Plus /></el-icon> 添加参与者
          </el-button>
        </div>
      </template>
      
      <el-table :data="participants" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="120"></el-table-column>
        <el-table-column prop="avatar" label="头像" width="100">
          <template #default="scope">
            <img v-if="scope.row.avatar" :src="scope.row.avatar" :alt="scope.row.name" class="table-avatar">
            <span v-else>无</span>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱"></el-table-column>
        <el-table-column prop="phone" label="电话"></el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button type="danger" size="small" @click="removeParticipant(scope.row)">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </el-card>
</template>

<script setup>
import { ref } from 'vue';
import { Plus, Delete } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import LuckyDrawAnimation from './LuckyDrawAnimation.vue';

// 参与者数据
const participants = ref([
  { id: 1, name: '张三', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20of%20a%20young%20man&image_size=square', email: 'zhangsan@example.com', phone: '13800138001' },
  { id: 2, name: '李四', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20of%20a%20young%20woman&image_size=square', email: 'lisi@example.com', phone: '13900139001' },
  { id: 3, name: '王五', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20of%20a%20middle-aged%20man&image_size=square', email: 'wangwu@example.com', phone: '13700137001' },
  { id: 4, name: '赵六', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20of%20a%20middle-aged%20woman&image_size=square', email: 'zhaoliu@example.com', phone: '13600136001' },
  { id: 5, name: '钱七', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20of%20an%20old%20man&image_size=square', email: 'qianqi@example.com', phone: '13500135001' },
  { id: 6, name: '孙八', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20of%20an%20old%20woman&image_size=square', email: 'sunba@example.com', phone: '13400134001' },
  { id: 7, name: '周九', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20of%20a%20teenager%20boy&image_size=square', email: 'zhoujiu@example.com', phone: '13300133001' },
  { id: 8, name: '吴十', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20of%20a%20teenager%20girl&image_size=square', email: 'wushi@example.com', phone: '13200132001' },
  { id: 9, name: '郑一', avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20of%20a%20businessman&image_size=square', email: 'zhengyi@example.com', phone: '13100131001' }
]);

// 处理抽奖开始
const handleStart = () => {
  console.log('抽奖开始');
  ElMessage.success('抽奖开始');
};

// 处理抽奖暂停
const handlePause = () => {
  console.log('抽奖暂停');
  ElMessage.warning('抽奖暂停');
};

// 处理抽奖停止
const handleStop = () => {
  console.log('抽奖停止');
  ElMessage.info('抽奖停止');
};

// 处理抽奖重置
const handleReset = () => {
  console.log('抽奖重置');
  ElMessage.info('抽奖重置');
};

// 处理抽奖结果
const handleResult = (data) => {
  console.log('抽奖结果:', data);
  ElMessage.success(`恭喜 ${data.winner.name} 中奖！`);
};

// 添加参与者
const addParticipant = () => {
  // 生成随机头像
  const randomAvatar = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=professional%20avatar%20${Math.random() > 0.5 ? 'man' : 'woman'}&image_size=square`;
  
  // 添加新参与者
  const newParticipant = {
    id: participants.value.length + 1,
    name: `参与者${participants.value.length + 1}`,
    avatar: randomAvatar,
    email: `participant${participants.value.length + 1}@example.com`,
    phone: `1300013000${participants.value.length + 1}`
  };
  
  participants.value.push(newParticipant);
  ElMessage.success('添加参与者成功');
};

// 删除参与者
const removeParticipant = (participant) => {
  ElMessageBox.confirm(
    `确定要删除参与者 ${participant.name} 吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const index = participants.value.findIndex(item => item.id === participant.id);
    if (index !== -1) {
      participants.value.splice(index, 1);
      ElMessage.success('删除参与者成功');
    }
  }).catch(() => {
    // 取消删除
  });
};
</script>

<style scoped>
.animation-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.animation-container {
  margin-bottom: 30px;
  height: 600px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.participants-card {
  margin-top: 30px;
}

.table-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .animation-container {
    height: 400px;
  }
}
</style>