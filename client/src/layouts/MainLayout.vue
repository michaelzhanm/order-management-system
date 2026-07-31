<template>
  <el-container class="app-layout">
    <!-- 顶部导航栏 -->
    <el-header class="app-header">
      <div class="header-left">
        <el-icon class="logo-icon"><Goods /></el-icon>
        <span class="app-title">订单管理系统</span>
      </div>

      <!-- PC端导航菜单 -->
      <div class="header-nav desktop-only">
        <router-link to="/dashboard" class="nav-item" :class="{ active: $route.path === '/dashboard' }">
          <el-icon><HomeFilled /></el-icon> 首页
        </router-link>
        <router-link to="/customers" class="nav-item" :class="{ active: $route.path.startsWith('/customers') }">
          <el-icon><User /></el-icon> 客户管理
        </router-link>
        <router-link to="/orders" class="nav-item" :class="{ active: $route.path.startsWith('/orders') }">
          <el-icon><Document /></el-icon> 订单管理
        </router-link>
        <router-link to="/statement" class="nav-item" :class="{ active: $route.path.startsWith('/statement') }">
          <el-icon><Money /></el-icon> 对账单
        </router-link>
        <router-link v-if="auth.isAdmin" to="/users" class="nav-item" :class="{ active: $route.path.startsWith('/users') }">
          <el-icon><Setting /></el-icon> 用户管理
        </router-link>
      </div>

      <!-- 移动端菜单按钮 -->
      <div class="header-right">
        <el-dropdown trigger="click" @command="handleCommand">
          <span class="user-info">
            <el-avatar :size="32" class="user-avatar">{{ avatarText }}</el-avatar>
            <span class="user-name desktop-only">{{ auth.user?.real_name || auth.user?.username }}</span>
            <el-icon class="desktop-only"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="changePassword">
                <el-icon><Key /></el-icon> 修改密码
              </el-dropdown-item>
              <el-dropdown-item v-if="auth.isAdmin" command="settings" divided>
                <el-icon><Setting /></el-icon> 系统设置
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon> 退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button class="mobile-menu-btn" link @click="drawerVisible = true">
          <el-icon size="22"><Menu /></el-icon>
        </el-button>
      </div>
    </el-header>

    <!-- 移动端抽屉菜单 -->
    <el-drawer v-model="drawerVisible" direction="ltr" size="220px" :show-close="false" :with-header="false">
      <div class="drawer-menu">
        <div class="drawer-header">
          <el-icon class="logo-icon"><Goods /></el-icon>
          <span class="app-title">订单管理系统</span>
        </div>
        <router-link to="/dashboard" class="drawer-item" @click="drawerVisible = false">
          <el-icon><HomeFilled /></el-icon> 首页
        </router-link>
        <router-link to="/customers" class="drawer-item" @click="drawerVisible = false">
          <el-icon><User /></el-icon> 客户管理
        </router-link>
        <router-link to="/orders" class="drawer-item" @click="drawerVisible = false">
          <el-icon><Document /></el-icon> 订单管理
        </router-link>
        <router-link to="/statement" class="drawer-item" @click="drawerVisible = false">
          <el-icon><Money /></el-icon> 对账单
        </router-link>
        <router-link v-if="auth.isAdmin" to="/users" class="drawer-item" @click="drawerVisible = false">
          <el-icon><Setting /></el-icon> 用户管理
        </router-link>
        <router-link v-if="auth.isAdmin" to="/settings" class="drawer-item" @click="drawerVisible = false">
          <el-icon><Tools /></el-icon> 系统设置
        </router-link>
      </div>
    </el-drawer>

    <!-- 主内容区 -->
    <el-main class="app-main">
      <router-view />
    </el-main>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="pwdDialogVisible" title="修改密码" width="400px">
      <el-form :model="pwdForm" label-width="80px">
        <el-form-item label="旧密码">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="pwdForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitChangePassword">确认</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const drawerVisible = ref(false);
const pwdDialogVisible = ref(false);

const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const avatarText = computed(() => {
  const name = auth.user?.real_name || auth.user?.username || '';
  return name.charAt(0).toUpperCase();
});

function handleCommand(cmd) {
  if (cmd === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
      .then(() => {
        auth.logout();
        router.push('/login');
      })
      .catch(() => {});
  } else if (cmd === 'changePassword') {
    pwdForm.oldPassword = '';
    pwdForm.newPassword = '';
    pwdForm.confirmPassword = '';
    pwdDialogVisible.value = true;
  } else if (cmd === 'settings') {
    router.push('/settings');
  }
}

async function submitChangePassword() {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) {
    ElMessage.warning('请填写完整');
    return;
  }
  if (pwdForm.newPassword !== pwdForm.confirmPassword) {
    ElMessage.error('两次密码输入不一致');
    return;
  }
  try {
    await auth.changePassword(pwdForm.oldPassword, pwdForm.newPassword);
    ElMessage.success('密码修改成功');
    pwdDialogVisible.value = false;
  } catch {}
}

onMounted(() => {
  if (auth.isLoggedIn) {
    auth.fetchMe();
  }
});
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 0 20px;
  height: 60px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 24px;
  color: #1677ff;
}

.app-title {
  font-size: 18px;
  font-weight: 700;
  color: #1d2129;
  white-space: nowrap;
}

.header-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 6px;
  color: #4e5969;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
  white-space: nowrap;
}

.nav-item:hover {
  background: #f2f3f5;
  color: #1677ff;
}

.nav-item.active {
  background: #e8f3ff;
  color: #1677ff;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.user-info:hover {
  background: #f2f3f5;
}

.user-avatar {
  background: #1677ff;
  color: #fff;
  font-size: 14px;
}

.user-name {
  font-size: 14px;
  color: #4e5969;
}

.mobile-menu-btn {
  display: none;
}

.app-main {
  padding: 0;
  background: #f5f7fa;
}

.drawer-menu {
  padding: 16px 0;
}

.drawer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px 20px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 12px;
}

.drawer-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  color: #4e5969;
  text-decoration: none;
  font-size: 15px;
  transition: all 0.2s;
}

.drawer-item:hover {
  background: #f2f3f5;
  color: #1677ff;
}

.drawer-item.router-link-active {
  background: #e8f3ff;
  color: #1677ff;
  font-weight: 600;
}

/* 响应式 */
@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }
  .mobile-menu-btn {
    display: flex;
    align-items: center;
  }
  .app-title {
    font-size: 16px;
  }
  .app-header {
    padding: 0 12px;
  }
}
</style>
