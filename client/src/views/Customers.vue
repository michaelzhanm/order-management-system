<template>
  <div class="page-container">
    <!-- 页面标题 + 操作 -->
    <div class="page-header">
      <h2 class="page-title">客户管理</h2>
      <el-button type="primary" :icon="Plus" @click="handleAdd">新增客户</el-button>
    </div>

    <div class="card-box">
      <!-- 搜索框 -->
      <div class="toolbar">
        <el-input
          v-model="search"
          placeholder="按公司名称搜索"
          :prefix-icon="Search"
          clearable
          style="max-width: 320px"
          @input="handleSearchInput"
          @clear="handleSearchClear"
        />
      </div>

      <!-- 表格 -->
      <div class="table-wrapper">
        <el-table :data="list" v-loading="loading" style="width: 100%">
          <el-table-column prop="company_name" label="公司名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="contact_name" label="联系人" min-width="100" />
          <el-table-column prop="phone" label="电话" min-width="130" />
          <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
          <el-table-column prop="tax_number" label="税号" min-width="160" />
          <el-table-column label="初始欠款" width="130" align="right">
            <template #default="{ row }">¥{{ formatMoney(row.initial_debt) }}</template>
          </el-table-column>
          <el-table-column label="创建时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无客户数据" :image-size="80" />
          </template>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          layout="total, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :background="true"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 新增/编辑 弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑客户' : '新增客户'"
      width="520px"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="公司名称" prop="company_name">
          <el-input v-model="form.company_name" placeholder="请输入公司名称" maxlength="100" />
        </el-form-item>
        <el-form-item label="联系人" prop="contact_name">
          <el-input v-model="form.contact_name" placeholder="请输入联系人" maxlength="50" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" maxlength="30" />
        </el-form-item>
        <el-form-item label="地址" prop="address">
          <el-input v-model="form.address" type="textarea" :rows="2" placeholder="请输入公司地址" maxlength="200" />
        </el-form-item>
        <el-form-item label="税号" prop="tax_number">
          <el-input v-model="form.tax_number" placeholder="请输入统一社会信用代码/税号" maxlength="50" />
        </el-form-item>
        <el-form-item label="初始欠款" prop="initial_debt">
          <el-input-number
            v-model="form.initial_debt"
            :min="0"
            :precision="2"
            :step="100"
            controls-position="right"
            style="width: 100%"
          />
          <div class="form-tip">上期结余 / 历史欠款，新建后可通过收款单核销</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Search, Edit, Delete } from '@element-plus/icons-vue';
import api from '../api';
import { formatMoney } from '../utils/constants';

const loading = ref(false);
const saving = ref(false);
const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const search = ref('');

const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref(null);
const formRef = ref();
const searchTimer = ref(null);

const form = reactive({
  company_name: '',
  contact_name: '',
  phone: '',
  address: '',
  tax_number: '',
  initial_debt: 0,
});

const rules = {
  company_name: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
};

function formatDateTime(value) {
  if (!value) return '-';
  return String(value).replace('T', ' ').slice(0, 19);
}

async function fetchList() {
  loading.value = true;
  try {
    const data = await api.get('/customers', {
      params: { search: search.value || undefined, page: page.value, pageSize: pageSize.value },
    });
    list.value = data.list || [];
    total.value = data.total || 0;
    page.value = data.page || page.value;
    pageSize.value = data.pageSize || pageSize.value;
  } catch {
    // 错误已由拦截器统一处理
  } finally {
    loading.value = false;
  }
}

// 搜索防抖
function handleSearchInput() {
  if (searchTimer.value) clearTimeout(searchTimer.value);
  searchTimer.value = setTimeout(() => {
    page.value = 1;
    fetchList();
  }, 300);
}

function handleSearchClear() {
  page.value = 1;
  fetchList();
}

function handlePageChange(p) {
  page.value = p;
  fetchList();
}

function resetForm() {
  isEdit.value = false;
  editingId.value = null;
  form.company_name = '';
  form.contact_name = '';
  form.phone = '';
  form.address = '';
  form.tax_number = '';
  form.initial_debt = 0;
  formRef.value?.clearValidate();
}

function handleAdd() {
  resetForm();
  isEdit.value = false;
  dialogVisible.value = true;
}

async function handleEdit(row) {
  resetForm();
  isEdit.value = true;
  editingId.value = row.id;
  dialogVisible.value = true;
  // 优先用列表行数据回显，再拉取最新
  Object.assign(form, {
    company_name: row.company_name ?? '',
    contact_name: row.contact_name ?? '',
    phone: row.phone ?? '',
    address: row.address ?? '',
    tax_number: row.tax_number ?? '',
    initial_debt: Number(row.initial_debt) || 0,
  });
  try {
    const data = await api.get(`/customers/${row.id}`);
    Object.assign(form, {
      company_name: data.company_name ?? '',
      contact_name: data.contact_name ?? '',
      phone: data.phone ?? '',
      address: data.address ?? '',
      tax_number: data.tax_number ?? '',
      initial_debt: Number(data.initial_debt) || 0,
    });
  } catch {
    // 错误已由拦截器统一处理
  }
}

async function handleSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      const payload = {
        company_name: form.company_name,
        contact_name: form.contact_name,
        phone: form.phone,
        address: form.address,
        tax_number: form.tax_number,
        initial_debt: Number(form.initial_debt) || 0,
      };
      if (isEdit.value) {
        await api.put(`/customers/${editingId.value}`, payload);
        ElMessage.success('客户更新成功');
      } else {
        await api.post('/customers', payload);
        ElMessage.success('客户新增成功');
      }
      dialogVisible.value = false;
      fetchList();
    } catch {
      // 错误已由拦截器统一处理
    } finally {
      saving.value = false;
    }
  });
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除客户「${row.company_name}」吗？该操作不可恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    );
  } catch {
    return; // 用户取消
  }
  try {
    await api.delete(`/customers/${row.id}`);
    ElMessage.success('客户删除成功');
    // 删除后若当前页空了，回退一页
    if (list.value.length === 1 && page.value > 1) {
      page.value -= 1;
    }
    fetchList();
  } catch {
    // 错误已由拦截器统一处理
  }
}

onMounted(() => {
  fetchList();
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

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1d2129;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 18px;
  }
  .pagination-wrapper {
    justify-content: center;
  }
  :deep(.el-dialog) {
    width: 92% !important;
  }
}
</style>
