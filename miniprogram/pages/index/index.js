// index.js - 首页，显示设备连接状态和快捷功能入口
// 主要功能：设备状态展示、AI模式控制、快捷功能导航
const bluetoothManager = require('../../utils/bluetooth.js');

Page({
  data: {
    greetingTime: '',
    connectedDevice: null,
    aiModeEnabled: false,
    isLoggedIn: false,
    userInfo: {},
    isConnecting: false,  // 是否正在连接
    deviceBattery: 0       // 设备电量
  },
  
  /**
   * 页面加载时执行的初始化函数
   * @description 初始化问候语和模拟设备连接状态
   */
  onLoad() {
    this.setGreetingTime();
    this.checkLoginStatus();
  },
  
  // 检查登录状态
  checkLoginStatus() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    const userInfo = wx.getStorageSync('userInfo');
    const pairedDevice = wx.getStorageSync('pairedDevice'); // 获取已配对的设备
    
    console.log('已配对设备信息:', pairedDevice);
    
    this.setData({ 
      isLoggedIn: isLoggedIn || false,
      userInfo: userInfo || {},
      connectedDevice: pairedDevice || null // 显示已配对的设备
    });
    
    // 如果有已配对设备，检查连接状态
    if (pairedDevice && pairedDevice.deviceId) {
      this.checkDeviceConnection(pairedDevice.deviceId);
    }
  },
  
  /**
   * 检查设备连接状态
   */
  checkDeviceConnection(deviceId) {
    if (!deviceId) {
      console.log('设备ID为空');
      return;
    }
    
    this.setData({ isConnecting: true });
    
    wx.getBLEDeviceServices({
      deviceId: deviceId,
      success: (res) => {
        console.log('设备已连接，服务列表:', res.services);
        this.setData({ isConnecting: false });
        
        // 尝试获取电量
        this.getDeviceBattery(deviceId, res.services);
      },
      fail: (err) => {
        console.log('设备未连接，错误:', err);
        this.setData({ isConnecting: false, deviceBattery: 0 });
      }
    });
  },
  
  /**
   * 获取设备电量
   */
  getDeviceBattery(deviceId, services) {
    // 查找电量服务
    const batteryService = services.find(s => s.uuid.toUpperCase().includes('180F'));
    
    if (batteryService) {
      // 获取电量特征值
      wx.getBLEDeviceCharacteristics({
        deviceId: deviceId,
        serviceId: batteryService.uuid,
        success: (res) => {
          const batteryChar = res.characteristics.find(c => c.uuid.toUpperCase().includes('2A19'));
          if (batteryChar) {
            // 读取电量
            wx.readBLECharacteristicValue({
              deviceId: deviceId,
              serviceId: batteryService.uuid,
              characteristicId: batteryChar.uuid,
              success: (res) => {
                console.log('读取电量成功');
              },
              fail: (err) => {
                console.log('读取电量失败:', err);
                this.setData({ deviceBattery: 85 }); // 使用默认值
              }
            });
            
            // 监听电量变化
            wx.onBLECharacteristicValueChange((res) => {
              if (res.characteristicId === batteryChar.uuid) {
                const battery = res.value.byteLength > 0 ? new Uint8Array(res.value)[0] : 85;
                console.log('设备电量:', battery + '%');
                this.setData({ deviceBattery: battery });
              }
            });
            
            // 启用通知
            wx.notifyBLECharacteristicValueChange({
              deviceId: deviceId,
              serviceId: batteryService.uuid,
              characteristicId: batteryChar.uuid,
              state: true,
              success: () => {
                console.log('已启用电量通知');
              },
              fail: (err) => {
                console.log('启用电量通知失败:', err);
                this.setData({ deviceBattery: 85 }); // 使用默认值
              }
            });
          } else {
            this.setData({ deviceBattery: 85 }); // 使用默认值
          }
        },
        fail: () => {
          this.setData({ deviceBattery: 85 }); // 使用默认值
        }
      });
    } else {
      // 没有电量服务，使用模拟值
      const battery = Math.floor(Math.random() * 40) + 60; // 60-100的随机值
      this.setData({ deviceBattery: battery });
    }
  },
  
  /**
   * 设置问候语
   * 根据当前时间生成合适的问候语（早上好/下午好/晚上好）
   */
  setGreetingTime() {
    const now = new Date();
    const hour = now.getHours();
    let greeting;
    if (hour < 12) {
      greeting = '早上好';
    } else if (hour < 18) {
      greeting = '下午好';
    } else {
      greeting = '晚上好';
    }
    this.setData({ greetingTime: greeting });
  },
  
  /**
   * 跳转到添加设备页面
   */
  // 点击用户头像
  handleUserClick() {
    const isLoggedIn = this.data.isLoggedIn;
    if (!isLoggedIn) {
      // 未登录，跳转到登录页
      wx.navigateTo({
        url: '/pages/login/login'
      });
    } else {
      // 已登录，跳转到设置页
      wx.navigateTo({
        url: '/pages/settings/settings'
      });
    }
  },
  
  addDevice() {
    // 检查登录状态
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再添加设备',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/device/device'
    });
  },
  
  /**
   * 模拟设备关机
   * @description 模拟设备关机操作，断开连接并清除设备信息
   */
  shutdownDevice() {
    const deviceId = this.data.connectedDevice?.deviceId;
    
    if (deviceId) {
      // 发送关机指令到设备
      bluetoothManager.sendJSON({
        type: 'DEVICE_SHUTDOWN',
        timestamp: Date.now()
      }, { silent: true })
        .then(() => {
          console.log('关机指令已发送');
        })
        .catch(err => {
          console.log('关机指令发送失败:', err);
        });
      
      // 等待500ms后断开蓝牙连接
      setTimeout(() => {
        wx.closeBLEConnection({
          deviceId: deviceId,
          success: () => {
            console.log('已断开连接');
          },
          fail: () => {
            console.log('断开连接失败或已断开');
          }
        });
      }, 500);
    }
    
    wx.showToast({
      title: '已断开连接',
      icon: 'success'
    });
    
    // 清除设备信息并关闭AI模式
    this.setData({ 
      connectedDevice: null, 
      aiModeEnabled: false,
      deviceBattery: 0,
      isConnecting: false
    });
    wx.removeStorageSync('pairedDevice');
    wx.setStorageSync('aiModeEnabled', false);
  },

  /**
   * 切换AI增强模式
   * @description 切换AI增强模式的开关状态，更新页面显示并保存到本地存储
   */
  toggleAiMode() {
    const newAiMode = !this.data.aiModeEnabled; // 计算新的模式状态
    this.setData({ aiModeEnabled: newAiMode }); // 更新页面数据
    wx.setStorageSync('aiModeEnabled', newAiMode); // 保存状态到本地存储
    
    // 发送指令到设备
    const command = {
      type: 'AI_MODE',
      enabled: newAiMode,
      timestamp: Date.now()
    };
    
    bluetoothManager.sendJSON(command, { silent: true })
      .then(() => {
        console.log('AI模式指令已发送');
      })
      .catch(err => {
        console.log('AI模式指令发送失败:', err);
      });
    
    wx.showToast({
      title: newAiMode ? 'AI增强已开启' : 'AI增强已关闭',
      icon: 'success'
    });
  },

  /**
   * 跳转到设备设置页面
   * @description 导航至设备设置页面，用于配置设备参数
   */
  deviceSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },
  
  /**
   * 跳转到AI模型管理页面
   * @description 导航至AI模型管理页面，用于配置API参数和切换模型
   */
  switchAIModel() {
    wx.navigateTo({
      url: '/pages/aimodel/aimodel'
    });
  },
  
  /**
   * 显示音效设置提示
   * @description 跳转到音效设置页面
   */
  soundSettings() {
    wx.navigateTo({
      url: '/pages/sound/sound'
    });
  },

  /**
   * 页面显示时执行
   * @description 页面每次显示时从本地存储加载AI模式状态
   */
  onShow() {
    // 重新检查登录状态
    this.checkLoginStatus();
    
    const aiModeEnabled = wx.getStorageSync('aiModeEnabled') || false;
    this.setData({ aiModeEnabled });
  },
  
  /**
   * 显示功能组件扩展提示
   * @description 跳转到功能组件页面
   */
  extensionFunctions() {
    wx.navigateTo({
      url: '/pages/extension/extension'
    });
  },
  
  /**
   * 显示音量控制提示
   * @description 跳转到音量控制页面
   */
  volumeControl() {
    wx.navigateTo({
      url: '/pages/volume/volume'
    });
  }
});