/**
 * 蓝牙通信工具模块
 * 提供向连接的蓝牙设备发送指令的功能
 */

class BluetoothManager {
  constructor() {
    this.deviceId = null;
    this.serviceId = null;
    this.writeServiceId = null;
    this.writeCharacteristicId = null;
    // 按功能区分的特征值（新版固件使用）
    this.charVolumeId = null;
    this.charPowerId = null;
    this.charBatteryId = null;
    this.charStatusId = null;
  }

  /**
   * 设置连接的设备信息
   * 兼容老版本：前三个参数保持不变，第4个参数可选传入各功能特征值ID
   */
  setDeviceInfo(deviceId, writeServiceId, writeCharacteristicId, characteristicMap = {}) {
    this.deviceId = deviceId;
    this.serviceId = writeServiceId;
    this.writeServiceId = writeServiceId;
    this.writeCharacteristicId = writeCharacteristicId;

    this.charVolumeId = characteristicMap.charVolumeId || null;
    this.charPowerId = characteristicMap.charPowerId || null;
    this.charBatteryId = characteristicMap.charBatteryId || null;
    this.charStatusId = characteristicMap.charStatusId || null;

    console.log('设置设备信息:', {
      deviceId,
      writeServiceId,
      writeCharacteristicId,
      characteristicMap
    });
  }

  /**
   * 发送指令到设备（旧协议：字符串/JSON 通道）
   * 保留作为回退方案
   */
  sendCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.deviceId) {
        const error = '未连接设备';
        console.error(error);
        if (!options.silent) {
          wx.showToast({
            title: error,
            icon: 'none'
          });
        }
        reject(error);
        return;
      }

      if (!this.writeServiceId || !this.writeCharacteristicId) {
        const error = '设备不支持数据写入';
        console.error(error);
        if (!options.silent) {
          wx.showToast({
            title: error,
            icon: 'none'
          });
        }
        reject(error);
        return;
      }

      const buffer = this.str2ab(command);
      console.log('发送指令:', command);

      wx.writeBLECharacteristicValue({
        deviceId: this.deviceId,
        serviceId: this.writeServiceId,
        characteristicId: this.writeCharacteristicId,
        value: buffer,
        success: () => {
          console.log('指令发送成功:', command);
          if (options.showToast) {
            wx.showToast({
              title: '指令已发送',
              icon: 'success'
            });
          }
          resolve();
        },
        fail: (err) => {
          console.error('指令发送失败:', err);
          if (!options.silent) {
            wx.showToast({
              title: '发送失败',
              icon: 'none'
            });
          }
          reject(err);
        }
      });
    });
  }

  /**
   * 发送JSON数据到设备
   * @param {object} data - JSON对象
   */
  sendJSON(data, options = {}) {
    const jsonString = JSON.stringify(data);
    return this.sendCommand(jsonString, options);
  }

  /**
   * 发送单字节到指定特征值（新版固件：音量/电源/电量等）
   */
  writeByteCharacteristic(characteristicId, value, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.deviceId || !this.serviceId || !characteristicId) {
        const error = '蓝牙特征值未就绪';
        console.error(error);
        if (!options.silent) {
          wx.showToast({
            title: error,
            icon: 'none'
          });
        }
        reject(error);
        return;
      }

      const buffer = new ArrayBuffer(1);
      const view = new DataView(buffer);
      view.setUint8(0, value & 0xff);

      wx.writeBLECharacteristicValue({
        deviceId: this.deviceId,
        serviceId: this.serviceId,
        characteristicId,
        value: buffer,
        success: () => {
          console.log('写入成功 byte', value, '->', characteristicId);
          resolve();
        },
        fail: (err) => {
          console.error('写入失败:', err);
          if (!options.silent) {
            wx.showToast({
              title: '发送失败',
              icon: 'none'
            });
          }
          reject(err);
        }
      });
    });
  }

  /**
   * 查询设备电量
   */
  getBattery() {
    if (this.charBatteryId) {
      // 直接读取电量特征值，具体解析在监听回调里处理
      return new Promise((resolve, reject) => {
        if (!this.deviceId || !this.serviceId) {
          const error = '未连接设备';
          console.error(error);
          reject(error);
          return;
        }
        wx.readBLECharacteristicValue({
          deviceId: this.deviceId,
          serviceId: this.serviceId,
          characteristicId: this.charBatteryId,
          success: resolve,
          fail: reject
        });
      });
    }
    // 旧协议回退
    return this.sendJSON({ cmd: 'GET_BATTERY' }, { silent: true });
  }

  /**
   * 设备关机
   */
  powerOff() {
    if (this.charPowerId) {
      // 固件约定: 0 = 关机, 1 = 开机
      return this.writeByteCharacteristic(this.charPowerId, 0);
    }
    // 旧协议回退
    return this.sendJSON({ cmd: 'POWER_OFF' });
  }

  /**
   * 设置音量 (0-100)
   */
  setVolume(value) {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    if (this.charVolumeId) {
      return this.writeByteCharacteristic(this.charVolumeId, v);
    }
    // 旧协议回退
    return this.sendJSON({ cmd: 'SET_VOLUME', value: v });
  }

  /**
   * 设置亮度 (0-100)
   */
  setBrightness(value) {
    const v = Math.max(0, Math.min(100, Number(value) || 0));
    return this.sendJSON({ cmd: 'SET_BRIGHTNESS', value: v });
  }

  /**
   * 查询设备状态
   */
  getStatus() {
    return this.sendJSON({ cmd: 'GET_STATUS' }, { silent: true });
  }

  /**
   * 字符串转ArrayBuffer
   */
  str2ab(str) {
    const buffer = new ArrayBuffer(str.length);
    const dataView = new DataView(buffer);
    for (let i = 0; i < str.length; i++) {
      dataView.setUint8(i, str.charCodeAt(i));
    }
    return buffer;
  }

  /**
   * 清除设备信息
   */
  clear() {
    this.deviceId = null;
    this.serviceId = null;
    this.writeServiceId = null;
    this.writeCharacteristicId = null;
    this.charVolumeId = null;
    this.charPowerId = null;
    this.charBatteryId = null;
    this.charStatusId = null;
  }
}

// 创建单例
const bluetoothManager = new BluetoothManager();

module.exports = bluetoothManager;
