<template>
  <div class="page-container">
    <div class="card-box">
      <div class="form-header">
        <span class="form-title">{{ isEdit ? '编辑订单' : '创建订单' }}</span>
        <el-button @click="$router.back()">
          <el-icon><Back /></el-icon> 返回
        </el-button>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" v-loading="loading">
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="客户" prop="customer_id">
              <el-select
                v-model="form.customer_id"
                placeholder="请选择客户"
                filterable
                style="width: 100%"
                @change="onCustomerChange"
              >
                <el-option
                  v-for="c in customers"
                  :key="c.id"
                  :label="c.company_name"
                  :value="c.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="下单日期" prop="order_date">
              <el-date-picker
                v-model="form.order_date"
                type="date"
                placeholder="选择日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
                @change="regenerateOrderNo"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="订单号" prop="order_no">
              <div style="display:flex; gap:8px; width:100%; align-items:center">
                <el-input
                  v-model="form.order_no"
                  placeholder="选择客户和日期后自动生成，可手动修改"
                  maxlength="50"
                />
                <el-button
                  :icon="Refresh"
                  @click="regenerateOrderNo"
                  type="primary"
                  plain
                  :disabled="!form.customer_id || !form.order_date"
                  title="根据客户和日期重新生成订单号"
                />
              </div>
              <div class="form-tip">点击右侧「刷新」按钮可根据客户前缀和日期重新自动生成</div>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 订单明细 -->
        <el-form-item label="订单明细" prop="items">
          <div class="items-wrapper">
            <div class="table-wrapper">
              <el-table :data="form.items" border style="width: 100%">
                <el-table-column label="序号" width="60" align="center" type="index" />
                <el-table-column label="产品名称" min-width="180">
                  <template #default="{ row }">
                    <el-select
                      v-model="row.product_name"
                      filterable
                      allow-create
                      default-first-option
                      placeholder="选预设或直接输入"
                      style="width: 100%"
                      @change="onProductNameChange(row)"
                    >
                      <el-option
                        v-for="p in products"
                        :key="p.id"
                        :label="p.name"
                        :value="p.name"
                      >
                        <span style="float:left">{{ p.name }}</span>
                        <span
                          style="float:right;font-size:12px;color:#909399"
                        >{{ p.specification ? p.specification + ' / ' : '' }}{{ p.unit || '' }} / ¥{{ formatMoney(p.unit_price) }}</span>
                      </el-option>
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="规格型号" min-width="120">
                  <template #default="{ row }">
                    <el-input v-model="row.specification" placeholder="规格" />
                  </template>
                </el-table-column>
                <el-table-column label="单位" width="80">
                  <template #default="{ row }">
                    <el-input v-model="row.unit" placeholder="个" />
                  </template>
                </el-table-column>
                <el-table-column label="数量" width="100">
                  <template #default="{ row }">
                    <el-input-number
                      v-model="row.quantity"
                      :min="0"
                      :precision="4"
                      :controls="false"
                      style="width: 100%"
                      placeholder="数量"
                      @change="calcSubtotal(row)"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="单价(元)" width="120">
                  <template #default="{ row }">
                    <el-input-number
                      v-model="row.unit_price"
                      :min="0"
                      :precision="2"
                      :controls="false"
                      style="width: 100%"
                      placeholder="单价"
                      @change="calcSubtotal(row)"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="小计(元)" width="130" align="right">
                  <template #default="{ row }">
                    <span class="subtotal-text">¥{{ formatMoney(row.subtotal) }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="80" align="center" fixed="right">
                  <template #default="{ $index }">
                    <el-button
                      link
                      type="danger"
                      :icon="Delete"
                      @click="removeItem($index)"
                      :disabled="form.items.length <= 1"
                    />
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <el-button class="add-row-btn" @click="addItem">
              <el-icon><Plus /></el-icon> 添加一行
            </el-button>
          </div>
        </el-form-item>

        <!-- 备注 -->
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="订单备注信息"
          />
        </el-form-item>

        <!-- 金额汇总 -->
        <el-form-item label="订单总金额">
          <div class="total-amount-box">
            <span class="total-label">合计：</span>
            <span class="total-value">¥{{ formatMoney(totalAmount) }}</span>
          </div>
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" size="large" :loading="saving" @click="handleSubmit">
            {{ isEdit ? '保存修改' : '创建订单' }}
          </el-button>
          <el-button size="large" @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 客户信息预览 -->
    <div v-if="selectedCustomer" class="card-box">
      <div class="customer-preview">
        <span class="preview-title">客户信息</span>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="公司名称">{{ selectedCustomer.company_name }}</el-descriptions-item>
          <el-descriptions-item label="联系人">{{ selectedCustomer.contact_name }}</el-descriptions-item>
          <el-descriptions-item label="电话">{{ selectedCustomer.phone }}</el-descriptions-item>
          <el-descriptions-item label="地址" :span="2">{{ selectedCustomer.address }}</el-descriptions-item>
          <el-descriptions-item label="税号">{{ selectedCustomer.tax_number }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Delete, Back, Plus, Refresh } from '@element-plus/icons-vue';
import api from '../api';
import { formatMoney } from '../utils/constants';

const router = useRouter();
const route = useRoute();
const formRef = ref();
const loading = ref(false);
const saving = ref(false);
const customers = ref([]);
const products = ref([]);

const isEdit = computed(() => !!route.params.id);

const form = reactive({
  customer_id: '',
  order_no: '',
  order_date: new Date().toISOString().slice(0, 10),
  remark: '',
  items: [createEmptyItem()],
});

const rules = {
  customer_id: [{ required: true, message: '请选择客户', trigger: 'change' }],
  order_date: [{ required: true, message: '请选择下单日期', trigger: 'change' }],
};

function createEmptyItem() {
  return {
    product_name: '',
    specification: '',
    unit: '',
    quantity: null,
    unit_price: null,
    subtotal: 0,
  };
}

const selectedCustomer = computed(() =>
  customers.value.find(c => c.id === form.customer_id)
);

const totalAmount = computed(() =>
  form.items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
);

async function loadCustomers() {
  const data = await api.get('/customers', { params: { pageSize: 999 } });
  customers.value = data.list;
}

async function loadProducts() {
  const data = await api.get('/products');
  products.value = data.list || [];
}

function onCustomerChange() {
  if (!isEdit.value) {
    regenerateOrderNo();
  }
}

// 选择预设产品名时，自动填充规格、单位、单价
function onProductNameChange(row) {
  const matched = products.value.find(p => p.name === row.product_name);
  if (matched) {
    if (!row.specification && matched.specification) row.specification = matched.specification;
    if (!row.unit && matched.unit) row.unit = matched.unit;
    // 单价：如果用户已经填了就不改；否则用默认值
    if ((row.unit_price === null || row.unit_price === undefined || row.unit_price === 0) && matched.unit_price) {
      row.unit_price = matched.unit_price;
    }
    nextTick(() => calcSubtotal(row));
  }
}

function calcSubtotal(row) {
  const q = Number(row.quantity) || 0;
  const p = Number(row.unit_price) || 0;
  row.subtotal = Number((q * p).toFixed(2));
}

function addItem() {
  form.items.push(createEmptyItem());
}

function removeItem(index) {
  form.items.splice(index, 1);
}

// 根据客户+日期重新生成订单号（保留已生成号的情况：编辑时用户不选客户和日期的话，不覆盖）
function regenerateOrderNo() {
  if (!form.customer_id || !form.order_date) return;
  if (isEdit.value) {
    // 编辑态下，刷新按钮也可以改号
  }
  // 调用后端 /api/orders 的一个生成预览接口
  const cust = customers.value.find(c => c.id === form.customer_id);
  if (!cust) return;
  const dt = form.order_date.replace(/-/g, '');
  const partyA = cust.order_prefix || autoPrefix(cust.company_name);
  let partyB = companyOrderPrefix.value;
  if (!partyB) {
    // settings里没配，则暂时先显示BJZZ占位（实际创建时后端会按setting自动生成）
    partyB = companyOrderPrefixFallback.value || 'BJZZ';
  }
  const prefix = `${partyB}-${partyA}-${dt}`;
  // 最后三位序号：前端无法精确知道今天有几单，占位填001，让后端真正插入时做校验
  form.order_no = `${prefix}-001`;
}

const companyOrderPrefix = ref('');
const companyOrderPrefixFallback = ref('');
const companyName = ref('');

// 公司信息
async function loadSettings() {
  const data = await api.get('/settings');
  companyOrderPrefix.value = data.company_order_prefix || '';
  companyName.value = data.company_name || '我公司';
  companyOrderPrefixFallback.value = autoPrefix(companyName.value);
}

// 简易拼音首字母（前端仅用于预览；后端会用更准确的pinyin-pro正式生成）
function autoPrefix(name) {
  if (!name) return 'XX';
  // 只简单取每个汉字的首音节拼音字符不太容易做，直接返回空，让后端来生成
  // 但为了UI体验，我们用一个启发式：非ASCII字符每个给个占位，字母原样拿前4个
  const letters = Array.from(name).filter(ch => /[A-Za-z]/.test(ch));
  if (letters.length >= 2) return letters.slice(0, 4).join('').toUpperCase();
  return 'XX';
}

async function loadOrder() {
  if (!isEdit.value) return;
  loading.value = true;
  try {
    const data = await api.get(`/orders/${route.params.id}`);
    form.customer_id = data.customer_id;
    form.order_no = data.order_no;
    form.order_date = data.order_date;
    form.remark = data.remark || '';
    form.items = data.items.length > 0
      ? data.items.map(i => ({
          product_name: i.product_name,
          specification: i.specification || '',
          unit: i.unit || '',
          quantity: i.quantity === 0 ? null : i.quantity,
          unit_price: i.unit_price === 0 ? null : i.unit_price,
          subtotal: i.subtotal,
        }))
      : [createEmptyItem()];
  } catch {
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  await formRef.value?.validate();

  // 验证明细
  const validItems = form.items.filter(i => i.product_name);
  if (validItems.length === 0) {
    ElMessage.warning('请至少添加一条有效明细（需填写产品名称）');
    return;
  }

  saving.value = true;
  try {
    const payload = {
      customer_id: form.customer_id,
      order_no: (form.order_no || '').trim() || undefined,
      order_date: form.order_date,
      remark: form.remark,
      items: validItems,
    };
    if (isEdit.value) {
      await api.put(`/orders/${route.params.id}`, payload);
      ElMessage.success('订单修改成功');
    } else {
      const res = await api.post('/orders', payload);
      ElMessage.success(`订单创建成功，订单号：${res.order_no}`);
    }
    router.push('/orders');
  } catch (err) {
    // 订单号冲突等错误
    if (err?.response?.data?.error?.includes('订单号已存在')) {
      ElMessage.error(err.response.data.error + '，请点击「刷新」按钮重新生成或修改订单号');
    }
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadCustomers(), loadProducts(), loadSettings()]);
  await loadOrder();
});
</script>

<style scoped>
.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.form-title {
  font-size: 18px;
  font-weight: 700;
  color: #1d2129;
}

.items-wrapper {
  width: 100%;
}

.add-row-btn {
  margin-top: 12px;
  width: 100%;
  border-style: dashed;
}

.subtotal-text {
  font-weight: 600;
  color: #c0392b;
}

.total-amount-box {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.total-label {
  font-size: 14px;
  color: #606266;
}

.total-value {
  font-size: 24px;
  font-weight: 700;
  color: #c0392b;
}

.customer-preview {
  width: 100%;
}

.preview-title {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
  margin-bottom: 12px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  margin-top: 4px;
}

:deep(.el-input-number) {
  .el-input__inner {
    text-align: right;
  }
}

@media (max-width: 768px) {
  .form-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  :deep(.el-form-item__label) {
    font-size: 14px;
  }
}
</style>
