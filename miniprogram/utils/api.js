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
    const url = BASE_URL + options.url;
    const isPost = options.method === 'POST';
    const requestData = isPost ? JSON.stringify(options.data || {}) : (options.data || {});
    
    console.log('发起请求:', url, options.method, requestData);
    
    wx.request({
      url: url,
      method: options.method || 'GET',
      data: requestData,
      timeout: 10000,
      header: {
        'Content-Type': isPost ? 'application/json' : 'application/x-www-form-urlencoded',
        ...options.header
      },
      success: (res) => {
        console.log('请求成功:', url, res.statusCode, res.data);
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          const error = new Error(`请求失败: ${res.statusCode}`);
          error.statusCode = res.statusCode;
          error.data = res.data;
          reject(error);
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', url, err);
        const error = new Error(err.errMsg || '网络请求失败');
        error.originalError = err;
        reject(error);
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
  // 登录
  login(email, password) {
    return request({
      url: '/api/miniapp-auth',
      method: 'POST',
      data: {
        action: 'login',
        email: email,
        password: password
      }
    });
  },

  // 注册
  register(email, password, username) {
    return request({
      url: '/api/miniapp-auth',
      method: 'POST',
      data: {
        action: 'register',
        email: email,
        password: password,
        username: username
      }
    });
  },

  // 微信登录
  wechatLogin(code, nickName, avatarUrl) {
    return request({
      url: '/api/miniapp-auth',
      method: 'POST',
      data: {
        action: 'wechat-login',
        code: code,
        nickName: nickName,
        avatarUrl: avatarUrl
      }
    });
  },

  // 获取用户已安装组件
  getUserComponents(userId) {
    return request({
      url: '/api/user-components',
      method: 'GET',
      data: { userId }
    });
  },

  // 安装组件到用户账户
  installComponent(userId, componentId) {
    return request({
      url: '/api/user-components',
      method: 'POST',
      data: { userId, componentId }
    });
  },

  // 卸载用户组件
  uninstallComponent(userId, componentId) {
    return request({
      url: `/api/user-components?userId=${userId}&componentId=${componentId}`,
      method: 'DELETE'
    });
  },

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

/**
 * 眼镜设备API（智能功能通过服务器）
 */
const GlassesAPI = {
  // 切换AI模型
  switchAIModel(deviceId, model, config = {}) {
    return request({
      url: '/api/glasses/ai-model',
      method: 'POST',
      data: {
        deviceId,
        model,
        ...config
      }
    });
  },

  // 发起导航
  startNavigation(deviceId, destination) {
    return request({
      url: '/api/glasses/navigation',
      method: 'POST',
      data: {
        deviceId,
        destination
      }
    });
  },

  // 安装社区组件（通过服务器推送到ESP32）
  installComponentToGlasses(deviceId, componentId, userId) {
    return request({
      url: '/api/glasses/install-component',
      method: 'POST',
      data: {
        deviceId,
        componentId,
        userId
      }
    });
  },

  // 语音助手对话
  voiceAssistant(deviceId, audioData, language = 'zh-CN') {
    return request({
      url: '/api/glasses/voice-assistant',
      method: 'POST',
      data: {
        deviceId,
        audioData,
        language
      }
    });
  },

  // 物体识别
  objectRecognition(deviceId, imageData) {
    return request({
      url: '/api/glasses/object-recognition',
      method: 'POST',
      data: {
        deviceId,
        imageData
      }
    });
  },

  // 实时翻译
  translate(deviceId, text, targetLang) {
    return request({
      url: '/api/glasses/translate',
      method: 'POST',
      data: {
        deviceId,
        text,
        targetLang
      }
    });
  }
};

module.exports = {
  BASE_URL,
  request,
  ComponentAPI,
  UserAPI,
  GlassesAPI
};
