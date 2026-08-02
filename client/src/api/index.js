/**
 * API 适配层
 * 纯前端模式：使用 IndexedDB 本地存储，无需后端
 */
import { ElMessage } from 'element-plus';
import localApi from '../services/localApi';

// 包装 localApi，保持与 axios 相同的调用接口和错误处理
const api = {
  async get(url, config) {
    return this._call('get', url, null, config?.params);
  },
  async post(url, body) {
    return this._call('post', url, body);
  },
  async put(url, body) {
    return this._call('put', url, body);
  },
  async patch(url, body) {
    return this._call('patch', url, body);
  },
  async delete(url) {
    return this._call('delete', url);
  },

  async _call(method, url, body, params) {
    try {
      return await localApi[method](url, body, params);
    } catch (err) {
      // 兼容 axios 风格的错误对象
      const error = err?.response?.data?.error || err?.message || '操作失败';
      const status = err?.response?.status || 500;
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else {
        ElMessage.error(error);
      }
      throw err;
    }
  },
};

export default api;
