// 功能组件页面
Page({
  data: {
    installedPlugins: [
      {
        id: 1,
        name: '实时翻译',
        description: '多语言实时翻译功能',
        icon: '🌐',
        color: 'blue-bg',
        enabled: true
      },
      {
        id: 2,
        name: '导航助手',
        description: 'AR导航与路线规划',
        icon: '🗺️',
        color: 'green-bg',
        enabled: true
      },
      {
        id: 3,
        name: '健康监测',
        description: '心率、步数等健康数据',
        icon: '❤️',
        color: 'red-bg',
        enabled: false
      }
    ],
    recommendPlugins: [
      {
        id: 4,
        name: '语音助手',
        description: '智能语音交互助手',
        icon: '🎤',
        color: 'purple-bg'
      },
      {
        id: 5,
        name: '拍照识物',
        description: 'AI物体识别与分析',
        icon: '📸',
        color: 'orange-bg'
      },
      {
        id: 6,
        name: '天气预报',
        description: '实时天气信息推送',
        icon: '☁️',
        color: 'cyan-bg'
      }
    ]
  },

  onLoad() {
    this.loadPluginSettings();
  },

  // 加载组件设置
  loadPluginSettings() {
    const installedPlugins = wx.getStorageSync('installedPlugins');
    if (installedPlugins) {
      this.setData({ installedPlugins });
    }
  },

  // 切换组件开关
  togglePlugin(e) {
    const id = e.currentTarget.dataset.id;
    const { installedPlugins } = this.data;
    
    const updatedPlugins = installedPlugins.map(plugin => {
      if (plugin.id === id) {
        return { ...plugin, enabled: e.detail.value };
      }
      return plugin;
    });

    this.setData({ installedPlugins: updatedPlugins });
    wx.setStorageSync('installedPlugins', updatedPlugins);

    wx.showToast({
      title: e.detail.value ? '已启用' : '已禁用',
      icon: 'success'
    });
  },

  // 安装组件
  installPlugin(e) {
    const id = e.currentTarget.dataset.id;
    const { recommendPlugins, installedPlugins } = this.data;
    
    const plugin = recommendPlugins.find(p => p.id === id);
    if (!plugin) return;

    wx.showLoading({ title: '安装中...' });

    setTimeout(() => {
      const newPlugin = { ...plugin, enabled: true };
      const updatedInstalled = [...installedPlugins, newPlugin];
      const updatedRecommend = recommendPlugins.filter(p => p.id !== id);

      this.setData({
        installedPlugins: updatedInstalled,
        recommendPlugins: updatedRecommend
      });

      wx.setStorageSync('installedPlugins', updatedInstalled);

      wx.hideLoading();
      wx.showToast({
        title: '安装成功',
        icon: 'success'
      });
    }, 1500);
  }
});
