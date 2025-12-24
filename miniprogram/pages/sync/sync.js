Page({
  data: {
    syncing: false,
    lastSyncTime: null,
    autoSync: false,
    syncInterval: null
  },

  onLoad() {
    const lastSync = wx.getStorageSync('lastSyncTime');
    if (lastSync) {
      this.setData({ lastSyncTime: lastSync });
    }
  },

  onUnload() {
    this.stopAutoSync();
  },

  // 手动同步一次
  syncNow() {
    this.setData({ syncing: true });
    
    wx.cloud.callFunction({
      name: 'dashboardAPI',
      data: { type: 'syncToDashboard' }
    }).then(res => {
      console.log('同步结果:', res.result);
      
      if (res.result.success) {
        const now = new Date().toLocaleString();
        this.setData({
          syncing: false,
          lastSyncTime: now
        });
        wx.setStorageSync('lastSyncTime', now);
        
        wx.showToast({
          title: '同步成功',
          icon: 'success'
        });
      } else {
        this.setData({ syncing: false });
        wx.showToast({
          title: '同步失败: ' + res.result.error,
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('同步失败:', err);
      this.setData({ syncing: false });
      wx.showToast({
        title: '同步失败',
        icon: 'none'
      });
    });
  },

  // 开启自动同步（每分钟一次）
  toggleAutoSync(e) {
    const enabled = e.detail.value;
    this.setData({ autoSync: enabled });
    
    if (enabled) {
      this.startAutoSync();
      wx.showToast({
        title: '已开启自动同步',
        icon: 'success'
      });
    } else {
      this.stopAutoSync();
      wx.showToast({
        title: '已关闭自动同步',
        icon: 'none'
      });
    }
  },

  startAutoSync() {
    // 立即执行一次
    this.syncNow();
    
    // 每60秒同步一次
    this.data.syncInterval = setInterval(() => {
      this.syncNow();
    }, 60000);
  },

  stopAutoSync() {
    if (this.data.syncInterval) {
      clearInterval(this.data.syncInterval);
      this.setData({ syncInterval: null });
    }
  }
});
