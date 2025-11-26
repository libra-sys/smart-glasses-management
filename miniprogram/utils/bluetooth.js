/**
 * 蓝牙通信工具模块
 * 提供向连接的蓝牙设备发送指令的功能
 */

class BluetoothManager {
  constructor() {
    this.deviceId = null;
    this.writeServiceId = null;
    this.writeCharacteristicId = null;
  }

  /**
   * 设置连接的设备信息
   */
  setDeviceInfo(deviceId, writeServiceId, writeCharacteristicId) {
    this.deviceId = deviceId;
    this.writeServiceId = writeServiceId;
    this.writeCharacteristicId = writeCharacteristicId;
    console.log('设置设备信息:', {
      deviceId,
      writeServiceId,
      writeCharacteristicId
    });
  }

  /**
   * 发送指令到设备
   * @param {string} command - 指令字符串
   * @param {object} options - 配置选项
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
    this.writeServiceId = null;
    this.writeCharacteristicId = null;
  }
}

// 创建单例
const bluetoothManager = new BluetoothManager();

module.exports = bluetoothManager;
