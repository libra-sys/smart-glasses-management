// 音量控制页面
const bluetoothManager = require('../../utils/bluetooth');

Page({
  data: {
    masterVolume: 80,
    mediaVolume: 70,
    callVolume: 85,
    alertVolume: 60
  },

  onLoad() {
    this.loadVolumeSettings();
  },

  onShow() {
    // 页面显示时重新加载设置
    this.loadVolumeSettings();
  },

  // 加载音量设置
  loadVolumeSettings() {
    const masterVolume = wx.getStorageSync('masterVolume');
    const mediaVolume = wx.getStorageSync('mediaVolume');
    const callVolume = wx.getStorageSync('callVolume');
    const alertVolume = wx.getStorageSync('alertVolume');

    if (masterVolume !== undefined) {
      this.setData({
        masterVolume: masterVolume || 80,
        mediaVolume: mediaVolume || 70,
        callVolume: callVolume || 85,
        alertVolume: alertVolume || 60
      });
    }
  },

  // 主音量变化
  masterVolumeChange(e) {
    const volume = e.detail.value;
    this.setData({
      masterVolume: volume
    });
    
    // 发送BLE指令到ESP32
    bluetoothManager.setVolume(volume)
      .catch(err => {
        console.log('设备未连接，音量仅保存到本地');
      });
  },

  // 媒体音量变化
  mediaVolumeChange(e) {
    const volume = e.detail.value;
    this.setData({
      mediaVolume: volume
    });
    
    // 发送BLE指令
    bluetoothManager.setVolume(volume)
      .catch(err => {
        console.log('设备未连接');
      });
  },

  // 通话音量变化
  callVolumeChange(e) {
    this.setData({
      callVolume: e.detail.value
    });
  },

  // 提示音量变化
  alertVolumeChange(e) {
    this.setData({
      alertVolume: e.detail.value
    });
  },

  // 全部静音
  muteAll() {
    this.setData({
      masterVolume: 0,
      mediaVolume: 0,
      callVolume: 0,
      alertVolume: 0
    });
    wx.showToast({
      title: '已全部静音',
      icon: 'success'
    });
  },

  // 恢复默认
  resetAll() {
    this.setData({
      masterVolume: 80,
      mediaVolume: 70,
      callVolume: 85,
      alertVolume: 60
    });
    wx.showToast({
      title: '已恢复默认',
      icon: 'success'
    });
  },

  // 保存设置
  saveSettings() {
    const { masterVolume, mediaVolume, callVolume, alertVolume } = this.data;
    
    wx.setStorageSync('masterVolume', masterVolume);
    wx.setStorageSync('mediaVolume', mediaVolume);
    wx.setStorageSync('callVolume', callVolume);
    wx.setStorageSync('alertVolume', alertVolume);

    // 最后再发送一次确保同步
    bluetoothManager.setVolume(masterVolume)
      .then(() => {
        wx.showToast({
          title: '设置已保存并同步',
          icon: 'success'
        });
      })
      .catch(() => {
        wx.showToast({
          title: '设置已保存',
          icon: 'success'
        });
      });

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});
