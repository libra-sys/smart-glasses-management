const { UserAPI } = require('../../utils/api.js');

Page({
  data: {
    isLogin: true,
    phone: '',
    password: '',
    username: '',
    confirmPassword: '',
    email: ''
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

  onEmailInput(e) {
    this.setData({ email: e.detail.value });
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
    const { email, phone, password } = this.data;
    
    let loginEmail = email || phone;
    if (!loginEmail) {
      wx.showToast({
        title: '请输入邮箱或手机号',
        icon: 'none'
      });
      return;
    }

    // 如果是手机号，转换为邮箱格式
    if (/^1[3-9]\d{9}$/.test(loginEmail)) {
      loginEmail = loginEmail + '@aiglasses.local';
    } else if (!loginEmail.includes('@')) {
      // 如果不是邮箱格式，自动添加域名
      loginEmail = loginEmail + '@aiglasses.local';
    }

    if (!password || password.length < 6) {
      wx.showToast({
        title: '请输入密码（6位以上）',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '登录中...' });
    
    UserAPI.login(loginEmail, password)
      .then(res => {
        wx.hideLoading();
        console.log('登录结果：', res);
        
        if (res.success) {
          wx.setStorageSync('isLoggedIn', true);
          wx.setStorageSync('userInfo', {
            id: res.userId,
            email: res.email,
            username: res.username || loginEmail
          });

          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });

          setTimeout(() => {
            wx.reLaunch({
              url: '/pages/index/index'
            });
          }, 1500);
        } else {
          wx.showToast({
            title: res.message || '登录失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
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
    const { username, email, phone, password, confirmPassword } = this.data;

    if (!username || username.length < 2) {
      wx.showToast({
        title: '请输入用户名（至少2个字符）',
        icon: 'none'
      });
      return;
    }

    let registerEmail = email || phone;
    if (!registerEmail) {
      wx.showToast({
        title: '请输入邮箱或手机号',
        icon: 'none'
      });
      return;
    }

    // 如果是手机号，转换为邮箱格式
    if (/^1[3-9]\d{9}$/.test(registerEmail)) {
      registerEmail = registerEmail + '@aiglasses.local';
    } else if (!registerEmail.includes('@')) {
      // 如果不是邮箱格式，自动添加域名
      registerEmail = registerEmail + '@aiglasses.local';
    }

    if (!password || password.length < 6 || password.length > 16) {
      wx.showToast({
        title: '密码长度应为6-16位',
        icon: 'none'
      });
      return;
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码输入不一致',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '注册中...' });
    
    UserAPI.register(registerEmail, password, username)
      .then(res => {
        wx.hideLoading();
        console.log('注册结果：', res);
        
        if (res.success) {
          wx.showToast({
            title: '注册成功',
            icon: 'success'
          });

          setTimeout(() => {
            this.setData({ 
              isLogin: true,
              password: '',
              confirmPassword: ''
            });
          }, 1500);
        } else {
          wx.showToast({
            title: res.message || '注册失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
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
    // 先获取用户信息（必须在按钮点击事件中直接调用）
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const { nickName, avatarUrl } = res.userInfo;
        console.log('用户信息：', nickName, avatarUrl);
        
        wx.showLoading({ title: '登录中...' });
        
        // 调用云函数登录
        wx.cloud.callFunction({
          name: 'quickstartFunctions',
          data: {
            type: 'wechatLogin',
            data: {
              userInfo: res.userInfo
            }
          }
        }).then(cloudRes => {
          wx.hideLoading();
          console.log('微信登录结果：', cloudRes.result);
          
          if (cloudRes.result.success) {
            const userData = cloudRes.result.data;
            wx.setStorageSync('isLoggedIn', true);
            wx.setStorageSync('userInfo', {
              id: userData.userId,
              email: `wx_${userData.userId}@aiglasses.local`
            });

            wx.showToast({
              title: '登录成功',
              icon: 'success'
            });

            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/index/index'
              });
            }, 1500);
          } else {
            wx.showToast({
              title: cloudRes.result.message || '登录失败',
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
        wx.showToast({
          title: '取消授权',
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
