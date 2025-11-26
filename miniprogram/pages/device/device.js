// device.js
// 设备管理页面，实现蓝牙设备搜索、连接、绑定和AI模式控制功能
const bluetoothManager = require('../../utils/bluetooth.js');

Page({
  data: {
    bluetoothEnabled: false,  // 蓝牙适配器是否已开启，用于控制蓝牙功能的可用性
    searching: false,         // 标记是否正在进行蓝牙设备搜索，控制搜索状态的UI显示
    devices: [],              // 存储搜索到的蓝牙设备列表，每个元素包含设备ID、名称、型号等信息
    connectedDevice: null,    // 存储当前已连接的蓝牙设备信息，用于后续的设备通信
    batteryLevel: 0,          // 存储当前连接设备的电池电量百分比（0-100）
    binding: false,           // 标记是否正在进行设备绑定操作，控制绑定状态的UI显示
    boundDevices: [],         // 存储已绑定的设备列表，从本地存储加载
    aiModeEnabled: false,     // 标记AI增强模式是否已启用，用于控制AI功能的开关
    customNames: {},          // 存储用户自定义的设备名称映射 {deviceId: customName}
    systemDeviceNames: {},    // 存储系统已配对设备的名称映射 {deviceId: systemName}
    writeServiceId: '',       // 可写服务ID
    writeCharacteristicId: '', // 可写特征值ID
    notifyServiceId: '',      // 通知服务ID
    notifyCharacteristicId: '' // 通知特征值ID
  },

  /**
   * 页面加载时执行的初始化函数
   * 主要完成以下任务：
   * 1. 检查蓝牙适配器状态，开启蓝牙功能
   * 2. 加载已绑定的设备列表
   */
  onLoad() {
    this.checkBluetoothStatus();  // 检查并初始化蓝牙状态
    this.loadBoundDevices();       // 从本地存储加载已绑定设备
    this.loadCustomNames();        // 加载自定义名称
    this.loadSystemPairedDevices(); // 加载系统已配对设备
  },

  /**
   * 检查蓝牙状态
   * 初始化蓝牙适配器并检查蓝牙是否可用
   */
  checkBluetoothStatus() {
    wx.openBluetoothAdapter({
      success: () => {
        this.setData({ bluetoothEnabled: true });
        this.onBluetoothAdapterStateChange();
      },
      fail: (err) => {
        this.setData({ bluetoothEnabled: false });
        wx.showToast({
          title: '蓝牙未开启',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 监听蓝牙适配器状态变化
   * 实时更新蓝牙可用状态
   */
  onBluetoothAdapterStateChange() {
    wx.onBluetoothAdapterStateChange((res) => {
      this.setData({ bluetoothEnabled: res.available });
    });
  },

  /**
   * 开始搜索蓝牙设备
   * 搜索所有蓝牙设备，包括ESP32、耳机、智能眼镜等
   */
  startSearch() {
    if (!this.data.bluetoothEnabled) {
      wx.showToast({
        title: '请先开启蓝牙',
        icon: 'none'
      });
      return;
    }

    this.setData({ searching: true, devices: [] });

    // 定期更新设备列表
    const updateDeviceList = () => {
      wx.getBluetoothDevices({
        success: (res) => {
          console.log('获取到的所有设备:', res.devices);
          
          const devices = [];
          res.devices.forEach(device => {
            // 获取设备所有可能的名称
            let originalName = device.name || device.localName || '';
            let advertisName = '';
            
            // 从广播数据解析名称
            if (device.advertisData) {
              try {
                const buffer = device.advertisData;
                const dataView = new DataView(buffer);
                let pos = 0;
                
                while (pos < dataView.byteLength) {
                  const length = dataView.getUint8(pos);
                  if (length === 0) break;
                  
                  const type = dataView.getUint8(pos + 1);
                  
                  // Type 0x08: Shortened Local Name
                  // Type 0x09: Complete Local Name  
                  if (type === 0x08 || type === 0x09) {
                    let name = '';
                    for (let i = pos + 2; i < pos + 1 + length; i++) {
                      const char = dataView.getUint8(i);
                      if (char !== 0) {
                        name += String.fromCharCode(char);
                      }
                    }
                    if (name.trim()) {
                      advertisName = name.trim();
                      break;
                    }
                  }
                  
                  pos += length + 1;
                }
              } catch (e) {
                console.log('解析广播数据失败:', e);
              }
            }
            
            // 选择最合适的名称 - 优先级：自定义名称 > 系统名称 > 广播名称 > 原始名称
            let deviceName = advertisName || originalName;
            
            // 如果还是空的，使用MAC地址
            if (!deviceName || deviceName.trim() === '') {
              const macSuffix = device.deviceId.replace(/:/g, '').slice(-8).toUpperCase();
              deviceName = `设备-${macSuffix}`;
            }
            
            // 检查系统是否有该设备的名称（已配对设备）
            const systemName = this.data.systemDeviceNames[device.deviceId];
            if (systemName && systemName.trim()) {
              deviceName = systemName.trim();
              console.log(`使用系统名称: ${systemName} for ${device.deviceId}`);
            }
            
            // 检查是否有自定义名称（优先级最高）
            const customName = this.data.customNames[device.deviceId];
            const displayName = customName || deviceName;
            
            // 解析设备型号
            let model, serial;
            const nameUpper = deviceName.toUpperCase();
            
            if (nameUpper.includes('ESP32') || nameUpper.includes('ESP-') || nameUpper.includes('ESP_')) {
              model = 'ESP32设备';
              serial = deviceName;
            } else if (nameUpper.includes('OPENAI') || nameUpper.includes('SG-PRO') || nameUpper.includes('SMART') && nameUpper.includes('GLASS')) {
              model = '智能眼镜';
              serial = deviceName;
            } else if (nameUpper.includes('AIRPODS') || nameUpper.includes('HEADPHONE') || nameUpper.includes('EARBUDS') || nameUpper.includes('BUDS') || nameUpper.includes('HEADSET')) {
              model = '蓝牙耳机';
              serial = deviceName;
            } else {
              model = '蓝牙设备';
              serial = deviceName;
            }
            
            const deviceInfo = { 
              ...device,
              name: displayName,           // 显示名称（优先级：自定义 > 系统 > 广播 > 原始）
              originalName: deviceName,    // 最终确定的名称
              advertisName: advertisName,  // 广播名称
              systemName: systemName || '', // 系统名称
              model, 
              serial,
              rssi: device.RSSI || -100,
              hasCustomName: !!customName,
              hasSystemName: !!systemName
            };
            
            devices.push(deviceInfo);
            
            console.log('设备详情:', {
              显示名称: displayName,
              系统名称: systemName,
              原始名称: deviceName,
              广播名称: advertisName,
              deviceName: device.name,
              localName: device.localName,
              信号强度: device.RSSI,
              设备ID: device.deviceId,
              完整设备信息: device
            });
          });
          
          // 按信号强度排序
          devices.sort((a, b) => (b.rssi || -100) - (a.rssi || -100));
          this.setData({ devices });
        },
        fail: (err) => {
          console.error('获取设备列表失败:', err);
        }
      });
    };

    // 开始搜索
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      success: () => {
        console.log('开始搜索蓝牙设备...');
                
        // 先更新一次系统设备列表
        this.loadSystemPairedDevices();
                
        wx.showToast({
          title: '正在搜索设备...',
          icon: 'loading',
          duration: 2000
        });
        
        // 每秒更新一次设备列表
        const timer = setInterval(() => {
          if (this.data.searching) {
            updateDeviceList();
          } else {
            clearInterval(timer);
          }
        }, 1000);
        
        // 搜索20秒后自动停止
        setTimeout(() => {
          clearInterval(timer);
          this.stopSearch();
          updateDeviceList(); // 最后更新一次
          
          console.log('搜索结束，共找到', this.data.devices.length, '个设备');
          if (this.data.devices.length === 0) {
            wx.showModal({
              title: '提示',
              content: '未搜索到蓝牙设备，请确认：\n1. 手机蓝牙已开启\n2. 设备蓝牙已开启\n3. 设备在附近范围内',
              showCancel: false
            });
          } else {
            wx.showToast({
              title: `找到${this.data.devices.length}个设备`,
              icon: 'success'
            });
          }
        }, 20000);
      },
      fail: (err) => {
        console.error('搜索失败:', err);
        wx.showModal({
          title: '搜索失败',
          content: `错误信息: ${err.errMsg}\n请检查蓝牙权限是否开启`,
          showCancel: false
        });
        this.setData({ searching: false });
      }
    });
  },

  /**
   * 停止搜索蓝牙设备
   */
  stopSearch() {
    wx.stopBluetoothDevicesDiscovery();
    this.setData({ searching: false });
  },

  /**
   * 连接蓝牙设备
   * @param {Object} e - 事件对象，包含设备ID和设备名称
   */
  connectDevice(e) {
    const device = e.currentTarget.dataset.device;
    const deviceId = device.deviceId;
    const deviceName = device.name;
    const deviceModel = device.model;

    console.log('尝试连接设备:', deviceName, deviceId);
    this.stopSearch();

    wx.showLoading({
      title: '正在连接...',
      mask: true
    });

    // 先检查是否已经连接
    wx.getBLEDeviceServices({
      deviceId: deviceId,
      success: () => {
        // 已经连接，直接使用
        console.log('设备已连接，直接使用');
        wx.hideLoading();
        
        const connectedDevice = { 
          deviceId, 
          deviceName,
          model: deviceModel,
          battery: 0
        };
        
        this.setData({ connectedDevice });
        wx.setStorageSync('pairedDevice', connectedDevice);
        
        wx.showToast({
          title: '连接成功',
          icon: 'success'
        });
        
        this.getBLEDeviceServices(deviceId);
      },
      fail: () => {
        // 未连接，开始连接
        this.createBLEConnection(deviceId, deviceName, deviceModel);
      }
    });
  },

  /**
   * 创建蓝牙低功耗连接
   */
  createBLEConnection(deviceId, deviceName, deviceModel) {
    wx.createBLEConnection({
      deviceId: deviceId,
      timeout: 15000, // 15秒超时
      success: (res) => {
        console.log('连接成功:', res);
        wx.hideLoading();
        
        const connectedDevice = { 
          deviceId, 
          deviceName,
          model: deviceModel,
          battery: 0
        };
        
        this.setData({ connectedDevice });
        
        // 保存已配对设备到本地存储
        wx.setStorageSync('pairedDevice', connectedDevice);
        
        wx.showToast({
          title: `已连接到 ${deviceName}`,
          icon: 'success',
          duration: 2000
        });
        
        // 尝试获取设备服务
        setTimeout(() => {
          this.getBLEDeviceServices(deviceId);
        }, 500);
      },
      fail: (err) => {
        console.error('连接失败:', err);
        wx.hideLoading();
        
        let errorMsg = '连接失败';
        let helpText = '';
        
        if (err.errCode === 10012) {
          errorMsg = '连接超时';
          helpText = '请确认设备在附近并已开启蓝牙';
        } else if (err.errCode === 10006) {
          errorMsg = '连接已存在';
          helpText = '设备可能已连接，请刷新页面';
        } else if (err.errCode === 10003) {
          errorMsg = '连接失败';
          helpText = '请在手机设置中允许小程序使用蓝牙';
        } else if (err.errCode === 10004) {
          errorMsg = '设备未找到';
          helpText = '请重新搜索设备';
        } else if (err.errMsg) {
          errorMsg = err.errMsg;
        }
        
        wx.showModal({
          title: errorMsg,
          content: helpText + '\n\n小程序提示：\n微信小程序不支持系统级配对，\n只支持临时连接。\n连接成功后可正常使用。',
          confirmText: '重试',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              // 重试连接
              setTimeout(() => {
                this.createBLEConnection(deviceId, deviceName, deviceModel);
              }, 500);
            }
          }
        });
      }
    });
    
    // 监听连接状态变化
    wx.onBLEConnectionStateChange((res) => {
      console.log('连接状态变化:', res);
      if (!res.connected && this.data.connectedDevice?.deviceId === res.deviceId) {
        wx.showToast({
          title: '设备已断开',
          icon: 'none'
        });
        this.setData({ 
          connectedDevice: null,
          batteryLevel: 0 
        });
      } else if (res.connected) {
        console.log('设备已连接:', res.deviceId);
      }
    });
  },

  /**
   * 获取蓝牙设备服务
   * @param {string} deviceId - 设备ID
   */
  getBLEDeviceServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId: deviceId,
      success: (res) => {
        console.log('设备服务列表:', res.services);
        
        if (res.services.length === 0) {
          console.log('该设备没有可用服务');
          return;
        }
        
        // 遍历所有服务，查找可用的特征值
        res.services.forEach(service => {
          this.getBLEDeviceCharacteristics(deviceId, service.uuid);
        });
      },
      fail: (err) => {
        console.error('获取服务失败:', err);
      }
    });
  },

  /**
   * 获取蓝牙设备特征值
   * @param {string} deviceId - 设备ID
   * @param {string} serviceId - 服务ID
   */
  getBLEDeviceCharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId: deviceId,
      serviceId: serviceId,
      success: (res) => {
        console.log(`服务 ${serviceId} 的特征值:`, res.characteristics);
        
        res.characteristics.forEach(characteristic => {
          const properties = characteristic.properties;
          const uuid = characteristic.uuid.toUpperCase();
          
          // 查找电量特征值 (UUID包含2A19)
          if (uuid.includes('2A19')) {
            console.log('找到电量特征值:', uuid);
            if (properties.read) {
              this.readBatteryLevel(deviceId, serviceId, characteristic.uuid);
            }
            if (properties.notify || properties.indicate) {
              this.notifyBatteryLevel(deviceId, serviceId, characteristic.uuid);
            }
          }
          
          // 查找可写特征值 (用于发送指令)
          if (properties.write || properties.writeNoResponse) {
            console.log('找到可写特征值:', uuid, '服务:', serviceId);
            // 保存第一个可写特征值
            if (!this.data.writeCharacteristicId) {
              this.setData({
                writeServiceId: serviceId,
                writeCharacteristicId: characteristic.uuid
              });
              
              // 同时设置到蓝牙管理器
              const deviceId = this.data.connectedDevice?.deviceId;
              if (deviceId) {
                bluetoothManager.setDeviceInfo(
                  deviceId,
                  serviceId,
                  characteristic.uuid
                );
              }
              
              console.log('设置可写特征值:', {
                serviceId: serviceId,
                characteristicId: characteristic.uuid
              });
            }
          }
          
          // 查找可通知特征值 (用于接收设备数据)
          if (properties.notify || properties.indicate) {
            console.log('找到可通知特征值:', uuid, '服务:', serviceId);
            // 保存第一个可通知特征值
            if (!this.data.notifyCharacteristicId && !uuid.includes('2A19')) {
              this.setData({
                notifyServiceId: serviceId,
                notifyCharacteristicId: characteristic.uuid
              });
              // 启用通知
              this.enableNotification(deviceId, serviceId, characteristic.uuid);
            }
          }
        });
      },
      fail: (err) => {
        console.error('获取特征值失败:', err);
      }
    });
  },

  /**
   * 读取设备电量
   * @param {string} deviceId - 设备ID
   * @param {string} serviceId - 服务ID
   * @param {string} characteristicId - 特征值ID
   */
  readBatteryLevel(deviceId, serviceId, characteristicId) {
    wx.readBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      success: (res) => {
        const batteryLevel = res.value[0];
        this.setData({ batteryLevel });
      }
    });
  },

  /**
   * 监听设备电量变化
   * @param {string} deviceId - 设备ID
   * @param {string} serviceId - 服务ID
   * @param {string} characteristicId - 特征值ID
   */
  notifyBatteryLevel(deviceId, serviceId, characteristicId) {
    wx.notifyBLECharacteristicValueChange({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      state: true,
      success: () => {
        wx.onBLECharacteristicValueChange((res) => {
          if (res.characteristicId === characteristicId) {
            const batteryLevel = res.value[0];
            this.setData({ batteryLevel });
          }
        });
      }
    });
  },

  /**
   * 断开蓝牙连接
   */
  disconnectDevice() {
    const deviceId = this.data.connectedDevice.deviceId;
    wx.closeBLEConnection({
      deviceId: deviceId,
      success: () => {
        wx.showToast({
          title: '已断开连接',
          icon: 'success'
        });
        this.setData({ connectedDevice: null, batteryLevel: 0, aiModeEnabled: false });
        wx.removeStorageSync('pairedDevice');
        // 清除蓝牙管理器信息
        bluetoothManager.clear();
      },
      fail: (err) => {
        wx.showToast({ title: '已断开连接', icon: 'success' });
        this.setData({ connectedDevice: null, batteryLevel: 0, aiModeEnabled: false });
        wx.removeStorageSync('pairedDevice');
        bluetoothManager.clear();
      }
    });
  },

  /**
   * 绑定设备
   * 将当前连接的设备添加到已绑定设备列表
   */
  bindDevice() {
    if (!this.data.connectedDevice) return;

    this.setData({ binding: true });

    const device = this.data.connectedDevice;
    let boundDevices = this.data.boundDevices;

    // 检查设备是否已绑定
    const isBound = boundDevices.some(item => item.deviceId === device.deviceId);
    if (isBound) {
      wx.showToast({
        title: '设备已绑定',
        icon: 'none'
      });
      this.setData({ binding: false });
      return;
    }

    // 添加到已绑定设备列表
    boundDevices.push(device);
    this.setData({ boundDevices });

    // 保存到本地存储
    wx.setStorageSync('boundDevices', boundDevices);

    wx.showToast({
      title: '绑定成功',
      icon: 'success'
    });
    this.setData({ binding: false });
  },

  /**
   * 解除绑定设备
   * @param {Object} e - 事件对象，包含设备索引
   */
  unbindDevice(e) {
    const index = e.currentTarget.dataset.index;
    let boundDevices = this.data.boundDevices;
    boundDevices.splice(index, 1);
    this.setData({ boundDevices });
    wx.setStorageSync('boundDevices', boundDevices);
    wx.showToast({
      title: '解除绑定成功',
      icon: 'success'
    });
  },

  /**
   * 加载系统已配对的蓝牙设备
   */
  loadSystemPairedDevices() {
    wx.getBluetoothDevices({
      success: (res) => {
        console.log('系统已配对设备列表:', res.devices);
        const systemDeviceNames = {};
        res.devices.forEach(device => {
          // 保存系统提供的设备名称
          if (device.name) {
            systemDeviceNames[device.deviceId] = device.name;
          }
        });
        this.setData({ systemDeviceNames });
        console.log('系统设备名称映射:', systemDeviceNames);
      },
      fail: (err) => {
        console.log('获取系统配对设备失败:', err);
      }
    });
  },

  /**
   * 加载自定义名称
   */
  loadCustomNames() {
    const customNames = wx.getStorageSync('deviceCustomNames') || {};
    this.setData({ customNames });
  },

  /**
   * 修改设备名称
   */
  editDeviceName(e) {
    const device = e.currentTarget.dataset.device;
    
    wx.showModal({
      title: '修改设备名称',
      editable: true,
      placeholderText: device.originalName || device.name,
      content: device.hasCustomName ? device.name : '',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const newName = res.content.trim();
          
          // 保存自定义名称
          const customNames = this.data.customNames;
          customNames[device.deviceId] = newName;
          this.setData({ customNames });
          wx.setStorageSync('deviceCustomNames', customNames);
          
          // 更新设备列表
          const devices = this.data.devices.map(d => {
            if (d.deviceId === device.deviceId) {
              return { ...d, name: newName, hasCustomName: true };
            }
            return d;
          });
          this.setData({ devices });
          
          wx.showToast({
            title: '修改成功',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 恢复设备原始名称
   */
  resetDeviceName(e) {
    const device = e.currentTarget.dataset.device;
    
    if (!device.hasCustomName) {
      wx.showToast({
        title: '已是原始名称',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认恢夏',
      content: `是否恢复为原始名称：${device.originalName}？`,
      success: (res) => {
        if (res.confirm) {
          // 删除自定义名称
          const customNames = this.data.customNames;
          delete customNames[device.deviceId];
          this.setData({ customNames });
          wx.setStorageSync('deviceCustomNames', customNames);
          
          // 更新设备列表
          const devices = this.data.devices.map(d => {
            if (d.deviceId === device.deviceId) {
              return { ...d, name: d.originalName, hasCustomName: false };
            }
            return d;
          });
          this.setData({ devices });
          
          wx.showToast({
            title: '已恢复原始名称',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 启用蓝牙通知
   * @param {string} deviceId - 设备ID
   * @param {string} serviceId - 服务ID
   * @param {string} characteristicId - 特征值ID
   */
  enableNotification(deviceId, serviceId, characteristicId) {
    wx.notifyBLECharacteristicValueChange({
      deviceId: deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      state: true,
      success: () => {
        console.log('已启用通知:', characteristicId);
        
        // 监听设备数据
        wx.onBLECharacteristicValueChange((res) => {
          if (res.characteristicId === characteristicId) {
            const value = this.ab2hex(res.value);
            console.log('接收到设备数据:', value);
            // 这里可以解析设备返回的数据
            this.handleDeviceData(value);
          }
        });
      },
      fail: (err) => {
        console.error('启用通知失败:', err);
      }
    });
  },

  /**
   * 处理设备返回的数据
   * @param {string} hexData - 十六进制数据
   */
  handleDeviceData(hexData) {
    console.log('处理设备数据:', hexData);
    // 这里可以根据协议解析设备数据
    // 例如：设备状态、传感器数据等
  },

  /**
   * 发送数据到蓝牙设备
   * @param {string} command - 命令字符串
   */
  sendDataToDevice(command) {
    const deviceId = this.data.connectedDevice?.deviceId;
    
    if (!deviceId) {
      wx.showToast({
        title: '请先连接设备',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.writeServiceId || !this.data.writeCharacteristicId) {
      wx.showToast({
        title: '设备不支持数据写入',
        icon: 'none'
      });
      return;
    }
    
    // 将命令转换为ArrayBuffer
    const buffer = this.str2ab(command);
    
    console.log('发送指令到设备:', command);
    
    wx.writeBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: this.data.writeServiceId,
      characteristicId: this.data.writeCharacteristicId,
      value: buffer,
      success: () => {
        console.log('指令发送成功:', command);
        wx.showToast({
          title: '指令已发送',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('指令发送失败:', err);
        wx.showToast({
          title: '发送失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 字符串转 ArrayBuffer
   */
  str2ab(str) {
    const buffer = new ArrayBuffer(str.length);
    const dataView = new DataView(buffer);
    for (let i = 0; i < str.length; i++) {
      dataView.setUint8(i, str.charCodeAt(i));
    }
    return buffer;
  },

  /**
   * ArrayBuffer 转十六进制字符串
   */
  ab2hex(buffer) {
    const hexArr = Array.prototype.map.call(
      new Uint8Array(buffer),
      function (bit) {
        return ('00' + bit.toString(16)).slice(-2);
      }
    );
    return hexArr.join('');
  },

  /**
   * 加载已绑定设备
   * 从本地存储中读取已绑定设备列表
   */
  loadBoundDevices() {
    const boundDevices = wx.getStorageSync('boundDevices') || [];
    this.setData({ boundDevices });
  },

  /**
   * 连接已绑定设备
   * @param {Object} e - 事件对象，包含设备信息
   */
  connectBoundDevice(e) {
    const device = e.currentTarget.dataset.device;
    this.connectDevice({ currentTarget: { dataset: { deviceId: device.deviceId, deviceName: device.deviceName } } });
  },

  /**
   * 开启蓝牙
   * 打开蓝牙适配器
   */
  openBluetooth() {
    wx.openBluetoothAdapter({
      success: () => {
        this.setData({ bluetoothEnabled: true });
      }
    });
  },

  /**
   * 切换AI增强模式
   * 保存AI模式状态到本地存储
   */
  toggleAiMode() {
    this.setData({ aiModeEnabled: !this.data.aiModeEnabled });
    wx.showToast({
      title: this.data.aiModeEnabled ? 'AI增强已开启' : 'AI增强已关闭',
      icon: 'success'
    });
    // 保存AI模式状态到本地存储
    wx.setStorageSync('aiModeEnabled', this.data.aiModeEnabled);
  },

  /**
   * 进入设置页面
   * 跳转到设置页面
   */
  onSettingsTap() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  /**
   * 页面显示时执行
   * 加载AI模式状态
   */
  onShow() {
    // 加载AI模式状态
    const aiModeEnabled = wx.getStorageSync('aiModeEnabled') || false;
    this.setData({ aiModeEnabled });
  }
});