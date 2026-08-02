<template>
  <div class="page-container">
    <!-- 页面标题 + 操作 -->
    <div class="page-header">
      <div class="title-group">
        <h2 class="page-title">客户对账单</h2>
        <p class="page-subtitle">按客户和日期范围汇总订单，生成对账明细</p>
      </div>
      <el-button
        v-if="statement"
        type="primary"
        :icon="Printer"
        :loading="generating"
        @click="generatePdf"
      >
        生成对账单PDF
      </el-button>
    </div>

    <!-- 筛选区域 -->
    <div class="card-box">
      <div class="filter-bar">
        <el-select
          v-model="customerId"
          filterable
          clearable
          placeholder="请选择客户"
          style="width: 260px"
          :loading="customerLoading"
        >
          <el-option
            v-for="c in customers"
            :key="c.id"
            :label="c.company_name"
            :value="c.id"
          />
        </el-select>

        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 320px"
        />

        <el-button type="primary" :icon="Search" :loading="loading" @click="handleQuery">
          查询
        </el-button>
      </div>
    </div>

    <!-- 结果区域 -->
    <template v-if="statement">
      <!-- 客户信息卡片 -->
      <div class="card-box">
        <div class="section-header">
          <h3 class="section-title">客户信息</h3>
          <span class="date-range-text">
            对账区间：{{ statement.dateRange?.startDate || '-' }} 至 {{ statement.dateRange?.endDate || '-' }}
          </span>
        </div>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="公司名称">
            {{ statement.customer?.company_name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系人">
            {{ statement.customer?.contact_name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="电话">
            {{ statement.customer?.phone || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="地址" :span="2">
            {{ statement.customer?.address || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="税号">
            {{ statement.customer?.tax_number || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 汇总卡片 -->
      <el-row :gutter="16" class="summary-row">
        <el-col :xs="12" :sm="6">
          <div class="summary-card color-gray">
            <div class="summary-label">期初欠款</div>
            <div class="summary-value">¥{{ formatMoney(statement.summary?.initial_debt) }}</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="summary-card color-blue">
            <div class="summary-label">本期订单总额</div>
            <div class="summary-value">¥{{ formatMoney(statement.summary?.total_amount) }}</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="summary-card color-green">
            <div class="summary-label">本期已付</div>
            <div class="summary-value">¥{{ formatMoney(statement.summary?.total_paid) }}</div>
          </div>
        </el-col>
        <el-col :xs="12" :sm="6">
          <div class="summary-card color-red highlight">
            <div class="summary-label">本期应付</div>
            <div class="summary-value">¥{{ formatMoney(statement.summary?.balance_due) }}</div>
          </div>
        </el-col>
      </el-row>

      <!-- 订单明细表格 -->
      <div class="card-box">
        <div class="section-header">
          <h3 class="section-title">订单明细</h3>
          <span class="order-count-text">共 {{ statement.summary?.order_count ?? 0 }} 笔订单</span>
        </div>
        <div class="table-wrapper">
          <el-table
            :data="statement.orders"
            v-loading="loading"
            show-summary
            :summary-method="getSummaries"
            style="width: 100%"
          >
            <el-table-column type="index" label="序号" width="70" align="center" />
            <el-table-column prop="order_no" label="订单号" min-width="160" show-overflow-tooltip />
            <el-table-column prop="order_date" label="下单日期" width="120" align="center" />
            <el-table-column label="订单金额" width="140" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.total_amount) }}</template>
            </el-table-column>
            <el-table-column label="已付金额" width="140" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.paid_amount) }}</template>
            </el-table-column>
            <el-table-column label="未付金额" width="140" align="right">
              <template #default="{ row }">
                ¥{{ formatMoney(Number(row.total_amount) - Number(row.paid_amount)) }}
              </template>
            </el-table-column>
            <el-table-column label="发货状态" width="110" align="center">
              <template #default="{ row }">
                <StatusTag type="delivery" :value="row.delivery_status" />
              </template>
            </el-table-column>
            <el-table-column label="付款状态" width="110" align="center">
              <template #default="{ row }">
                <StatusTag type="payment" :value="row.payment_status" />
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="该区间内暂无订单数据" :image-size="80" />
            </template>
          </el-table>
        </div>
      </div>
    </template>

    <!-- 空状态提示 -->
    <div v-else-if="!loading" class="card-box empty-tip">
      <el-empty description="请选择客户和日期范围后点击查询，生成对账单" :image-size="100" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Printer } from '@element-plus/icons-vue';
import api from '../api';
import { formatMoney } from '../utils/constants';
import StatusTag from '../components/StatusTag.vue';

const customers = ref([]);
const customerId = ref(null);
const dateRange = ref([]);
const customerLoading = ref(false);
const loading = ref(false);
const generating = ref(false);
const statement = ref(null);

// 默认日期范围：本月第一天 至 今天
function initDefaultDateRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1);
  const fmt = (d) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };
  dateRange.value = [fmt(start), fmt(now)];
}

async function fetchCustomers() {
  customerLoading.value = true;
  try {
    const data = await api.get('/customers', { params: { pageSize: 999 } });
    customers.value = data.list || [];
  } catch {
    // 错误已由拦截器统一处理
  } finally {
    customerLoading.value = false;
  }
}

async function handleQuery() {
  if (!customerId.value) {
    ElMessage.warning('请选择客户');
    return;
  }
  if (!dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning('请选择日期范围');
    return;
  }
  loading.value = true;
  try {
    const [startDate, endDate] = dateRange.value;
    const data = await api.get(`/orders/statement/${customerId.value}`, {
      params: { startDate, endDate },
    });
    statement.value = data;
  } catch {
    // 错误已由拦截器统一处理
  } finally {
    loading.value = false;
  }
}

// 表格合计行
function getSummaries({ columns }) {
  const sums = [];
  const s = statement.value?.summary || {};
  const totalAmount = Number(s.total_amount) || 0;
  const totalPaid = Number(s.total_paid) || 0;
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '合计';
      return;
    }
    switch (index) {
      case 3: // 订单金额
        sums[index] = '¥' + formatMoney(totalAmount);
        break;
      case 4: // 已付金额
        sums[index] = '¥' + formatMoney(totalPaid);
        break;
      case 5: // 未付金额
        sums[index] = '¥' + formatMoney(totalAmount - totalPaid);
        break;
      default:
        sums[index] = '';
    }
  });
  return sums;
}

async function generatePdf() {
  if (!customerId.value || !dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning('请先选择客户和日期范围');
    return;
  }
  generating.value = true;
  try {
    const [startDate, endDate] = dateRange.value;
    const html = await api.get(`/documents/statement/${customerId.value}`, { params: { startDate, endDate } });
    const win = window.open('', '_blank');
    if (!win) {
      ElMessage.error('新窗口被浏览器拦截，请允许弹窗后重试');
      return;
    }
    win.document.write(html);
    win.document.close();
  } catch {
    ElMessage.error('生成对账单失败，请稍后重试');
  } finally {
    generating.value = false;
  }
}

onMounted(() => {
  initDefaultDateRange();
  fetchCustomers();
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

.title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1d2129;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

.date-range-text,
.order-count-text {
  font-size: 13px;
  color: #909399;
}

/* 汇总卡片 */
.summary-row {
  margin-bottom: 16px;
}

.summary-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  border-top: 4px solid transparent;
}

.summary-label {
  font-size: 14px;
  color: #909399;
}

.summary-value {
  font-size: 26px;
  font-weight: 700;
  margin-top: 10px;
  line-height: 1.2;
}

.summary-card.color-gray {
  border-top-color: #909399;
}
.summary-card.color-gray .summary-value {
  color: #909399;
}

.summary-card.color-blue {
  border-top-color: #409eff;
}
.summary-card.color-blue .summary-value {
  color: #409eff;
}

.summary-card.color-green {
  border-top-color: #67c23a;
}
.summary-card.color-green .summary-value {
  color: #67c23a;
}

.summary-card.color-red {
  border-top-color: #f56c6c;
}
.summary-card.color-red .summary-value {
  color: #f56c6c;
}

.summary-card.highlight .summary-value {
  font-size: 30px;
  font-weight: 800;
}

.empty-tip {
  padding: 40px 20px;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 18px;
  }
  .filter-bar :deep(.el-select),
  .filter-bar :deep(.el-date-editor) {
    width: 100% !important;
  }
  .summary-card {
    padding: 16px;
  }
  .summary-value {
    font-size: 22px;
  }
  .summary-card.highlight .summary-value {
    font-size: 26px;
  }
}
</style>
