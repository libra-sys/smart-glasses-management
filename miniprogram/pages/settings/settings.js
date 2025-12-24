// settings.js - 设置页面，用于管理应用程序的各项设置
// 主要功能：AI增强模式控制、其他设置项管理
Page({  
  data: {
    aiModeEnabled: false,
    isLoggedIn: false,
    userInfo: {}
  },

  /**
   * 页面加载时执行的初始化函数
   * @description 加载AI模式开关状态并初始化页面数据
   */
  onLoad() {
    const aiModeEnabled = wx.getStorageSync('aiModeEnabled') || false;
    const isLoggedIn = wx.getStorageSync('isLoggedIn') || false;
    const userInfo = wx.getStorageSync('userInfo') || {};
    
    this.setData({ 
      aiModeEnabled,
      isLoggedIn,
      userInfo 
    });
  },

  /**
   * 切换AI增强模式开关状态
   * @description 切换AI增强模式的开关状态，并将新状态保存到本地存储
   * @returns {void} 无返回值
   */
  toggleAiMode() {
    // 计算新的AI模式状态
    const newAiMode = !this.data.aiModeEnabled;
    // 更新页面数据
    this.setData({ aiModeEnabled: newAiMode });
    // 显示操作结果提示
    wx.showToast({
      title: newAiMode ? 'AI增强已开启' : 'AI增强已关闭',
      icon: 'success'
    });
    // 保存新的AI模式状态到本地存储
    wx.setStorageSync('aiModeEnabled', newAiMode);
  },

  /**
   * 返回上一页
   * @description 导航返回上一个页面
   * @returns {void} 无返回值
   */
  goBack() {
    wx.navigateBack();
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录信息
          wx.removeStorageSync('isLoggedIn');
          wx.removeStorageSync('userInfo');
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });

          // 跳转到登录页
          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/login/login'
            });
          }, 1500);
        }
      }
    });
  },

  // 编辑个人信息
  editProfile() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新的昵称',
      content: this.data.userInfo.username || '',
      success: (res) => {
        if (res.confirm && res.content) {
          const newUsername = res.content.trim();
          if (newUsername) {
            const updatedUserInfo = {
              ...this.data.userInfo,
              username: newUsername
            };
            
            this.setData({ userInfo: updatedUserInfo });
            wx.setStorageSync('userInfo', updatedUserInfo);
            
            wx.showToast({
              title: '修改成功',
              icon: 'success'
            });
          }
        }
      }
    });
  },

  // 修改头像
  changeAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        const updatedUserInfo = {
          ...this.data.userInfo,
          avatar: tempFilePath
        };
        
        this.setData({ userInfo: updatedUserInfo });
        wx.setStorageSync('userInfo', updatedUserInfo);
        
        wx.showToast({
          title: '头像修改成功',
          icon: 'success'
        });
      }
    });
  },

  // 关于我们
  aboutUs() {
    wx.showToast({
      title: '镜控智联 v1.0.0',
      icon: 'none'
    });
  }
});