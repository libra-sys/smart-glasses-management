// 音量控制页面
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
    this.setData({
      masterVolume: e.detail.value
    });
  },

  // 媒体音量变化
  mediaVolumeChange(e) {
    this.setData({
      mediaVolume: e.detail.value
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

    wx.showToast({
      title: '设置已保存',
      icon: 'success'
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});
