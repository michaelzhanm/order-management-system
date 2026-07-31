import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'customers',
        name: 'Customers',
        component: () => import('../views/Customers.vue'),
        meta: { title: '客户管理' },
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('../views/Orders.vue'),
        meta: { title: '订单管理' },
      },
      {
        path: 'orders/create',
        name: 'OrderCreate',
        component: () => import('../views/OrderForm.vue'),
        meta: { title: '创建订单' },
      },
      {
        path: 'orders/:id/edit',
        name: 'OrderEdit',
        component: () => import('../views/OrderForm.vue'),
        meta: { title: '编辑订单' },
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('../views/OrderDetail.vue'),
        meta: { title: '订单详情' },
      },
      {
        path: 'statement',
        name: 'Statement',
        component: () => import('../views/Statement.vue'),
        meta: { title: '对账单' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('../views/Users.vue'),
        meta: { title: '用户管理', adminOnly: true },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/Settings.vue'),
        meta: { title: '系统设置', adminOnly: true },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const auth = useAuthStore();
  if (to.meta.public) {
    if (auth.isLoggedIn) return next('/dashboard');
    return next();
  }
  if (!auth.isLoggedIn) {
    return next('/login');
  }
  if (to.meta.adminOnly && !auth.isAdmin) {
    return next('/dashboard');
  }
  next();
});

export default router;
