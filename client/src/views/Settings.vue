<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">系统设置</h2>
      <p class="page-subtitle">配置乙方（我方）公司信息，用于合同和对账单生成</p>
    </div>

    <el-card v-loading="loading" class="settings-card">
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
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存设置</el-button>
        </el-form-item>
      </el-form>
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

const form = reactive({
  company_name: '',
  company_contact: '',
  company_phone: '',
  company_address: '',
  company_tax_number: '',
  company_bank: '',
  company_bank_account: '',
});

async function fetchSettings() {
  loading.value = true;
  try {
    const data = await api.get('/settings');
    Object.keys(form).forEach((key) => {
      form[key] = data[key] ?? '';
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
  max-width: 720px;
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
