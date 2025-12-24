/**
 * 眼镜服务器API工具
 * 与本地/远程服务器通信，控制眼镜设备
 */

// 获取服务器配置
const getServerConfig = () => {
  const config = wx.getStorageSync('glassesServer');
  if (!config) {
    throw new Error('未配置服务器，请先连接服务器');
  }
  return config;
};

// 获取服务器基础URL
const getServerUrl = () => {
  const config = getServerConfig();
  return `http://${config.ip}:${config.port}`;
};

// 通用请求封装
const request = (options) => {
  return new Promise((resolve, reject) => {
    try {
      const serverUrl = getServerUrl();
      
      wx.request({
        url: `${serverUrl}${options.url}`,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'content-type': 'application/json',
          ...options.header
        },
        timeout: options.timeout || 10000,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(new Error(`请求失败: ${res.statusCode}`));
          }
        },
        fail: (err) => {
          console.error('请求失败:', err);
          reject(new Error('网络错误，请检查服务器连接'));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * 眼镜服务器API
 */
const GlassesServerAPI = {
  
  // ==================== 服务器状态 ====================
  
  /**
   * 获取服务器和眼镜状态
   */
  getStatus() {
    return request({
      url: '/api/miniapp/status',
      method: 'GET'
    });
  },

  /**
   * 服务发现（检测服务器是否可用）
   */
  discover() {
    return request({
      url: '/api/miniapp/discover',
      method: 'GET'
    });
  },

  /**
   * 更新服务器配置
   */
  updateConfig(serverName, location) {
    return request({
      url: '/api/miniapp/config',
      method: 'POST',
      data: {
        serverName,
        location
      }
    });
  },

  // ==================== 组件管理 ====================

  /**
   * 安装社区组件到眼镜
   * @param {Object} component - 组件信息
   * @param {string} component.componentId - 组件ID
   * @param {string} component.name - 组件名称
   * @param {string} component.description - 组件描述
   * @param {Object} component.config - 组件配置
   * @param {string} component.scriptUrl - 组件脚本URL（可选）
   */
  installComponent(component) {
    return request({
      url: '/api/miniapp/component/install',
      method: 'POST',
      data: {
        componentId: component.componentId || component.id,
        name: component.name,
        description: component.description || '',
        config: component.config || {},
        scriptUrl: component.scriptUrl
      }
    });
  },

  /**
   * 卸载组件（通知服务器关闭对应功能）
   * @param {string} componentId - 组件ID
   */
  uninstallComponent(componentId) {
    return request({
      url: '/api/miniapp/component/uninstall',
      method: 'POST',
      data: { componentId }
    });
  },

  // ==================== 导航功能 ====================

  /**
   * 启动视觉导航（盲道 / 过街 / 红绿灯）
   * @param {string} mode - 导航模式: 'blindpath' | 'crossing' | 'traffic_light'
   */
  startNavigation(mode) {
    return request({
      url: '/api/miniapp/navigation/start',
      method: 'POST',
      data: { mode }
    });
  },

  /**
   * 停止视觉导航
   */
  stopNavigation() {
    return request({
      url: '/api/miniapp/navigation/stop',
      method: 'POST'
    });
  },

  // ==================== 地图导航（基于手机定位 + 腾讯地图） ====================

  /**
   * 启动地图导航（从当前手机位置到目的地）
   * @param {Object} options
   * @param {string} options.destination - 目的地名称或地址
   * @param {number} options.destLat - 目的地纬度（可选）
   * @param {number} options.destLng - 目的地经度（可选）
   */
  startMapNavigation({ destination, destLat, destLng }) {
    return request({
      url: '/api/miniapp/map/navigate',
      method: 'POST',
      data: {
        destination,
        destLat,
        destLng
      }
    });
  },

  /**
   * 停止地图导航
   */
  stopMapNavigation() {
    return request({
      url: '/api/miniapp/map/navigate/stop',
      method: 'POST'
    });
  },

  /**
   * 获取地图导航当前状态
   */
  getMapNavigationStatus() {
    return request({
      url: '/api/miniapp/map/navigate/status',
      method: 'GET'
    });
  },

  // ==================== 物品查找 ====================

  /**
   * 查找物品
   * @param {string} itemName - 物品名称
   */
  searchItem(itemName) {
    return request({
      url: '/api/miniapp/item/search',
      method: 'POST',
      data: { itemName }
    });
  },

  /**
   * 上报当前手机定位，用于无GPS的眼镜导航
   */
  updateLocation(lat, lng, accuracy) {
    return request({
      url: '/api/miniapp/location/update',
      method: 'POST',
      data: { lat, lng, accuracy }
    });
  },

  // ==================== 便捷方法 ====================

  /**
   * 启动盲道导航
   */
  startBlindPathNavigation() {
    return this.startNavigation('blindpath');
  },

  /**
   * 启动过马路辅助
   */
  startCrossingAssistance() {
    return this.startNavigation('crossing');
  },

  /**
   * 启动红绿灯检测
   */
  startTrafficLightDetection() {
    return this.startNavigation('traffic_light');
  },

  // ==================== 检查连接状态 ====================

  /**
   * 检查是否已配置服务器
   */
  isServerConfigured() {
    try {
      const config = wx.getStorageSync('glassesServer');
      return !!config && !!config.ip;
    } catch (error) {
      return false;
    }
  },

  /**
   * 获取服务器配置信息
   */
  getServerInfo() {
    try {
      return wx.getStorageSync('glassesServer');
    } catch (error) {
      return null;
    }
  },

  /**
   * 清除服务器配置
   */
  clearServerConfig() {
    wx.removeStorageSync('glassesServer');
  }
};

module.exports = GlassesServerAPI;
