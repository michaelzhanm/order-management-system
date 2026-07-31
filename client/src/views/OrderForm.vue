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
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 订单明细 -->
        <el-form-item label="订单明细" prop="items">
          <div class="items-wrapper">
            <div class="table-wrapper">
              <el-table :data="form.items" border style="width: 100%">
                <el-table-column label="序号" width="60" align="center" type="index" />
                <el-table-column label="产品名称" min-width="160">
                  <template #default="{ row }">
                    <el-input v-model="row.product_name" placeholder="产品名称" />
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
                      :controls="false"
                      style="width: 100%"
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
                      @change="calcSubtotal(row)"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="小计(元)" width="120" align="right">
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
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Delete } from '@element-plus/icons-vue';
import api from '../api';
import { formatMoney } from '../utils/constants';

const router = useRouter();
const route = useRoute();
const formRef = ref();
const loading = ref(false);
const saving = ref(false);
const customers = ref([]);

const isEdit = computed(() => !!route.params.id);

const form = reactive({
  customer_id: '',
  order_date: new Date().toISOString().slice(0, 10),
  remark: '',
  items: [createEmptyItem()],
});

const rules = {
  customer_id: [{ required: true, message: '请选择客户', trigger: 'change' }],
  order_date: [{ required: true, message: '请选择下单日期', trigger: 'change' }],
};

function createEmptyItem() {
  return { product_name: '', specification: '', unit: '', quantity: 0, unit_price: 0, subtotal: 0 };
}

const selectedCustomer = computed(() =>
  customers.value.find(c => c.id === form.customer_id)
);

const totalAmount = computed(() =>
  form.items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
);

function onCustomerChange() {
  // 触发响应式更新
}

function calcSubtotal(row) {
  row.subtotal = (row.quantity || 0) * (row.unit_price || 0);
}

function addItem() {
  form.items.push(createEmptyItem());
}

function removeItem(index) {
  form.items.splice(index, 1);
}

async function loadCustomers() {
  const data = await api.get('/customers', { params: { pageSize: 999 } });
  customers.value = data.list;
}

async function loadOrder() {
  if (!isEdit.value) return;
  loading.value = true;
  try {
    const data = await api.get(`/orders/${route.params.id}`);
    form.customer_id = data.customer_id;
    form.order_date = data.order_date;
    form.remark = data.remark || '';
    form.items = data.items.length > 0
      ? data.items.map(i => ({
          product_name: i.product_name,
          specification: i.specification || '',
          unit: i.unit || '',
          quantity: i.quantity,
          unit_price: i.unit_price,
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
  } catch {
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadCustomers();
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
