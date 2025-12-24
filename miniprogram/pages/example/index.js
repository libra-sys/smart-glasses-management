Page({
  data: {
    initStatus: '等待初始化',
    initResult: ''
  },

  // 一键初始化云数据库
  initDatabase() {
    this.setData({ 
      initStatus: '正在初始化...',
      initResult: ''
    });

    wx.showLoading({ title: '正在初始化数据库...', mask: true });

    wx.cloud.callFunction({
      name: 'initDatabase'
    }).then(res => {
      wx.hideLoading();
      console.log('初始化结果:', res.result);
      
      if (res.result.success) {
        this.setData({
          initStatus: '初始化成功 ✅',
          initResult: JSON.stringify(res.result.results, null, 2)
        });
        
        wx.showModal({
          title: '初始化成功',
          content: '数据库已创建并填充数据\n' + 
                   res.result.results.map(r => 
                     `${r.collection}: ${r.count || 1}条`
                   ).join('\n'),
          showCancel: false
        });
      } else {
        this.setData({
          initStatus: '初始化失败 ❌',
          initResult: res.result.error
        });
        
        wx.showModal({
          title: '初始化失败',
          content: res.result.error,
          showCancel: false
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('初始化失败:', err);
      
      this.setData({
        initStatus: '初始化失败 ❌',
        initResult: err.errMsg
      });
      
      wx.showModal({
        title: '初始化失败',
        content: err.errMsg,
        showCancel: false
      });
    });
  }
});
