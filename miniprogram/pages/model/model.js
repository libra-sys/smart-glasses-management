// model.js - 智能眼镜功能组件管理页面
const { ComponentAPI, UserAPI, GlassesAPI } = require('../../utils/api.js');
const GlassesServerAPI = require('../../utils/glasses-server-api.js');
const bluetoothManager = require('../../utils/bluetooth.js');

Page({
  data: {
    activeTab: 'installed',
    installedComponents: [
      {
        id: 'translation',
        name: '实时翻译',
        description: '多语言实时翻译功能',
        icon: '🌐',
        color: '#5856D6',
        enabled: false
      },
      {
        id: 'navigation',
        name: '导航助手',
        description: 'AR导航与路线规划',
        icon: '🗺️',
        color: '#34C759',
        enabled: false
      },
      {
        id: 'health',
        name: '健康监测',
        description: '心率、步数等健康数据',
        icon: '❤️',
        color: '#FF3B30',
        enabled: false
      },
      {
        id: 'voice',
        name: '语音助手',
        description: '智能语音交互助手',
        icon: '🎤',
        color: '#AF52DE',
        enabled: true
      }
    ],
    // 推荐组件
    recommendedComponents: [
      {
        id: 'photo',
        name: '拍照识物',
        description: 'AI物体识别与分析',
        icon: '📷',
        color: '#FF9500',
        installed: false
      },
      {
        id: 'weather',
        name: '天气预报',
        description: '实时天气信息推送',
        icon: '☁️',
        color: '#007AFF',
        installed: false
      }
    ],
    // 社区组件
    communityComponents: [],
    syncTimer: null,  // 同步定时器
    locationTimer: null,  // 定位上报定时器
    navigationAvailable: false,  // 导航组件已安装且启用时为 true
    navDestName: '',
    navDestLat: '',
    navDestLng: '',
    navStatusText: ''
  },

  onLoad() {
    this.loadComponentSettings();
    this.loadCommunityComponents();
    this.syncUserComponents();
    this.startAutoSync();
  },

  onShow() {
    this.syncUserComponents();
    this.startAutoSync();

    const hasNavigationEnabled = this.data.installedComponents.some(
      (c) => c.id === 'navigation' && c.enabled
    );
    this.setData({ navigationAvailable: hasNavigationEnabled });
    if (hasNavigationEnabled) {
      this.startLocationUpdates();
    } else {
      this.stopLocationUpdates();
    }
  },

  onHide() {
    this.stopAutoSync();
    this.stopLocationUpdates();
  },

  onUnload() {
    this.stopAutoSync();
    this.stopLocationUpdates();
  },

  // 启动自动同步，每30秒检查一次
  startAutoSync() {
    this.stopAutoSync();
    const timer = setInterval(() => {
      console.log('自动同步检查...');
      this.syncUserComponents();
    }, 30000);
    this.setData({ syncTimer: timer });
  },

  // 停止自动同步
  stopAutoSync() {
    if (this.data.syncTimer) {
      clearInterval(this.data.syncTimer);
      this.setData({ syncTimer: null });
    }
  },

  // 启动定位上报（用于导航助手）
  startLocationUpdates() {
    // 先停止已有定时器，避免重复
    this.stopLocationUpdates();

    if (!GlassesServerAPI.isServerConfigured()) {
      console.log('服务器未配置，跳过定位上报');
      return;
    }

    const doUpdate = () => {
      wx.getLocation({
        type: 'gcj02',
        isHighAccuracy: true,
        success: (res) => {
          console.log('获取定位成功，准备上报到服务器', res);
          GlassesServerAPI.updateLocation(res.latitude, res.longitude, res.accuracy)
            .then(() => {
              console.log('已上报定位到服务器');
            })
            .catch((err) => {
              console.error('上报定位失败:', err);
            });
        },
        fail: (err) => {
          console.error('获取定位失败:', err);
        }
      });
    };

    // 先立即上报一次
    doUpdate();

    // 每60秒上报一次
    const timer = setInterval(doUpdate, 60000);
    this.setData({ locationTimer: timer });
  },

  // 停止定位上报
  stopLocationUpdates() {
    if (this.data.locationTimer) {
      clearInterval(this.data.locationTimer);
      this.setData({ locationTimer: null });
    }
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    
    // 如果切换到社区，刷新数据
    if (tab === 'community') {
      this.loadCommunityComponents();
    }
  },

  // 从社区加载组件
  loadCommunityComponents() {
    const { BASE_URL } = require('../../utils/api.js');
    console.log('当前 API 地址:', BASE_URL);
    
    wx.showLoading({ title: '加载中...' });
    
    ComponentAPI.getList()
      .then(data => {
        console.log('社区组件数据:', data);
        // 假设返回格式为 { components: [...] } 或直接 [...]
        const components = Array.isArray(data) ? data : (data.components || data.data || []);
        
        this.setData({ 
          communityComponents: components.map(c => {
            let iconDisplay = c.icon || '📦';
            if (typeof iconDisplay === 'string' && (iconDisplay.startsWith('http') || iconDisplay.includes('developer.com'))) {
              iconDisplay = '📦';
            }
            
            return {
              id: c.id || c._id,
              name: c.name || c.title,
              description: c.description || c.desc,
              icon: iconDisplay,
              color: c.color || '#007AFF',
              author: c.author || '未知',
              downloads: c.downloads || 0,
              rating: c.rating || 0,
              version: c.version || '1.0.0',
              size: c.size || '未知',
              installed: this.isComponentInstalled(c.id || c._id)
            };
          })
        });
        wx.hideLoading();
      })
      .catch(err => {
        console.error('加载社区组件失败:', err);
        wx.hideLoading();
        wx.showModal({
          title: '加载失败',
          content: `无法连接到社区服务器\n错误: ${err.message}\n\n请确认网站 API 正常工作`,
          showCancel: false
        });
      });
  },

  // 同步用户从网站安装的组件
  syncUserComponents() {
    const userInfo = wx.getStorageSync('userInfo');
    console.log('=== 同步检查 ===');
    console.log('userInfo:', JSON.stringify(userInfo));
    
    if (!userInfo) {
      console.log('用户未登录，跳过同步');
      return;
    }

    // 兼容多种用户ID字段：id, _id, userId, openid, phone
    const userId = userInfo.id || userInfo._id || userInfo.userId || userInfo.openid || userInfo.phone;
    
    if (!userId) {
      console.log('无法获取用户ID，userInfo:', userInfo);
      return;
    }

    console.log('开始同步用户组件, userId:', userId);

    UserAPI.getUserComponents(userId)
      .then(data => {
        console.log('网站同步的组件:', data);
        
        const webComponents = Array.isArray(data) ? data : (data.components || data.data || []);
        if (webComponents.length === 0) {
          console.log('网站没有已安装组件');
          return;
        }

        const localInstalled = this.data.installedComponents;
        const syncPromises = [];

        webComponents.forEach(webComp => {
          const compId = webComp.componentId || webComp.component_id || webComp.id;
          const exists = localInstalled.some(c => c.id === compId);
          
          if (!exists) {
            // 如果网站只返回了componentId，需要获取完整信息
            if (!webComp.name || !webComp.description) {
              syncPromises.push(
                ComponentAPI.getDetail(compId)
                  .then(detail => ({
                    id: compId,
                    name: detail.name,
                    description: detail.description,
                    icon: detail.icon || '📦',
                    color: detail.color || '#007AFF',
                    enabled: true,
                    source: 'web',
                    version: detail.version || '1.0.0',
                    config: detail.config || webComp.config || {}
                  }))
                  .catch(err => {
                    console.error('获取组件详情失败:', compId, err);
                    return {
                      id: compId,
                      name: '未知组件',
                      description: '',
                      icon: '📦',
                      color: '#007AFF',
                      enabled: true,
                      source: 'web',
                      version: '1.0.0',
                      config: webComp.config || {}
                    };
                  })
              );
            } else {
              // 处理icon：如果是URL则使用默认emoji
              let iconDisplay = webComp.icon || '📦';
              if (typeof iconDisplay === 'string' && (iconDisplay.startsWith('http') || iconDisplay.includes('developer.com'))) {
                iconDisplay = '📦';
              }
              
              syncPromises.push(Promise.resolve({
                id: compId,
                name: webComp.name,
                description: webComp.description,
                icon: iconDisplay,
                color: webComp.color || '#007AFF',
                enabled: true,
                source: 'web',
                version: webComp.version || '1.0.0',
                config: webComp.config || {}
              }));
            }
          }
        });

        if (syncPromises.length > 0) {
          Promise.all(syncPromises)
            .then(newComponents => {
              const updatedComponents = [...localInstalled, ...newComponents];
              this.setData({ installedComponents: updatedComponents });
              this.saveComponentSettings();

              newComponents.forEach(comp => {
                this.syncComponentToDevice(comp, 'install');
              });

              wx.showToast({
                title: `同步了 ${newComponents.length} 个组件`,
                icon: 'success'
              });
            });
        }

        // 检查是否有需要移除的组件（网站已删除，小程序还有）
        const webComponentIds = webComponents.map(c => c.componentId || c.component_id || c.id);
        const toRemove = localInstalled.filter(local => 
          local.source === 'web' && !webComponentIds.includes(local.id)
        );

        if (toRemove.length > 0) {
          const remainingComponents = localInstalled.filter(c => !toRemove.some(r => r.id === c.id));
          this.setData({ installedComponents: remainingComponents });
          this.saveComponentSettings();

          toRemove.forEach(comp => {
            this.syncComponentToDevice(comp, 'uninstall');
          });

          console.log(`移除了 ${toRemove.length} 个组件:`, toRemove.map(c => c.name));
          wx.showToast({
            title: `移除了 ${toRemove.length} 个组件`,
            icon: 'none'
          });
        } else if (syncPromises.length === 0) {
          console.log('所有组件已同步');
        }
      })
      .catch(err => {
        console.error('同步用户组件失败:', err);
      });
  },
  isComponentInstalled(id) {
    return this.data.installedComponents.some(c => c.id === id);
  },

  // 加载组件设置
  loadComponentSettings() {
    const savedSettings = wx.getStorageSync('componentSettings');
    if (savedSettings) {
      this.setData({ installedComponents: savedSettings });
    }
  },

  // 保存组件设置
  saveComponentSettings() {
    wx.setStorageSync('componentSettings', this.data.installedComponents);
  },

  // 切换已安装组件状态
  toggleInstalledComponent(e) {
    const index = e.currentTarget.dataset.index;
    const components = this.data.installedComponents;
    components[index].enabled = !components[index].enabled;
    const hasNavigationEnabled = components.some(c => c.id === 'navigation' && c.enabled);
    this.setData({ installedComponents: components, navigationAvailable: hasNavigationEnabled });
    this.saveComponentSettings();

    const toggled = components[index];
    wx.showToast({
      title: toggled.enabled ? '已启用' : '已关闭',
      icon: 'success'
    });

    // 导航助手开关时，控制定位上报
    if (toggled.id === 'navigation') {
      if (toggled.enabled) {
        this.startLocationUpdates();
      } else {
        this.stopLocationUpdates();
      }
    }
  },

  // 安装组件（推荐或社区）
  installComponent(e) {
    const component = e.currentTarget.dataset.component;
    const source = e.currentTarget.dataset.source || 'recommended'; // recommended 或 community
    
    wx.showLoading({ title: '安装中...' });

    // 如果是社区组件，先下载
    const installPromise = source === 'community' 
      ? ComponentAPI.download(component.id)
      : Promise.resolve(component);

    installPromise
      .then(downloadedData => {
        // 合并下载的数据和原始数据
        const componentData = source === 'community' 
          ? { ...component, ...downloadedData }
          : component;

        const newComponent = {
          id: componentData.id,
          name: componentData.name,
          description: componentData.description,
          icon: componentData.icon || '📦',
          color: componentData.color || '#007AFF',
          enabled: true,
          source: source, // 标记来源
          version: componentData.version,
          config: componentData.config || {} // 组件配置
        };

        const installedComponents = [...this.data.installedComponents, newComponent];
        
        // 从对应列表移除
        let updates = { installedComponents };
        if (source === 'recommended') {
          const recommendedComponents = this.data.recommendedComponents.filter(c => c.id !== component.id);
          updates.recommendedComponents = recommendedComponents;
        } else if (source === 'community') {
          const communityComponents = this.data.communityComponents.map(c => 
            c.id === component.id ? { ...c, installed: true } : c
          );
          updates.communityComponents = communityComponents;
        }

        this.setData(updates);
        this.saveComponentSettings();

        const hasNavigationEnabled = installedComponents.some(c => c.id === 'navigation' && c.enabled);
        this.setData({ navigationAvailable: hasNavigationEnabled });

        // 同步到蓝牙设备
        this.syncComponentToDevice(newComponent, 'install');

        // 如果安装的是导航助手，启动定位上报
        if (newComponent.id === 'navigation') {
          this.startLocationUpdates();
        }

        // 同步到网站
        const userInfo = wx.getStorageSync('userInfo');
        const userId = userInfo ? (userInfo.id || userInfo._id || userInfo.userId || userInfo.openid || userInfo.phone) : null;
        if (userId) {
          UserAPI.installComponent(userId, component.id)
            .then(() => console.log('已同步到网站'))
            .catch(err => console.log('同步到网站失败:', err));
        }

        wx.hideLoading();
        wx.showToast({ title: '安装成功', icon: 'success' });
      })
      .catch(err => {
        console.error('安装失败:', err);
        wx.hideLoading();
        wx.showModal({
          title: '安装失败',
          content: err.message || '组件安装失败，请重试',
          showCancel: false
        });
      });
  },

  // 卸载组件
  uninstallComponent(e) {
    const index = e.currentTarget.dataset.index;
    const component = this.data.installedComponents[index];

    wx.showModal({
      title: '提示',
      content: `确定要卸载${component.name}吗？`,
      success: (res) => {
        if (res.confirm) {
          const installedComponents = this.data.installedComponents.filter((_, i) => i !== index);
          
          // 根据来源决定移回哪个列表
          let updates = { installedComponents };
          if (component.source === 'recommended') {
            updates.recommendedComponents = [...this.data.recommendedComponents, {
              id: component.id,
              name: component.name,
              description: component.description,
              icon: component.icon,
              color: component.color,
              installed: false
            }];
          } else if (component.source === 'community') {
            // 更新社区组件状态
            updates.communityComponents = this.data.communityComponents.map(c => 
              c.id === component.id ? { ...c, installed: false } : c
            );
          }

          this.setData(updates);
          this.saveComponentSettings();

          const hasNavigationEnabled = installedComponents.some(c => c.id === 'navigation' && c.enabled);
          this.setData({ navigationAvailable: hasNavigationEnabled });

          // 同步到蓝牙设备
          this.syncComponentToDevice(component, 'uninstall');

          // 如果卸载的是导航助手，停止定位上报
          if (component.id === 'navigation') {
            this.stopLocationUpdates();
          }

          // 从网站移除
          const userInfo = wx.getStorageSync('userInfo');
          const userId = userInfo ? (userInfo.id || userInfo._id || userInfo.userId || userInfo.openid || userInfo.phone) : null;
          if (userId) {
            UserAPI.uninstallComponent(userId, component.id)
              .then(() => console.log('已从网站移除'))
              .catch(err => console.log('从网站移除失败:', err));
          }

          wx.showToast({ title: '已卸载', icon: 'success' });
        }
      }
    });
  },

  // 同步组件到眼镜设备（通过服务器）
  syncComponentToDevice(component, action) {
    // 检查是否配置了服务器
    if (!GlassesServerAPI.isServerConfigured()) {
      console.log('服务器未配置，跳过同步');
      return;
    }

    if (action === 'install') {
      // 通过服务器推送组件到ESP32
      GlassesServerAPI.installComponent({
        componentId: component.id,
        name: component.name,
        description: component.description,
        config: component.config || {},
        scriptUrl: component.scriptUrl
      })
        .then(res => {
          console.log(`组件 ${component.name} 已通过服务器推送到眼镜`);
          if (res.success) {
            wx.showToast({
              title: '已推送到眼镜',
              icon: 'success'
            });
          }
        })
        .catch(err => {
          console.log('推送失败:', err);
          wx.showModal({
            title: '推送失败',
            content: err.message || '无法连接到眼镜服务器，请检查配置',
            confirmText: '配置服务器',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.navigateTo({
                  url: '/pages/server-config/server-config'
                });
              }
            }
          });
        });
    } else {
      // 卸载组件（服务器通知ESP32移除）
      console.log(`组件 ${component.name} 已从本地卸载`);
      
      // 通知服务器卸载组件，关闭对应功能
      GlassesServerAPI.uninstallComponent(component.id)
        .then(() => console.log('已通知服务器移除组件'))
        .catch(err => console.error('通知服务器卸载组件失败:', err));
    }
  },

  // 查看组件详情
  viewComponentDetail(e) {
    const component = e.currentTarget.dataset.component;
    
    wx.showModal({
      title: component.name,
      content: `${component.description}

作者: ${component.author || '官方'}
版本: ${component.version || '1.0.0'}
大小: ${component.size || '未知'}
下载: ${component.downloads || 0}次`,
      confirmText: component.installed ? '已安装' : '安装',
      success: (res) => {
        if (res.confirm && !component.installed) {
          this.installComponent({
            currentTarget: {
              dataset: {
                component: component,
                source: 'community'
              }
            }
          });
        }
      }
    });
  }
});