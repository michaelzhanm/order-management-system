<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">系统设置</h2>
      <p class="page-subtitle">配置公司信息、产品预设、文档样式与合同条款（仅管理员可修改）</p>
    </div>

    <el-card v-loading="loading" class="settings-card">
      <el-tabs v-model="activeTab">
        <!-- 公司信息 -->
        <el-tab-pane label="公司信息" name="company">
          <el-form ref="formRef" :model="form" label-width="200px" label-position="right">
            <el-form-item label="公司名称">
              <el-input v-model="form.company_name" placeholder="请输入公司名称" />
            </el-form-item>
            <el-form-item label="联系人">
              <el-input v-model="form.company_contact" placeholder="请输入联系人" />
            </el-form-item>
            <el-form-item label="联系电话">
              <el-input v-model="form.company_phone" placeholder="请输入联系电话" />
            </el-form-item>
            <el-form-item label="公司地址">
              <el-input v-model="form.company_address" placeholder="请输入公司地址" />
            </el-form-item>
            <el-form-item label="统一社会信用代码/税号">
              <el-input v-model="form.company_tax_number" placeholder="请输入统一社会信用代码/税号" />
            </el-form-item>
            <el-form-item label="开户银行">
              <el-input v-model="form.company_bank" placeholder="请输入开户银行" />
            </el-form-item>
            <el-form-item label="银行账号">
              <el-input v-model="form.company_bank_account" placeholder="请输入银行账号" />
            </el-form-item>
            <el-divider content-position="left">订单号规则</el-divider>
            <el-form-item label="己方公司订单前缀（乙）">
              <el-input
                v-model="form.company_order_prefix"
                placeholder="如 BJZZ（北京中中），留空将按公司名自动生成拼音首字母"
                maxlength="20"
              />
              <div class="form-tip">
                最终订单号格式：<b>乙方前缀-甲方前缀-YYYYMMDD-NNN</b><br/>
                乙方前缀在此处设置（代表你方公司）；甲方前缀在「客户管理」中为每个客户单独设置。
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 产品预设 -->
        <el-tab-pane label="产品预设" name="products">
          <div class="products-toolbar">
            <div class="tip-block">
              <el-icon color="#909399"><InfoFilled /></el-icon>
              <span>在创建订单时，产品名可直接选择此处预设的产品，自动填入规格、单位、单价。</span>
            </div>
            <el-button type="primary" :icon="Plus" @click="openProductDialog()">
              新增产品
            </el-button>
          </div>
          <el-table :data="productsList" border stripe style="margin-top: 16px; width: 100%">
            <el-table-column label="序号" width="70" align="center" type="index" />
            <el-table-column prop="name" label="产品名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="specification" label="规格型号" min-width="140" show-overflow-tooltip />
            <el-table-column prop="unit" label="单位" width="80" align="center" />
            <el-table-column label="单价(元)" width="140" align="right">
              <template #default="{ row }">¥{{ formatMoney(row.unit_price) }}</template>
            </el-table-column>
            <el-table-column label="创建/更新时间" width="170" align="center">
              <template #default="{ row }">{{ row.updated_at || row.created_at }}</template>
            </el-table-column>
            <el-table-column label="操作" width="160" align="center" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" @click="openProductDialog(row)">编辑</el-button>
                <el-popconfirm title="确认删除此产品？" @confirm="handleDeleteProduct(row)">
                  <template #reference>
                    <el-button link type="danger">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="暂无预设产品，点击右上角「新增产品」添加" />
            </template>
          </el-table>
        </el-tab-pane>

        <!-- 文档样式 -->
        <el-tab-pane label="文档样式" name="style">
          <el-form :model="form" label-width="200px" label-position="right">
            <el-form-item label="公司 Logo 地址">
              <el-input v-model="form.doc_logo_url" placeholder="留空则不显示；填写图片 URL，如 https://example.com/logo.png" />
              <div class="form-tip">Logo 显示在合同/发货单/对账单标题上方。建议图片高度不超过 80px。</div>
            </el-form-item>
            <el-form-item label="标题字号">
              <el-input-number v-model="form.doc_title_size" :min="16" :max="36" :step="1" controls-position="right" />
              <span class="form-tip-inline">px（默认 24）</span>
            </el-form-item>
            <el-form-item label="正文字体">
              <el-select v-model="form.doc_font_family" placeholder="选择字体" allow-create filterable style="width: 100%">
                <el-option label="宋体" value='"SimSun", "宋体", "Noto Serif SC", serif' />
                <el-option label="仿宋" value='"FangSong", "仿宋", "Noto Serif SC", serif' />
                <el-option label="黑体" value='"SimHei", "黑体", "Noto Sans SC", sans-serif' />
                <el-option label="微软雅黑" value='"Microsoft YaHei", "微软雅黑", "Noto Sans SC", sans-serif' />
                <el-option label="楷体" value='"KaiTi", "楷体", "Noto Serif SC", serif' />
              </el-select>
            </el-form-item>
            <el-form-item label="表格边框颜色">
              <el-color-picker v-model="form.doc_table_border_color" />
              <span class="color-value">{{ form.doc_table_border_color }}</span>
            </el-form-item>
            <el-form-item label="金额强调色">
              <el-color-picker v-model="form.doc_amount_color" />
              <span class="color-value">{{ form.doc_amount_color }}</span>
              <div class="form-tip">用于合计金额、未付金额等需要突出的数字。</div>
            </el-form-item>
            <el-form-item label="页脚文字">
              <el-input v-model="form.doc_footer_text" placeholder="如：本文件由 XX 公司自动生成" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 合同条款 -->
        <el-tab-pane label="合同条款" name="contract">
          <el-form :model="form" label-width="200px" label-position="right">
            <el-form-item label="付款条款">
              <el-input
                v-model="form.contract_payment_terms"
                type="textarea"
                :rows="4"
                placeholder="每行一条，会逐行显示在合同的「付款方式」条款中"
              />
              <div class="form-tip">付款状态（已付清/部分付款/未付款）由系统自动生成，显示在第一条。</div>
            </el-form-item>
            <el-form-item label="交货条款">
              <el-input
                v-model="form.contract_delivery_terms"
                type="textarea"
                :rows="4"
                placeholder="每行一条，会逐行显示在合同的「交货条款」中"
              />
            </el-form-item>
            <el-form-item label="其他约定">
              <el-input
                v-model="form.contract_other_terms"
                type="textarea"
                :rows="4"
                placeholder="每行一条，会逐行显示在合同的「其他约定」中"
              />
              <div class="form-tip">订单备注（如有）会自动追加到最后。</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 对账单 -->
        <el-tab-pane label="对账单" name="statement">
          <el-form :model="form" label-width="200px" label-position="right">
            <el-form-item label="对账说明 / 异议条款">
              <el-input
                v-model="form.statement_disclaimer"
                type="textarea"
                :rows="5"
                placeholder="如：本期应付 = 期初欠款 + 本期订单总金额 - 本期已付金额；如有异议请在7个工作日内联系我方。"
              />
              <div class="form-tip">显示在对账单金额汇总下方，每行一条。</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <div class="save-bar">
        <el-button type="primary" :loading="saving" @click="handleSave">保存设置（仅保存当前 Tab 的设置项）</el-button>
      </div>
    </el-card>

    <!-- 产品编辑弹窗 -->
    <el-dialog
      v-model="productDialog"
      :title="editingProduct.id ? '编辑产品' : '新增产品'"
      width="480px"
      destroy-on-close
    >
      <el-form ref="productFormRef" :model="productForm" :rules="productRules" label-width="90px">
        <el-form-item label="产品名称" prop="name">
          <el-input v-model="productForm.name" placeholder="如：苹果" maxlength="100" />
        </el-form-item>
        <el-form-item label="规格型号">
          <el-input v-model="productForm.specification" placeholder="如：5斤/箱，一级果" maxlength="100" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="单位">
              <el-select v-model="productForm.unit" placeholder="单位" allow-create filterable style="width: 100%">
                <el-option label="个" value="个" />
                <el-option label="件" value="件" />
                <el-option label="箱" value="箱" />
                <el-option label="kg" value="kg" />
                <el-option label="吨" value="吨" />
                <el-option label="米" value="米" />
                <el-option label="平方米" value="平方米" />
                <el-option label="套" value="套" />
                <el-option label="台" value="台" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单价(元)" prop="unit_price">
              <el-input-number
                v-model="productForm.unit_price"
                :min="0"
                :precision="2"
                :step="1"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="productDialog = false">取消</el-button>
        <el-button type="primary" :loading="productSaving" @click="handleSaveProduct">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus, InfoFilled } from '@element-plus/icons-vue';
import api from '../api';
import { formatMoney } from '../utils/constants';

const loading = ref(false);
const saving = ref(false);
const formRef = ref();
const activeTab = ref('company');

// 产品列表相关
const productsList = ref([]);
const productDialog = ref(false);
const productSaving = ref(false);
const productFormRef = ref();
const editingProduct = reactive({ id: null });
const productForm = reactive({
  name: '',
  specification: '',
  unit: '',
  unit_price: 0,
});
const productRules = {
  name: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
};

const form = reactive({
  // 公司信息
  company_name: '',
  company_contact: '',
  company_phone: '',
  company_address: '',
  company_tax_number: '',
  company_bank: '',
  company_bank_account: '',
  company_order_prefix: '',
  // 文档样式
  doc_logo_url: '',
  doc_title_size: 24,
  doc_font_family: '"SimSun", "宋体", "Noto Serif SC", serif',
  doc_table_border_color: '#555555',
  doc_amount_color: '#c0392b',
  doc_footer_text: '',
  // 合同条款
  contract_payment_terms: '',
  contract_delivery_terms: '',
  contract_other_terms: '',
  // 对账单
  statement_disclaimer: '',
});

// 哪些key属于哪个tab（保存时只保存当前tab相关字段）
const tabKeys = {
  company: [
    'company_name', 'company_contact', 'company_phone', 'company_address',
    'company_tax_number', 'company_bank', 'company_bank_account',
    'company_order_prefix',
  ],
  products: [], // 产品走独立API
  style: [
    'doc_logo_url', 'doc_title_size', 'doc_font_family',
    'doc_table_border_color', 'doc_amount_color', 'doc_footer_text',
  ],
  contract: [
    'contract_payment_terms', 'contract_delivery_terms', 'contract_other_terms',
  ],
  statement: ['statement_disclaimer'],
};

async function fetchSettings() {
  loading.value = true;
  try {
    const data = await api.get('/settings');
    Object.keys(form).forEach((key) => {
      if (key === 'doc_title_size') {
        form[key] = parseInt(data[key], 10) || 24;
      } else {
        form[key] = data[key] ?? '';
      }
    });
  } catch {
  } finally {
    loading.value = false;
  }
}

async function fetchProducts() {
  try {
    const data = await api.get('/products');
    productsList.value = data.list || [];
  } catch {
  }
}

async function handleSave() {
  // 只保存当前tab相关的设置字段
  const keys = tabKeys[activeTab.value] || [];
  const payload = {};
  keys.forEach(k => { payload[k] = form[k]; });

  if (Object.keys(payload).length === 0) {
    // 产品tab不走这里；但也给个提示
    ElMessage.info('产品预设的增删改在各自操作按钮上即时保存');
    return;
  }

  saving.value = true;
  try {
    await api.put('/settings', payload);
    ElMessage.success('设置保存成功');
  } catch {
  } finally {
    saving.value = false;
  }
}

// 产品编辑
function openProductDialog(row = null) {
  if (row) {
    editingProduct.id = row.id;
    productForm.name = row.name;
    productForm.specification = row.specification || '';
    productForm.unit = row.unit || '';
    productForm.unit_price = Number(row.unit_price) || 0;
  } else {
    editingProduct.id = null;
    productForm.name = '';
    productForm.specification = '';
    productForm.unit = '';
    productForm.unit_price = 0;
  }
  productDialog.value = true;
}

async function handleSaveProduct() {
  await productFormRef.value?.validate();
  productSaving.value = true;
  try {
    const payload = {
      name: productForm.name.trim(),
      specification: productForm.specification || '',
      unit: productForm.unit || '',
      unit_price: Number(productForm.unit_price) || 0,
    };
    if (editingProduct.id) {
      await api.put(`/products/${editingProduct.id}`, payload);
      ElMessage.success('产品更新成功');
    } else {
      await api.post('/products', payload);
      ElMessage.success('产品创建成功');
    }
    productDialog.value = false;
    await fetchProducts();
  } catch {
  } finally {
    productSaving.value = false;
  }
}

async function handleDeleteProduct(row) {
  try {
    await api.delete(`/products/${row.id}`);
    ElMessage.success('已删除');
    await fetchProducts();
  } catch {
  }
}

onMounted(async () => {
  await Promise.all([fetchSettings(), fetchProducts()]);
});
</script>

<style scoped>
.page-header {
  margin-bottom: 16px;
}

.page-title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 700;
  color: #1d2129;
}

.page-subtitle {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.settings-card {
  max-width: 960px;
}

.products-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.tip-block {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  padding: 8px 12px;
  background: #f4f4f5;
  border-radius: 6px;
  flex: 1;
  min-width: 260px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  margin-top: 4px;
}

.form-tip-inline {
  margin-left: 8px;
  font-size: 13px;
  color: #909399;
}

.color-value {
  margin-left: 8px;
  font-size: 13px;
  color: #606266;
  font-family: monospace;
}

.save-bar {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 18px;
  }
  .settings-card :deep(.el-form-item__label) {
    width: auto !important;
    text-align: left;
  }
  .settings-card :deep(.el-form-item) {
    flex-direction: column;
    align-items: stretch;
  }
  .settings-card :deep(.el-form-item__content) {
    margin-left: 0 !important;
  }
}
</style>
