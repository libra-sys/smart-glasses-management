const GlassesServerAPI = require('../../utils/glasses-server-api.js');

Page({
  data: {
    currentMode: 'IDLE',
    modes: [
      {
        id: 'blind_path',
        name: '盲道导航',
        icon: '🦯',
        description: '实时盲道分割+避障+转弯提醒',
        color: '#007AFF'
      },
      {
        id: 'crosswalk',
        name: '过马路',
        icon: '🚦',
        description: '红绿灯检测+斑马线引导',
        color: '#34C759'
      },
      {
        id: 'item_search',
        name: '寻物',
        icon: '🔍',
        description: '语音指定物品+视觉检测',
        color: '#FF9500',
        needsInput: true
      },
      {
        id: 'traffic_light',
        name: '红绿灯',
        icon: '🚥',
        description: '仅红绿灯状态检测',
        color: '#FF3B30'
      },
      {
        id: 'chat',
        name: '对话',
        icon: '💬',
        description: '自由对话模式',
        color: '#5856D6'
      },
      {
        id: 'idle',
        name: '停止导航',
        icon: '⏸️',
        description: '关闭所有导航功能',
        color: '#8E8E93'
      }
    ],
    searchItem: '',
    showSearchInput: false
  },

  onLoad() {
    this.getCurrentMode();
  },

  onShow() {
    this.getCurrentMode();
  },

  // 获取当前模式
  getCurrentMode() {
    GlassesServerAPI.getModeStatus()
      .then(data => {
        if (data.success) {
          this.setData({ currentMode: data.mode });
        }
      })
      .catch(err => {
        console.error('获取模式失败:', err);
      });
  },

  // 切换模式
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    const modeInfo = this.data.modes.find(m => m.id === mode);
    
    if (!modeInfo) return;

    // 如果是寻物模式，显示输入框
    if (modeInfo.needsInput) {
      this.setData({ showSearchInput: true });
      return;
    }

    this.confirmSwitchMode(mode);
  },

  // 确认切换模式
  confirmSwitchMode(mode, targetItem = '') {
    wx.showLoading({ title: '切换中...' });

    GlassesServerAPI.switchMode({
      mode: mode,
      target_item: targetItem
    })
      .then(data => {
        wx.hideLoading();
        if (data.success) {
          // 切换成功后重新获取当前模式
          this.getCurrentMode();
          this.setData({ 
            showSearchInput: false,
            searchItem: ''
          });
          wx.showToast({
            title: data.message,
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: data.message || data.error || '切换失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        wx.showToast({
          title: '切换失败',
          icon: 'none'
        });
        console.error('模式切换失败:', err);
      });
  },

  // 输入物品名称
  onSearchInput(e) {
    this.setData({ searchItem: e.detail.value });
  },

  // 确认寻物
  confirmSearch() {
    const item = this.data.searchItem.trim();
    if (!item) {
      wx.showToast({
        title: '请输入物品名称',
        icon: 'none'
      });
      return;
    }
    this.confirmSwitchMode('item_search', item);
  },

  // 取消寻物输入
  cancelSearch() {
    this.setData({ 
      showSearchInput: false,
      searchItem: ''
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，仅用于阻止冒泡
  }
});
