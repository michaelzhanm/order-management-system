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
        <el-button type="primary" @click="$router.push('/orders/create')">
          <el-icon><Plus /></el-icon> 创建订单
        </el-button>
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
