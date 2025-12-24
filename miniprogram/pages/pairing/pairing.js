const bluetoothManager = require('../../utils/bluetooth');

Page({
  data: {
    scanning: false,
    devices: [],
    connectedDevice: null,
    batteryLevel: null
  },

  onLoad() {
    this.checkBluetoothAdapter();
    this.loadConnectedDevice();
  },

  onUnload() {
    this.stopScan();
  },

  checkBluetoothAdapter() {
    wx.getBluetoothAdapterState({
      success: (res) => {
        if (!res.available) {
          wx.showModal({
            title: '蓝牙不可用',
            content: '请打开手机蓝牙后重试',
            showCancel: false
          });
        }
      },
      fail: () => {
        wx.openBluetoothAdapter({
          success: () => {
            console.log('蓝牙适配器初始化成功');
          },
          fail: (err) => {
            console.error('蓝牙适配器初始化失败:', err);
            wx.showToast({
              title: '蓝牙初始化失败',
              icon: 'none'
            });
          }
        });
      }
    });
  },

  loadConnectedDevice() {
    const device = wx.getStorageSync('connectedGlasses');
    if (device) {
      this.setData({ connectedDevice: device });
    }
  },

  startScan() {
    this.setData({ 
      scanning: true,
      devices: []
    });

    wx.openBluetoothAdapter({
      success: () => {
        this.listenDeviceFound();
        
        wx.startBluetoothDevicesDiscovery({
          services: [],
          allowDuplicatesKey: false,
          success: () => {
            console.log('开始扫描蓝牙设备');
            setTimeout(() => {
              this.stopScan();
            }, 10000);
          },
          fail: (err) => {
            console.error('扫描失败:', err);
            this.setData({ scanning: false });
            wx.showToast({
              title: '扫描失败',
              icon: 'none'
            });
          }
        });
      },
      fail: (err) => {
        console.error('打开蓝牙适配器失败:', err);
        this.setData({ scanning: false });
        wx.showToast({
          title: '蓝牙不可用',
          icon: 'none'
        });
      }
    });
  },

  listenDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      res.devices.forEach((device) => {
        if (!device.name || !device.advertisData) return;
        
        const name = device.name.toLowerCase();
        if (name.includes('aiglasses') || 
            name.includes('esp32') || 
            name.includes('glasses')) {
          
          const exists = this.data.devices.find(d => d.deviceId === device.deviceId);
          if (!exists) {
            this.setData({
              devices: [...this.data.devices, {
                deviceId: device.deviceId,
                name: device.name,
                rssi: device.RSSI
              }]
            });
          }
        }
      });
    });
  },

  stopScan() {
    wx.stopBluetoothDevicesDiscovery({
      success: () => {
        console.log('停止扫描');
        this.setData({ scanning: false });
      }
    });
  },

  connectDevice(e) {
    const { device } = e.currentTarget.dataset;
    
    wx.showLoading({ title: '连接中...' });

    wx.createBLEConnection({
      deviceId: device.deviceId,
      success: () => {
        console.log('连接成功');
        this.getBLEServices(device);
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('连接失败:', err);
        wx.showToast({
          title: '连接失败',
          icon: 'none'
        });
      }
    });
  },

  getBLEServices(device) {
    wx.getBLEDeviceServices({
      deviceId: device.deviceId,
      success: (res) => {
        console.log('服务列表:', res.services);
        
        const uartService = res.services.find(s => 
          s.uuid.toUpperCase().includes('4FAFC201') || 
          s.uuid.toUpperCase().includes('FFE0') || 
          s.uuid.toUpperCase().includes('6E400001')
        );

        if (uartService) {
          this.getBLECharacteristics(device, uartService.uuid);
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '设备不支持',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取服务失败:', err);
      }
    });
  },

  getBLECharacteristics(device, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId: device.deviceId,
      serviceId: serviceId,
      success: (res) => {
        console.log('特征值列表:', res.characteristics);
        
        const characteristics = res.characteristics || [];
        const findByUuidPart = (part) => characteristics.find(c => c.uuid && c.uuid.toUpperCase().includes(part));

        // 对应固件中的四个特征值
        const volumeChar  = findByUuidPart('BEB5483E-36E1-4688-B7F5-EA07361B26A8');
        const powerChar   = findByUuidPart('BEB5483E-36E1-4688-B7F5-EA07361B26A9');
        const batteryChar = findByUuidPart('BEB5483E-36E1-4688-B7F5-EA07361B26AA');
        const statusChar  = findByUuidPart('BEB5483E-36E1-4688-B7F5-EA07361B26AB');
        
        // 写入特征优先用音量/电源，没有就退回到任意可写特征
        const writeChar = volumeChar || powerChar || characteristics.find(c => 
          c.properties.write || c.properties.writeNoResponse
        );
        // 通知特征优先用电量，没有就退回到任意支持 notify 的特征
        const notifyChar = batteryChar || characteristics.find(c => 
          c.properties.notify || c.properties.indicate
        );

        if (writeChar) {
          bluetoothManager.setDeviceInfo(
            device.deviceId,
            serviceId,
            writeChar.uuid,
            {
              charVolumeId: volumeChar?.uuid,
              charPowerId: powerChar?.uuid,
              charBatteryId: batteryChar?.uuid,
              charStatusId: statusChar?.uuid
            }
          );

          if (notifyChar) {
            this.enableNotify(device.deviceId, serviceId, notifyChar.uuid);
          }

          this.saveConnection(device, serviceId, writeChar.uuid, notifyChar?.uuid);
          wx.hideLoading();
          wx.showToast({
            title: '配对成功',
            icon: 'success'
          });
          
          this.setData({ connectedDevice: device });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '设备不支持写入',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取特征值失败:', err);
      }
    });
  },

  enableNotify(deviceId, serviceId, characteristicId) {
    wx.notifyBLECharacteristicValueChange({
      deviceId,
      serviceId,
      characteristicId,
      state: true,
      success: () => {
        console.log('启用通知成功');
        this.listenValueChange();
      }
    });
  },

  listenValueChange() {
    wx.onBLECharacteristicValueChange((res) => {
      // 如果是电量特征值，按照单字节数值解析
      if (bluetoothManager.charBatteryId && res.characteristicId &&
          res.characteristicId.toLowerCase() === bluetoothManager.charBatteryId.toLowerCase()) {
        const dataView = new DataView(res.value);
        const level = dataView.getUint8(0);
        console.log('收到电量(Byte):', level);
        this.setData({ batteryLevel: level });
        return;
      }

      const value = this.ab2str(res.value);
      console.log('收到数据:', value);
      
      try {
        const data = JSON.parse(value);
        if (data.battery !== undefined) {
          this.setData({ batteryLevel: data.battery });
        }
      } catch (e) {
        console.log('非JSON数据:', value);
      }
    });
  },

  saveConnection(device, serviceId, writeCharId, notifyCharId) {
    const connectionInfo = {
      deviceId: device.deviceId,
      name: device.name,
      serviceId,
      writeCharId,
      notifyCharId,
      connectedAt: new Date().toISOString()
    };
    
    wx.setStorageSync('connectedGlasses', connectionInfo);
  },

  disconnectDevice() {
    if (!this.data.connectedDevice) return;

    wx.closeBLEConnection({
      deviceId: this.data.connectedDevice.deviceId,
      success: () => {
        bluetoothManager.clear();
        wx.removeStorageSync('connectedGlasses');
        this.setData({ 
          connectedDevice: null,
          batteryLevel: null
        });
        wx.showToast({
          title: '已断开连接',
          icon: 'success'
        });
      }
    });
  },

  ab2str(buffer) {
    return String.fromCharCode.apply(null, new Uint8Array(buffer));
  }
});
