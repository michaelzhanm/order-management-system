<template>
  <div class="page-container">
    <!-- 页面标题 + 操作 -->
    <div class="page-header">
      <div class="title-group">
        <h2 class="page-title">客户对账单</h2>
        <p class="page-subtitle">按客户和日期范围汇总订单，生成对账明细</p>
      </div>
      <div v-if="statement" class="header-actions">
        <el-button type="success" :icon="Plus" @click="openPaymentDialog">登记付款单</el-button>
        <el-button type="warning" :icon="Download" :loading="exporting" @click="exportXlsx(true)">导出选中</el-button>
        <el-button type="primary" :icon="Download" :loading="exporting" @click="exportXlsx(false)">导出全部</el-button>
        <el-button :icon="Printer" :loading="generating" @click="generatePdf">生成对账单PDF</el-button>
      </div>
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
            <div class="summary-label">期初欠款（剩余）</div>
            <div class="summary-value">¥{{ formatMoney(statement.summary?.initial_debt_remaining) }}</div>
            <div class="summary-sub" v-if="statement.summary?.initial_debt > 0">
              原始 ¥{{ formatMoney(statement.summary?.initial_debt) }}
            </div>
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
            @selection-change="handleSelectionChange"
            style="width: 100%"
          >
            <el-table-column type="selection" width="50" align="center" />
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

      <!-- 付款记录 -->
      <div class="card-box" v-if="statement.payments && statement.payments.length > 0">
        <div class="section-header">
          <h3 class="section-title">付款记录</h3>
          <span class="order-count-text">共 {{ statement.payments.length }} 笔付款</span>
        </div>
        <div class="table-wrapper">
          <el-table :data="statement.payments" style="width: 100%">
            <el-table-column type="index" label="序号" width="70" align="center" />
            <el-table-column prop="payment_date" label="付款日期" width="130" align="center" />
            <el-table-column label="付款金额" width="130" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.amount) }}</template>
            </el-table-column>
            <el-table-column label="抵扣期初" width="130" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.applied_to_initial) }}</template>
            </el-table-column>
            <el-table-column label="抵扣订单" width="130" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.applied_to_orders) }}</template>
            </el-table-column>
            <el-table-column label="是否本期" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.in_period ? 'success' : 'info'" size="small">
                  {{ row.in_period ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-button type="danger" link size="small" @click="deletePayment(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </template>

    <!-- 空状态提示 -->
    <div v-else-if="!loading" class="card-box empty-tip">
      <el-empty description="请选择客户和日期范围后点击查询，生成对账单" :image-size="100" />
    </div>

    <!-- 付款单弹窗 -->
    <el-dialog v-model="paymentDialogVisible" title="登记付款单" width="480px">
      <el-form :model="paymentForm" label-width="100px" ref="paymentFormRef" :rules="paymentRules">
        <el-form-item label="客户">
          <el-input :value="statement?.customer?.company_name" disabled />
        </el-form-item>
        <el-form-item label="付款金额" prop="amount">
          <el-input-number
            v-model="paymentForm.amount"
            :min="0.01"
            :precision="2"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="付款日期" prop="payment_date">
          <el-date-picker
            v-model="paymentForm.payment_date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择付款日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="paymentForm.remark" type="textarea" :rows="3" placeholder="可填写付款方式、银行流水等" />
        </el-form-item>
        <div class="payment-tip">
          付款将优先抵扣期初欠款，剩余部分计入本期已付。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="paymentDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingPayment" @click="submitPayment">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Printer, Download, Plus } from '@element-plus/icons-vue';
import api from '../api';
import { formatMoney } from '../utils/constants';
import StatusTag from '../components/StatusTag.vue';

const customers = ref([]);
const customerId = ref(null);
const dateRange = ref([]);
const customerLoading = ref(false);
const loading = ref(false);
const generating = ref(false);
const exporting = ref(false);
const statement = ref(null);
const selectedOrders = ref([]);

// 付款单弹窗
const paymentDialogVisible = ref(false);
const savingPayment = ref(false);
const paymentFormRef = ref();
const paymentForm = reactive({
  amount: 0,
  payment_date: '',
  remark: '',
});
const paymentRules = {
  amount: [{ required: true, message: '请输入付款金额', trigger: 'blur' }],
  payment_date: [{ required: true, message: '请选择付款日期', trigger: 'change' }],
};

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

function handleSelectionChange(rows) {
  selectedOrders.value = rows;
}

// 表格合计行
function getSummaries({ columns }) {
  const sums = [];
  const s = statement.value?.summary || {};
  const totalAmount = Number(s.total_amount) || 0;
  const totalPaid = Number(s.total_paid) || 0;
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '';
      return;
    }
    if (index === 1) {
      sums[index] = '合计';
      return;
    }
    switch (index) {
      case 4: // 订单金额
        sums[index] = '¥' + formatMoney(totalAmount);
        break;
      case 5: // 已付金额（订单已付）
        sums[index] = '¥' + formatMoney(s.order_paid);
        break;
      case 6: // 未付金额
        sums[index] = '¥' + formatMoney(totalAmount - s.order_paid);
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
    const token = localStorage.getItem('token');
    const res = await fetch(
      `/api/documents/statement/${customerId.value}?startDate=${startDate}&endDate=${endDate}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      ElMessage.error('生成对账单失败：' + (txt || res.status));
      return;
    }
    const html = await res.text();
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

// 导出 xlsx：onlySelected=true 时仅导出选中订单
async function exportXlsx(onlySelected) {
  if (!customerId.value || !dateRange.value || dateRange.value.length !== 2) {
    ElMessage.warning('请先选择客户和日期范围');
    return;
  }
  if (onlySelected && selectedOrders.value.length === 0) {
    ElMessage.warning('请先在表格中勾选要导出的订单');
    return;
  }
  exporting.value = true;
  try {
    const [startDate, endDate] = dateRange.value;
    const payload = {
      customer_id: customerId.value,
      startDate,
      endDate,
    };
    if (onlySelected) {
      payload.order_ids = selectedOrders.value.map((o) => o.id);
    }
    const token = localStorage.getItem('token');
    const res = await fetch('/api/exports/statement', {
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
    let fileName = '对账单.xlsx';
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

// 付款单
function openPaymentDialog() {
  if (!customerId.value) {
    ElMessage.warning('请先选择客户');
    return;
  }
  paymentForm.amount = 0;
  paymentForm.payment_date = new Date().toISOString().slice(0, 10);
  paymentForm.remark = '';
  paymentDialogVisible.value = true;
}

async function submitPayment() {
  await paymentFormRef.value?.validate(async (valid) => {
    if (!valid) return;
    savingPayment.value = true;
    try {
      await api.post('/payments', {
        customer_id: customerId.value,
        amount: paymentForm.amount,
        payment_date: paymentForm.payment_date,
        remark: paymentForm.remark,
      });
      ElMessage.success('付款单已登记');
      paymentDialogVisible.value = false;
      await handleQuery();
    } catch {
      // 错误已由拦截器统一处理
    } finally {
      savingPayment.value = false;
    }
  });
}

async function deletePayment(id) {
  await ElMessageBox.confirm('确定要删除这笔付款记录吗？删除后抵扣金额会重新计算。', '删除确认', {
    type: 'warning',
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
  });
  await api.delete(`/payments/${id}`);
  ElMessage.success('付款记录已删除');
  await handleQuery();
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

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

.summary-sub {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 4px;
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

.payment-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  margin-top: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
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
