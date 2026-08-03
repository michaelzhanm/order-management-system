<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">系统设置</h2>
      <p class="page-subtitle">配置公司信息、文档样式与合同条款（仅管理员可修改）</p>
    </div>

    <el-card v-loading="loading" class="settings-card">
      <el-tabs v-model="activeTab">
        <!-- 公司信息 -->
        <el-tab-pane label="公司信息" name="company">
          <el-form ref="formRef" :model="form" label-width="180px" label-position="right">
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
          </el-form>
        </el-tab-pane>

        <!-- 文档样式 -->
        <el-tab-pane label="文档样式" name="style">
          <el-form :model="form" label-width="180px" label-position="right">
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
          <el-form :model="form" label-width="180px" label-position="right">
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
          <el-form :model="form" label-width="180px" label-position="right">
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
        <el-button type="primary" :loading="saving" @click="handleSave">保存设置</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import api from '../api';

const loading = ref(false);
const saving = ref(false);
const formRef = ref();
const activeTab = ref('company');

const form = reactive({
  // 公司信息
  company_name: '',
  company_contact: '',
  company_phone: '',
  company_address: '',
  company_tax_number: '',
  company_bank: '',
  company_bank_account: '',
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
    // 错误已由拦截器统一处理
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    await api.put('/settings', { ...form });
    ElMessage.success('设置保存成功');
  } catch {
    // 错误已由拦截器统一处理
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  fetchSettings();
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
  max-width: 760px;
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
