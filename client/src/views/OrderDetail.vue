<template>
  <div class="page-container" v-loading="loading">
    <!-- 头部 -->
    <div class="card-box">
      <div class="detail-header">
        <div class="header-left">
          <el-button @click="$router.push('/orders')" link>
            <el-icon><Back /></el-icon> 返回列表
          </el-button>
          <span class="order-no">订单号：{{ order.order_no }}</span>
        </div>
        <div class="header-right">
          <el-button @click="$router.push(`/orders/${order.id}/edit`)">
            <el-icon><Edit /></el-icon> 编辑订单
          </el-button>
          <el-button type="danger" plain @click="handleDelete">
            <el-icon><Delete /></el-icon> 删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 基本信息 -->
    <div class="card-box">
      <div class="section-title">基本信息</div>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="订单编号">{{ order.order_no }}</el-descriptions-item>
        <el-descriptions-item label="客户公司">{{ order.company_name }}</el-descriptions-item>
        <el-descriptions-item label="下单日期">{{ order.order_date }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ order.contact_name }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ order.customer_phone }}</el-descriptions-item>
        <el-descriptions-item label="税号">{{ order.customer_tax_number }}</el-descriptions-item>
        <el-descriptions-item label="地址" :span="2">{{ order.customer_address }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ order.creator_name }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="3">{{ order.remark || '无' }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <!-- 订单明细 -->
    <div class="card-box">
      <div class="section-title">订单明细</div>
      <div class="table-wrapper">
        <el-table :data="order.items || []" border>
          <el-table-column label="序号" width="60" type="index" align="center" />
          <el-table-column prop="product_name" label="产品名称" min-width="150" />
          <el-table-column prop="specification" label="规格型号" min-width="120" />
          <el-table-column prop="unit" label="单位" width="80" align="center" />
          <el-table-column prop="quantity" label="数量" width="80" align="right" />
          <el-table-column label="单价" width="100" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.unit_price) }}</template>
          </el-table-column>
          <el-table-column label="小计" width="120" align="right">
            <template #default="{ row }">
              <span class="money-text">¥{{ formatMoney(row.subtotal) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="total-bar">
        <span class="total-label">订单总金额：</span>
        <span class="total-amount">¥{{ formatMoney(order.total_amount) }}</span>
      </div>
    </div>

    <!-- 状态管理 -->
    <div class="card-box">
      <div class="section-title">状态管理</div>
      <el-form label-width="100px" class="status-form">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="发货状态">
              <el-select v-model="statusForm.delivery_status" style="width: 100%">
                <el-option v-for="o in DELIVERY_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="付款状态">
              <el-select v-model="statusForm.payment_status" style="width: 100%">
                <el-option v-for="o in PAYMENT_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="已付金额">
              <el-input-number
                v-model="statusForm.paid_amount"
                :min="0"
                :max="order.total_amount"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="开票状态">
              <el-select v-model="statusForm.invoice_status" style="width: 100%">
                <el-option v-for="o in INVOICE_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item>
          <el-button type="primary" :loading="savingStatus" @click="saveStatus">
            <el-icon><Check /></el-icon> 保存状态
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 文档生成 -->
    <div class="card-box">
      <div class="section-title">文档生成</div>
      <div class="doc-buttons">
        <el-button type="primary" @click="openDocument('contract')">
          <el-icon><Document /></el-icon> 合同预览/下载
        </el-button>
        <el-button type="success" @click="openDocument('shipping')">
          <el-icon><Van /></el-icon> 发货单预览/下载
        </el-button>
        <el-button @click="goStatement">
          <el-icon><Money /></el-icon> 生成对账单
        </el-button>
      </div>
    </div>

    <!-- 操作日志 -->
    <div class="card-box" v-if="order.logs && order.logs.length > 0">
      <div class="section-title">操作日志</div>
      <el-timeline>
        <el-timeline-item
          v-for="log in order.logs"
          :key="log.id"
          :timestamp="log.created_at"
          placement="top"
        >
          <span class="log-user">{{ log.user_name || '系统' }}</span>
          <span class="log-action">{{ log.action }}</span>
          <span class="log-detail" v-if="log.detail"> - {{ log.detail }}</span>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import api from '../api';
import StatusTag from '../components/StatusTag.vue';
import {
  formatMoney,
  DELIVERY_OPTIONS,
  PAYMENT_OPTIONS,
  INVOICE_OPTIONS,
} from '../utils/constants';

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const savingStatus = ref(false);
const order = ref({ items: [], logs: [] });

const statusForm = reactive({
  delivery_status: 'PENDING',
  payment_status: 'UNPAID',
  paid_amount: 0,
  invoice_status: 'UNINVOICED',
});

async function loadOrder() {
  loading.value = true;
  try {
    const data = await api.get(`/orders/${route.params.id}`);
    order.value = data;
    statusForm.delivery_status = data.delivery_status;
    statusForm.payment_status = data.payment_status;
    statusForm.paid_amount = data.paid_amount;
    statusForm.invoice_status = data.invoice_status;
  } catch {
  } finally {
    loading.value = false;
  }
}

async function saveStatus() {
  savingStatus.value = true;
  try {
    await api.patch(`/orders/${route.params.id}/status`, statusForm);
    ElMessage.success('状态更新成功');
    await loadOrder();
  } catch {
  } finally {
    savingStatus.value = false;
  }
}

async function handleDelete() {
  await ElMessageBox.confirm('确定要删除此订单吗？删除后不可恢复。', '删除确认', {
    type: 'warning',
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
  });
  await api.delete(`/orders/${route.params.id}`);
  ElMessage.success('订单已删除');
  router.push('/orders');
}

async function openDocument(type) {
  const token = localStorage.getItem('token');
  try {
    const res = await fetch(`/api/documents/${type}/${route.params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('请求失败');
    const html = await res.text();
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      ElMessage.warning('请允许弹出窗口以预览文档');
    }
  } catch {
    ElMessage.error('文档生成失败');
  }
}

function goStatement() {
  router.push('/statement');
}

onMounted(() => {
  loadOrder();
});
</script>

<style scoped>
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.order-no {
  font-size: 16px;
  font-weight: 700;
  color: #1d2129;
}

.header-right {
  display: flex;
  gap: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 16px;
  padding-left: 10px;
  border-left: 3px solid #1677ff;
}

.money-text {
  font-weight: 600;
  color: #c0392b;
}

.total-bar {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 2px solid #f0f0f0;
}

.total-label {
  font-size: 14px;
  color: #606266;
}

.total-amount {
  font-size: 22px;
  font-weight: 700;
  color: #c0392b;
}

.status-form {
  max-width: 800px;
}

.doc-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.log-user {
  font-weight: 600;
  color: #1677ff;
}

.log-action {
  margin-left: 8px;
  color: #1d2129;
}

.log-detail {
  color: #909399;
  font-size: 13px;
}

@media (max-width: 768px) {
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .header-right {
    width: 100%;
  }
  .header-right .el-button {
    flex: 1;
  }
  :deep(.el-descriptions) {
    --el-descriptions-item-bordered-label-background: #fafafa;
  }
}
</style>
