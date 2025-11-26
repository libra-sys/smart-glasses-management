// model.js - 智能眼镜功能组件管理页面
const { ComponentAPI } = require('../../utils/api.js');
const bluetoothManager = require('../../utils/bluetooth.js');

Page({
  data: {
    activeTab: 'installed', // installed, recommended, community
    // 已安装的组件
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
    communityComponents: []
  },

  onLoad() {
    this.loadComponentSettings();
    this.loadCommunityComponents();
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
          communityComponents: components.map(c => ({
            id: c.id || c._id,
            name: c.name || c.title,
            description: c.description || c.desc,
            icon: c.icon || '📦',
            color: c.color || '#007AFF',
            author: c.author || '未知',
            downloads: c.downloads || 0,
            rating: c.rating || 0,
            version: c.version || '1.0.0',
            size: c.size || '未知',
            installed: this.isComponentInstalled(c.id || c._id)
          }))
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

  // 检查组件是否已安装
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
    this.setData({ installedComponents: components });
    this.saveComponentSettings();
    
    wx.showToast({
      title: components[index].enabled ? '已启用' : '已关闭',
      icon: 'success'
    });
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

        // 同步到蓝牙设备
        this.syncComponentToDevice(newComponent, 'install');

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

          // 同步到蓝牙设备
          this.syncComponentToDevice(component, 'uninstall');

          wx.showToast({ title: '已卸载', icon: 'success' });
        }
      }
    });
  },

  // 同步组件到蓝牙设备
  syncComponentToDevice(component, action) {
    bluetoothManager.sendJSON({
      type: 'COMPONENT_' + action.toUpperCase(),
      componentId: component.id,
      componentName: component.name,
      config: component.config || {},
      enabled: action === 'install' ? component.enabled : false,
      timestamp: Date.now()
    }, { silent: true })
      .then(() => {
        console.log(`组件${action}已同步到设备`);
      })
      .catch(err => {
        console.log('同步失败:', err);
      });
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