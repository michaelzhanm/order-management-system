<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <el-icon class="logo-icon"><Goods /></el-icon>
        <h1>企业订单管理系统</h1>
        <p>Enterprise Order Management System</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            size="large"
            placeholder="请输入用户名"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            size="large"
            type="password"
            show-password
            placeholder="请输入密码"
            :prefix-icon="Lock"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-button
          type="primary"
          size="large"
          class="login-btn"
          :loading="loading"
          @click="handleLogin"
        >
          登 录
        </el-button>
      </el-form>
      <div class="login-tip">
        默认管理员账号：admin / admin123
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();
const formRef = ref();
const loading = ref(false);

const form = reactive({
  username: '',
  password: '',
});

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

async function handleLogin() {
  await formRef.value?.validate();
  loading.value = true;
  try {
    await auth.login(form.username, form.password);
    ElMessage.success('登录成功');
    if (auth.user?.must_change_password) {
      ElMessage.warning('请及时修改默认密码');
    }
    router.push('/dashboard');
  } catch {
    // error handled by interceptor
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: #fff;
  border-radius: 16px;
  padding: 40px 36px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  font-size: 48px;
  color: #1677ff;
  margin-bottom: 12px;
}

.login-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: #1d2129;
  margin: 0 0 4px;
}

.login-header p {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

.login-btn {
  width: 100%;
  margin-top: 8px;
  font-size: 16px;
  letter-spacing: 4px;
}

.login-tip {
  text-align: center;
  margin-top: 20px;
  font-size: 12px;
  color: #909399;
}

@media (max-width: 480px) {
  .login-card {
    padding: 28px 20px;
  }
  .login-header h1 {
    font-size: 18px;
  }
}
</style>
