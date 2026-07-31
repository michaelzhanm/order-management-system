<template>
  <div class="page-container">
    <!-- 页面标题 + 操作 -->
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <el-button type="primary" :icon="Plus" @click="handleAdd">新增用户</el-button>
    </div>

    <div class="card-box">
      <!-- 表格 -->
      <div class="table-wrapper">
        <el-table :data="list" v-loading="loading" style="width: 100%">
          <el-table-column prop="username" label="用户名" min-width="140" show-overflow-tooltip />
          <el-table-column prop="real_name" label="姓名" min-width="120" show-overflow-tooltip />
          <el-table-column label="角色" width="120">
            <template #default="{ row }">
              <el-tag v-if="row.role === 'ADMIN'" type="primary">管理员</el-tag>
              <el-tag v-else type="info">普通员工</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="phone" label="电话" min-width="140" />
          <el-table-column label="创建时间" width="180">
            <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
              <el-button
                link
                type="danger"
                :icon="Delete"
                :disabled="isSelf(row)"
                @click="handleDelete(row)"
              >删除</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <el-empty description="暂无用户数据" :image-size="80" />
          </template>
        </el-table>
      </div>
    </div>

    <!-- 新增/编辑 弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      width="520px"
      :close-on-click-modal="false"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            :placeholder="isEdit ? '' : '请输入用户名'"
            :disabled="isEdit"
            maxlength="50"
          />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="isEdit ? '留空则不修改' : '请输入密码'"
            maxlength="50"
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="管理员" value="ADMIN" />
            <el-option label="普通员工" value="EMPLOYEE" />
          </el-select>
        </el-form-item>
        <el-form-item label="姓名" prop="real_name">
          <el-input v-model="form.real_name" placeholder="请输入姓名" maxlength="50" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入电话" maxlength="30" />
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
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Edit, Delete } from '@element-plus/icons-vue';
import api from '../api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const loading = ref(false);
const saving = ref(false);
const list = ref([]);

const dialogVisible = ref(false);
const isEdit = ref(false);
const editingId = ref(null);
const formRef = ref();

const form = reactive({
  username: '',
  password: '',
  role: 'EMPLOYEE',
  real_name: '',
  phone: '',
});

// 密码校验：新增时必填，编辑时可选
const passwordRule = computed(() => [
  {
    required: !isEdit.value,
    message: '请输入密码',
    trigger: 'blur',
  },
]);

const rules = computed(() => ({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: passwordRule.value,
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}));

function formatDateTime(value) {
  if (!value) return '-';
  return String(value).replace('T', ' ').slice(0, 19);
}

function isSelf(row) {
  return authStore.user?.id === row.id;
}

async function fetchList() {
  loading.value = true;
  try {
    const data = await api.get('/users');
    list.value = Array.isArray(data) ? data : [];
  } catch {
    // 错误已由拦截器统一处理
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  isEdit.value = false;
  editingId.value = null;
  form.username = '';
  form.password = '';
  form.role = 'EMPLOYEE';
  form.real_name = '';
  form.phone = '';
  formRef.value?.clearValidate();
}

function handleAdd() {
  resetForm();
  isEdit.value = false;
  dialogVisible.value = true;
}

function handleEdit(row) {
  resetForm();
  isEdit.value = true;
  editingId.value = row.id;
  dialogVisible.value = true;
  Object.assign(form, {
    username: row.username ?? '',
    password: '',
    role: row.role ?? 'EMPLOYEE',
    real_name: row.real_name ?? '',
    phone: row.phone ?? '',
  });
}

async function handleSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    saving.value = true;
    try {
      if (isEdit.value) {
        const payload = {
          role: form.role,
          real_name: form.real_name,
          phone: form.phone,
        };
        // password 可选，留空则不修改
        if (form.password) {
          payload.password = form.password;
        }
        await api.put(`/users/${editingId.value}`, payload);
        ElMessage.success('用户更新成功');
      } else {
        const payload = {
          username: form.username,
          password: form.password,
          role: form.role,
          real_name: form.real_name,
          phone: form.phone,
        };
        await api.post('/users', payload);
        ElMessage.success('用户新增成功');
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
      `确定要删除用户「${row.username}」吗？该操作不可恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }
    );
  } catch {
    return; // 用户取消
  }
  try {
    await api.delete(`/users/${row.id}`);
    ElMessage.success('用户删除成功');
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

@media (max-width: 768px) {
  .page-title {
    font-size: 18px;
  }
  :deep(.el-dialog) {
    width: 92% !important;
  }
}
</style>
