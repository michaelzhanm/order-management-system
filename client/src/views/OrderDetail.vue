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
          <StatusTag v-if="order.delivery_status" type="delivery" :value="order.delivery_status" />
        </div>
        <div class="header-right">
          <el-button type="primary" plain :icon="Van" @click="openShipDialog()" :disabled="remainingTotalQty <= 0">
            登记发货
          </el-button>
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

    <!-- 订单明细（含已发/未发） -->
    <div class="card-box">
      <div class="section-title">
        订单明细
        <span class="status-summary">
          订单总数量：<b>{{ totalQty }}</b>，已发货：<b class="shipped">{{ shippedQty }}</b>，
          剩余未发：<b class="remaining">{{ remainingTotalQty }}</b>
        </span>
      </div>
      <div class="table-wrapper">
        <el-table :data="order.items || []" border>
          <el-table-column label="序号" width="60" type="index" align="center" />
          <el-table-column prop="product_name" label="产品名称" min-width="150" />
          <el-table-column prop="specification" label="规格型号" min-width="120" />
          <el-table-column prop="unit" label="单位" width="80" align="center" />
          <el-table-column prop="quantity" label="订单数量" width="100" align="right" />
          <el-table-column label="已发" width="100" align="right">
            <template #default="{ row }">
              <el-tag
                :type="Number(row.shipped_qty || 0) >= Number(row.quantity) ? 'success' : 'info'"
                size="small"
                effect="light"
              >
                {{ row.shipped_qty ?? 0 }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="剩余未发" width="110" align="right">
            <template #default="{ row }">
              <el-tag
                :type="Number(row.remaining_qty || 0) > 0 ? 'warning' : 'success'"
                size="small"
                effect="light"
              >
                {{ row.remaining_qty ?? row.quantity }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="单价" width="100" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.unit_price) }}</template>
          </el-table-column>
          <el-table-column label="小计" width="120" align="right">
            <template #default="{ row }">
              <span class="money-text">¥{{ formatMoney(row.subtotal) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center" fixed="right">
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                :disabled="Number(row.remaining_qty ?? row.quantity) <= 0"
                @click="openShipDialog(row)"
              >
                单独发货
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="total-bar">
        <span class="total-label">订单总金额：</span>
        <span class="total-amount">¥{{ formatMoney(order.total_amount) }}</span>
      </div>
    </div>

    <!-- 发货记录 -->
    <div class="card-box">
      <div class="section-title">
        发货记录
        <span class="sub-badge">共 {{ (order.shipping_records || []).length }} 条</span>
      </div>
      <el-table :data="order.shipping_records || []" border stripe v-if="order.shipping_records && order.shipping_records.length > 0">
        <el-table-column label="序号" width="60" type="index" align="center" />
        <el-table-column prop="shipped_date" label="发货日期" width="120" align="center" sortable />
        <el-table-column label="产品名称" min-width="150">
          <template #default="{ row }">
            {{ row.product_name }}
            <span v-if="row.specification" style="color:#909399">（{{ row.specification }}）</span>
          </template>
        </el-table-column>
        <el-table-column label="发货数量" width="120" align="right">
          <template #default="{ row }">
            <b style="color:#1677ff">{{ row.quantity }}</b>
            <span style="color:#909399">{{ row.unit || '' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.remark">{{ row.remark }}</span>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_by_name" label="操作人" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.created_by_name">{{ row.created_by_name }}</span>
            <span v-else style="color:#c0c4cc">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="登记时间" width="170" align="center" />
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-popconfirm
              title="确认删除此发货记录？订单发货状态会自动同步。"
              @confirm="handleDeleteShipRecord(row)"
            >
              <template #reference>
                <el-button link type="danger">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="暂无发货记录，点击右上角「登记发货」开始录入" />
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
              <div class="form-tip">当存在发货记录时，系统会根据已发量自动判断；你也可以手动调整。</div>
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

    <!-- 登记发货弹窗 -->
    <el-dialog
      v-model="shipDialog"
      title="登记发货"
      width="640px"
      destroy-on-close
    >
      <div class="ship-tip">
        <el-icon color="#e6a23c"><WarningFilled /></el-icon>
        <span>
          支持部分发货，可一次提交多条明细。发货数量不可超过每条的「剩余未发」数量。
        </span>
      </div>
      <el-form label-width="110px">
        <el-form-item label="发货日期" required>
          <el-date-picker
            v-model="shipForm.shipped_date"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item label="发货明细" required>
          <div style="width: 100%">
            <el-table :data="shipForm.items" border size="small">
              <el-table-column label="产品名称" min-width="140">
                <template #default="{ row }">
                  {{ row.product_name }}
                  <span v-if="row.specification" style="color:#909399; font-size:12px">（{{ row.specification }}）</span>
                </template>
              </el-table-column>
              <el-table-column label="剩余可发" width="90" align="right">
                <template #default="{ row }">
                  {{ Number(row.remaining_qty ?? row.quantity) }} {{ row.unit }}
                </template>
              </el-table-column>
              <el-table-column label="本次发货" width="160">
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.ship_qty"
                    :min="0"
                    :max="Number(row.remaining_qty ?? row.quantity)"
                    :precision="4"
                    :controls="false"
                    style="width: 100%"
                    placeholder="数量"
                  />
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="shipForm.remark"
            type="textarea"
            :rows="2"
            placeholder="如：快递单号 / 车牌号 / 批次号 等"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialog = false">取消</el-button>
        <el-button type="primary" :loading="shipSaving" @click="handleSubmitShip">确认发货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Back, Edit, Delete, Check, Document, Van, Money, WarningFilled
} from '@element-plus/icons-vue';
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
const order = ref({ items: [], logs: [], shipping_records: [] });

const statusForm = reactive({
  delivery_status: 'PENDING',
  payment_status: 'UNPAID',
  paid_amount: 0,
  invoice_status: 'UNINVOICED',
});

const totalQty = computed(() =>
  Number(
    (order.value.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0)
  )
);

const shippedQty = computed(() =>
  Number(
    (order.value.items || []).reduce((s, i) => s + Number(i.shipped_qty || 0), 0)
  )
);

const remainingTotalQty = computed(() =>
  Number(
    (order.value.items || []).reduce((s, i) => s + Number(i.remaining_qty ?? i.quantity), 0)
  )
);

// 发货弹窗相关
const shipDialog = ref(false);
const shipSaving = ref(false);
const shipForm = reactive({
  shipped_date: new Date().toISOString().slice(0, 10),
  remark: '',
  items: [],
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

// 打开发货弹窗（preselectItem: 某一条明细单独发货时传入）
function openShipDialog(preselectItem = null) {
  shipForm.shipped_date = new Date().toISOString().slice(0, 10);
  shipForm.remark = '';
  // 构造明细项（只显示还有剩余未发的；或者某条单独指定）
  const candidates = (order.value.items || []).filter(it => {
    const remaining = Number(it.remaining_qty ?? it.quantity);
    if (preselectItem) return it.id === preselectItem.id && remaining > 0;
    return remaining > 0;
  });
  shipForm.items = candidates.map(it => ({
    order_item_id: it.id,
    product_name: it.product_name,
    specification: it.specification,
    unit: it.unit,
    quantity: it.quantity,
    remaining_qty: Number(it.remaining_qty ?? it.quantity),
    ship_qty: null, // 不默认0，空出来
  }));
  shipDialog.value = true;
}

async function handleSubmitShip() {
  if (!shipForm.shipped_date) {
    ElMessage.warning('请选择发货日期');
    return;
  }
  const validItems = shipForm.items.filter(i => Number(i.ship_qty) > 0);
  if (validItems.length === 0) {
    ElMessage.warning('请至少填写一条大于0的发货数量');
    return;
  }
  // 校验不超过剩余
  for (const it of validItems) {
    if (Number(it.ship_qty) > Number(it.remaining_qty)) {
      ElMessage.warning(`「${it.product_name}」本次发货${it.ship_qty}超过剩余可发${it.remaining_qty}`);
      return;
    }
  }

  shipSaving.value = true;
  try {
    const payload = {
      shipped_date: shipForm.shipped_date,
      remark: shipForm.remark || '',
      items: validItems.map(it => ({
        order_item_id: it.order_item_id,
        quantity: Number(it.ship_qty),
      })),
    };
    await api.post(`/orders/${order.value.id}/ship`, payload);
    ElMessage.success(`成功登记 ${validItems.length} 条发货记录`);
    shipDialog.value = false;
    await loadOrder();
  } catch {
  } finally {
    shipSaving.value = false;
  }
}

async function handleDeleteShipRecord(row) {
  try {
    await api.delete(`/shipping/${row.id}`);
    ElMessage.success('已删除发货记录，订单状态已同步');
    await loadOrder();
  } catch {
  }
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
  flex-wrap: wrap;
}

.order-no {
  font-size: 16px;
  font-weight: 700;
  color: #1d2129;
}

.header-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 16px;
  padding-left: 10px;
  border-left: 3px solid #1677ff;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.status-summary {
  font-size: 13px;
  font-weight: 400;
  color: #606266;
  border-left: 1px solid #ebeef5;
  padding-left: 12px;
}
.status-summary .shipped { color: #16a34a; }
.status-summary .remaining { color: #c0392b; }

.sub-badge {
  font-size: 12px;
  font-weight: 400;
  color: #909399;
  background: #f4f4f5;
  padding: 2px 10px;
  border-radius: 10px;
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

.ship-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 6px;
  margin-bottom: 16px;
  color: #b88230;
  font-size: 13px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  margin-top: 4px;
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
