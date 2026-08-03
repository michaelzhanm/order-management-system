<template>
  <div class="page-container">
    <!-- 筛选区 -->
    <div class="card-box">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="公司/订单号">
          <el-input
            v-model="filters.search"
            placeholder="搜索公司名或订单号"
            clearable
            style="width: 200px"
            @keyup.enter="loadData"
            @clear="loadData"
          />
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px"
            @change="onDateChange"
          />
        </el-form-item>
        <el-form-item label="发货状态">
          <el-select v-model="filters.delivery_status" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="o in DELIVERY_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="付款状态">
          <el-select v-model="filters.payment_status" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="o in PAYMENT_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="开票状态">
          <el-select v-model="filters.invoice_status" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="o in INVOICE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">
            <el-icon><Search /></el-icon> 查询
          </el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 订单列表 -->
    <div class="card-box">
      <div class="table-header">
        <span class="table-title">订单列表</span>
        <div class="header-actions">
          <el-dropdown @command="exportOrders" trigger="click">
            <el-button :loading="exporting" :icon="Download">
              导出Excel<el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="summary">汇总表（每行一订单）</el-dropdown-item>
                <el-dropdown-item command="detail">明细表（每行一产品）</el-dropdown-item>
                <el-dropdown-item command="both" divided>两个Sheet（汇总+明细）</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button type="primary" @click="$router.push('/orders/create')">
            <el-icon><Plus /></el-icon> 创建订单
          </el-button>
        </div>
      </div>
      <div class="table-wrapper">
        <el-table :data="list" v-loading="loading" @row-click="goDetail" style="width: 100%">
          <el-table-column prop="order_no" label="订单号" min-width="180" show-overflow-tooltip />
          <el-table-column prop="company_name" label="客户公司" min-width="150" show-overflow-tooltip />
          <el-table-column prop="order_date" label="下单日期" width="110" />
          <el-table-column label="总金额" width="120" align="right">
            <template #default="{ row }">
              <span class="money-text">¥{{ formatMoney(row.total_amount) }}</span>
            </template>
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
          <el-table-column label="开票状态" width="90" align="center">
            <template #default="{ row }">
              <StatusTag type="invoice" :value="row.invoice_status" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="goDetail(row)">详情</el-button>
              <el-button link type="primary" @click.stop="$router.push(`/orders/${row.id}/edit`)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, Search, Download, ArrowDown } from '@element-plus/icons-vue';
import api from '../api';
import StatusTag from '../components/StatusTag.vue';
import {
  formatMoney,
  DELIVERY_OPTIONS,
  PAYMENT_OPTIONS,
  INVOICE_OPTIONS,
} from '../utils/constants';

const router = useRouter();
const loading = ref(false);
const exporting = ref(false);
const list = ref([]);
const total = ref(0);
const dateRange = ref([]);

const filters = reactive({
  search: '',
  startDate: '',
  endDate: '',
  delivery_status: '',
  payment_status: '',
  invoice_status: '',
  page: 1,
  pageSize: 20,
});

function onDateChange(val) {
  if (val && val.length === 2) {
    filters.startDate = val[0];
    filters.endDate = val[1];
  } else {
    filters.startDate = '';
    filters.endDate = '';
  }
}

async function loadData() {
  loading.value = true;
  try {
    const params = { page: filters.page, pageSize: filters.pageSize };
    if (filters.search) params.search = filters.search;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.delivery_status) params.delivery_status = filters.delivery_status;
    if (filters.payment_status) params.payment_status = filters.payment_status;
    if (filters.invoice_status) params.invoice_status = filters.invoice_status;
    const data = await api.get('/orders', { params });
    list.value = data.list;
    total.value = data.total;
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false;
  }
}

function resetFilters() {
  filters.search = '';
  filters.startDate = '';
  filters.endDate = '';
  filters.delivery_status = '';
  filters.payment_status = '';
  filters.invoice_status = '';
  filters.page = 1;
  dateRange.value = [];
  loadData();
}

function goDetail(row) {
  router.push(`/orders/${row.id}`);
}

// 导出订单：format = summary | detail | both
async function exportOrders(format) {
  exporting.value = true;
  try {
    const payload = { format };
    if (filters.search) payload.search = filters.search;
    if (filters.startDate) payload.startDate = filters.startDate;
    if (filters.endDate) payload.endDate = filters.endDate;
    if (filters.delivery_status) payload.delivery_status = filters.delivery_status;
    if (filters.payment_status) payload.payment_status = filters.payment_status;
    if (filters.invoice_status) payload.invoice_status = filters.invoice_status;

    const token = localStorage.getItem('token');
    const res = await fetch('/api/exports/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      ElMessage.error('导出失败：' + (txt || res.status));
      return;
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    let fileName = '订单导出.xlsx';
    const m = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (m && m[1]) fileName = decodeURIComponent(m[1]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (e) {
    ElMessage.error('导出失败，请稍后重试');
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 12px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

.money-text {
  font-weight: 600;
  color: #c0392b;
}

:deep(.el-table__row) {
  cursor: pointer;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .filter-form :deep(.el-form-item) {
    width: 100%;
  }
  .filter-form :deep(.el-input),
  .filter-form :deep(.el-select),
  .filter-form :deep(.el-date-editor) {
    width: 100% !important;
  }
  .pagination-wrapper {
    justify-content: center;
  }
}
</style>
