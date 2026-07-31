<template>
  <div class="page-container">
    <!-- 页面标题 + 快捷操作 -->
    <div class="page-header">
      <h2 class="page-title">工作台</h2>
      <div class="quick-actions">
        <el-button type="primary" :icon="Plus" @click="router.push('/orders/create')">创建订单</el-button>
        <el-button :icon="User" @click="router.push('/customers')">新增客户</el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row" v-loading="loading">
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <el-icon class="stat-icon" style="color: #1677ff"><Document /></el-icon>
          <div class="stat-value">{{ stats.monthOrderCount ?? 0 }}</div>
          <div class="stat-label">本月订单数</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <el-icon class="stat-icon" style="color: #f56c6c"><Van /></el-icon>
          <div class="stat-value">{{ stats.pendingShipmentCount ?? 0 }}</div>
          <div class="stat-label">待发货订单</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <el-icon class="stat-icon" style="color: #e6a23c"><Money /></el-icon>
          <div class="stat-value">¥{{ formatMoney(stats.unpaidAmount) }}</div>
          <div class="stat-label">未收款金额</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <el-icon class="stat-icon" style="color: #67c23a"><User /></el-icon>
          <div class="stat-value">{{ stats.customerCount ?? 0 }}</div>
          <div class="stat-label">客户总数</div>
        </div>
      </el-col>
    </el-row>

    <!-- 近期订单 -->
    <div class="card-box">
      <div class="section-header">
        <h3 class="section-title">近期订单</h3>
        <el-button link type="primary" @click="router.push('/orders')">查看全部</el-button>
      </div>
      <div class="table-wrapper">
        <el-table
          :data="stats.recentOrders"
          v-loading="loading"
          style="width: 100%"
          @row-click="handleRowClick"
        >
          <el-table-column prop="order_no" label="订单号" min-width="150" />
          <el-table-column prop="company_name" label="客户名" min-width="150" />
          <el-table-column prop="order_date" label="日期" width="120" />
          <el-table-column label="金额" width="130" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.total_amount) }}</template>
          </el-table-column>
          <el-table-column label="发货状态" width="100" align="center">
            <template #default="{ row }">
              <StatusTag type="delivery" :value="row.delivery_status" />
            </template>
          </el-table-column>
          <el-table-column label="付款状态" width="100" align="center">
            <template #default="{ row }">
              <StatusTag type="payment" :value="row.payment_status" />
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无订单数据" :image-size="80" />
          </template>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Document, Van, Money, User, Plus } from '@element-plus/icons-vue';
import api from '../api';
import { formatMoney } from '../utils/constants';
import StatusTag from '../components/StatusTag.vue';

const router = useRouter();
const loading = ref(false);

const stats = reactive({
  monthOrderCount: 0,
  pendingShipmentCount: 0,
  unpaidAmount: 0,
  customerCount: 0,
  recentOrders: [],
});

async function fetchStats() {
  loading.value = true;
  try {
    const data = await api.get('/dashboard/stats');
    Object.assign(stats, data);
  } catch {
    // 错误已由拦截器统一处理
  } finally {
    loading.value = false;
  }
}

function handleRowClick(row) {
  router.push(`/orders/${row.id}`);
}

onMounted(() => {
  fetchStats();
});
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1d2129;
}

.quick-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

:deep(.el-table__row) {
  cursor: pointer;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 18px;
  }
  .stat-card {
    padding: 16px;
  }
  .stat-card .stat-value {
    font-size: 22px;
  }
  .stat-card .stat-icon {
    font-size: 26px;
  }
}
</style>
