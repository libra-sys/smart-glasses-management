/**
 * API配置和请求封装
 */

// API基础地址配置
const API_CONFIG = {
  // 开发环境
  development: 'http://localhost:5175',
  // 生产环境（部署后改为实际域名）
  production: 'https://help.hlw.work'
};

// 当前环境 - 使用生产环境
const ENV = 'production';
const BASE_URL = API_CONFIG[ENV];

console.log('=== API 配置 ===');
console.log('ENV:', ENV);
console.log('BASE_URL:', BASE_URL);

/**
 * 封装请求方法
 */
function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`));
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 组件市场API
 */
const ComponentAPI = {
  // 获取组件列表
  getList(params = {}) {
    return request({
      url: '/api/components',
      method: 'GET',
      data: params
    });
  },

  // 获取组件详情
  getDetail(id) {
    return request({
      url: `/api/components/${id}`,
      method: 'GET'
    });
  },

  // 下载组件
  download(id) {
    return request({
      url: `/api/components/${id}/download`,
      method: 'GET'
    });
  },

  // 搜索组件
  search(keyword) {
    return request({
      url: '/api/components/search',
      method: 'GET',
      data: { keyword }
    });
  },

  // 获取分类列表
  getCategories() {
    return request({
      url: '/api/categories',
      method: 'GET'
    });
  }
};

/**
 * 用户API
 */
const UserAPI = {
  // 上传组件（用户发布）
  uploadComponent(data) {
    return request({
      url: '/api/user/components',
      method: 'POST',
      data: data
    });
  },

  // 获取我的组件
  getMyComponents() {
    return request({
      url: '/api/user/components',
      method: 'GET'
    });
  }
};

module.exports = {
  BASE_URL,
  request,
  ComponentAPI,
  UserAPI
};
