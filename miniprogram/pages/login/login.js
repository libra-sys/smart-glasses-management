// login.js
Page({
  data: {
    isLogin: true, // 是否为登录模式
    phone: '',
    password: '',
    username: '',
    confirmPassword: ''
  },

  // 切换到登录
  switchToLogin() {
    this.setData({ isLogin: true });
  },

  // 切换到注册
  switchToRegister() {
    this.setData({ isLogin: false });
  },

  // 输入事件
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value });
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  // 登录
  handleLogin() {
    const { phone, password } = this.data;
    
    // 验证手机号
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    // 验证密码
    if (!password || password.length < 6) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }

    // 调用云函数登录
    wx.showLoading({ title: '登录中...' });
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'userLogin',
        data: {
          phone: phone,
          password: password
        }
      }
    }).then(res => {
      wx.hideLoading();
      console.log('登录结果：', res);
      
      if (res.result.success) {
        // 保存登录状态
        wx.setStorageSync('isLoggedIn', true);
        wx.setStorageSync('userInfo', res.result.data);

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });

        // 跳转到首页
        setTimeout(() => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }, 1500);
      } else {
        wx.showToast({
          title: res.result.message || '登录失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('登录失败：', err);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    });
  },

  // 注册
  handleRegister() {
    const { username, phone, password, confirmPassword } = this.data;

    // 验证用户名
    if (!username || username.length < 2) {
      wx.showToast({
        title: '请输入用户名（至少2个字符）',
        icon: 'none'
      });
      return;
    }

    // 验证手机号
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    // 验证密码
    if (!password || password.length < 6 || password.length > 16) {
      wx.showToast({
        title: '密码长度应为6-16位',
        icon: 'none'
      });
      return;
    }

    // 验证密码一致性
    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码输入不一致',
        icon: 'none'
      });
      return;
    }

    // 调用云函数注册
    wx.showLoading({ title: '注册中...' });
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'userRegister',
        data: {
          username: username,
          phone: phone,
          password: password
        }
      }
    }).then(res => {
      wx.hideLoading();
      console.log('注册结果：', res);
      
      if (res.result.success) {
        wx.showToast({
          title: '注册成功',
          icon: 'success'
        });

        // 自动切换到登录
        setTimeout(() => {
          this.setData({ 
            isLogin: true,
            password: '',
            confirmPassword: ''
          });
        }, 1500);
      } else {
        wx.showToast({
          title: res.result.message || '注册失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('注册失败：', err);
      wx.showToast({
        title: '注册失败，请重试',
        icon: 'none'
      });
    });
  },

  // 微信一键登录
  handleWechatLogin() {
    wx.showLoading({ title: '登录中...' });
    
    // 获取微信用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log('用户信息：', res.userInfo);
        
        // 调用云函数微信登录
        wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'wechatLogin',
            data: {
              userInfo: res.userInfo
            }
          }
        }).then(result => {
          wx.hideLoading();
          console.log('微信登录结果：', result);
          
          if (result.result.success) {
            // 保存登录状态
            wx.setStorageSync('isLoggedIn', true);
            wx.setStorageSync('userInfo', result.result.data);

            wx.showToast({
              title: '登录成功',
              icon: 'success'
            });

            // 跳转到首页
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/index/index'
              });
            }, 1500);
          } else {
            wx.showToast({
              title: result.result.message || '登录失败',
              icon: 'none'
            });
          }
        }).catch(err => {
          wx.hideLoading();
          console.error('微信登录失败：', err);
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          });
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '登录取消',
          icon: 'none'
        });
      }
    });
  },

  // 忘记密码
  forgetPassword() {
    wx.showToast({
      title: '请联系管理员重置密码',
      icon: 'none'
    });
  }
});
