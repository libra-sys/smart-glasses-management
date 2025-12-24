Page({
  data: {
    configMode: 'scan', // 'scan' | 'manual'
    scanning: false,
    discoveredServers: [],
    
    // 手动输入
    serverIp: '',
    serverPort: '8081',
    serverName: '',
    
    // 当前连接的服务器
    connectedServer: null
  },

  onLoad() {
    this.loadConnectedServer();
  },

  loadConnectedServer() {
    const server = wx.getStorageSync('glassesServer');
    if (server) {
      this.setData({ connectedServer: server });
    }
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ configMode: mode });
  },

  // ========== 扫描模式 ==========
  
  startScan() {
    this.setData({ 
      scanning: true,
      discoveredServers: []
    });

    wx.showLoading({ title: '扫描中...', mask: true });

    // 获取本机网络信息
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType === 'wifi') {
          this.scanLocalNetwork();
        } else {
          wx.hideLoading();
          wx.showModal({
            title: '提示',
            content: '请连接WiFi后再扫描',
            showCancel: false
          });
          this.setData({ scanning: false });
        }
      }
    });
  },

  scanLocalNetwork() {
    // 常见的局域网段
    const prefixes = ['192.168.1.', '192.168.0.', '192.168.31.', '10.0.0.'];
    const promises = [];
    
    prefixes.forEach(prefix => {
      for (let i = 1; i <= 254; i++) {
        const ip = prefix + i;
        promises.push(this.checkServer(ip));
      }
    });

    Promise.allSettled(promises).then(() => {
      wx.hideLoading();
      this.setData({ scanning: false });
      
      if (this.data.discoveredServers.length === 0) {
        wx.showModal({
          title: '未发现服务器',
          content: '请确认:\n1. 服务器已启动\n2. 在同一WiFi网络\n3. 防火墙已开放8081端口',
          showCancel: false
        });
      }
    });
  },

  checkServer(ip) {
    return new Promise((resolve) => {
      wx.request({
        url: `http://${ip}:8081/api/miniapp/discover`,
        timeout: 800,
        success: (res) => {
          if (res.data && res.data.service === 'AIGlasses Server') {
            console.log('发现服务器:', ip, res.data);
            
            this.setData({
              discoveredServers: [...this.data.discoveredServers, {
                ip: ip,
                port: 8081,
                name: res.data.name,
                version: res.data.version,
                capabilities: res.data.capabilities
              }]
            });
            
            resolve(res.data);
          } else {
            resolve(null);
          }
        },
        fail: () => resolve(null)
      });
    });
  },

  connectScannedServer(e) {
    const server = e.currentTarget.dataset.server;
    this.saveServerConfig(server);
  },

  // ========== 手动输入模式 ==========

  onIpInput(e) {
    this.setData({ serverIp: e.detail.value });
  },

  onPortInput(e) {
    this.setData({ serverPort: e.detail.value });
  },

  onNameInput(e) {
    this.setData({ serverName: e.detail.value });
  },

  connectManual() {
    const { serverIp, serverPort, serverName } = this.data;

    if (!serverIp) {
      wx.showToast({
        title: '请输入服务器IP',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '连接中...' });

    wx.request({
      url: `http://${serverIp}:${serverPort}/api/miniapp/discover`,
      timeout: 3000,
      success: (res) => {
        wx.hideLoading();
        
        if (res.data && res.data.service === 'AIGlasses Server') {
          this.saveServerConfig({
            ip: serverIp,
            port: serverPort,
            name: serverName || res.data.name,
            version: res.data.version,
            capabilities: res.data.capabilities
          });
        } else {
          wx.showToast({
            title: '服务器响应异常',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('连接失败:', err);
        wx.showModal({
          title: '连接失败',
          content: '请检查:\n1. IP地址是否正确\n2. 端口是否正确\n3. 服务器是否启动\n4. 网络是否连通',
          showCancel: false
        });
      }
    });
  },

  saveServerConfig(server) {
    const config = {
      ip: server.ip,
      port: server.port,
      name: server.name,
      version: server.version,
      capabilities: server.capabilities || [],
      connectedAt: new Date().toISOString()
    };

    wx.setStorageSync('glassesServer', config);

    // 如果有名称，更新服务器配置
    if (server.name && server.name !== '默认眼镜服务器') {
      this.updateServerName(server.name);
    }

    wx.showToast({
      title: '连接成功',
      icon: 'success'
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  updateServerName(name) {
    const server = wx.getStorageSync('glassesServer');
    if (!server) return;

    wx.request({
      url: `http://${server.ip}:${server.port}/api/miniapp/config`,
      method: 'POST',
      data: {
        serverName: name,
        location: '用户配置'
      },
      success: (res) => {
        console.log('服务器名称已更新:', res.data);
      },
      fail: (err) => {
        console.error('更新服务器名称失败:', err);
      }
    });
  },

  // ========== 断开连接 ==========

  disconnectServer() {
    wx.showModal({
      title: '确认断开',
      content: '确定要断开与服务器的连接吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('glassesServer');
          this.setData({ connectedServer: null });
          wx.showToast({
            title: '已断开连接',
            icon: 'success'
          });
        }
      }
    });
  },

  testConnection() {
    const server = this.data.connectedServer;
    if (!server) return;

    wx.showLoading({ title: '测试中...' });

    wx.request({
      url: `http://${server.ip}:${server.port}/api/miniapp/status`,
      success: (res) => {
        wx.hideLoading();
        if (res.data && res.data.success) {
          wx.showModal({
            title: '连接正常',
            content: `服务器: ${res.data.server.name}\n状态: ${res.data.navigation_state}\nESP32: ${res.data.esp32_connected ? '已连接' : '未连接'}`,
            showCancel: false
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showModal({
          title: '连接失败',
          content: '无法连接到服务器，请检查网络或重新配置',
          confirmText: '重新配置',
          success: (res) => {
            if (res.confirm) {
              this.disconnectServer();
            }
          }
        });
      }
    });
  }
});
