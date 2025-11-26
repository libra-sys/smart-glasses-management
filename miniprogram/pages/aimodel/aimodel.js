// aimodel.js - AI模型管理页面
const bluetoothManager = require('../../utils/bluetooth.js');

Page({
  data: {
    // AI模型列表
    models: [
      {
        id: 'gpt4',
        name: 'GPT-4',
        provider: 'OpenAI',
        description: '强大的通用AI模型',
        icon: '🤖',
        color: '#10A37F',
        enabled: true,
        apiKey: '',
        configured: false
      },
      {
        id: 'claude',
        name: 'Claude 3',
        provider: 'Anthropic',
        description: '安全可靠的AI助手',
        icon: '🧠',
        color: '#C55A11',
        enabled: false,
        apiKey: '',
        configured: false
      },
      {
        id: 'gemini',
        name: 'Gemini Pro',
        provider: 'Google',
        description: 'Google最新AI模型',
        icon: '✨',
        color: '#4285F4',
        enabled: false,
        apiKey: '',
        configured: false
      },
      {
        id: 'deepseek',
        name: 'DeepSeek',
        provider: 'DeepSeek',
        description: '高性能中文AI模型',
        icon: '🚀',
        color: '#5856D6',
        enabled: false,
        apiKey: '',
        configured: false
      }
    ],
    selectedModel: 'gpt4',
    showConfigModal: false,
    currentConfigModel: null
  },

  onLoad() {
    this.loadModelSettings();
  },

  // 加载模型设置
  loadModelSettings() {
    const savedSettings = wx.getStorageSync('aiModelSettings');
    if (savedSettings) {
      this.setData({ 
        models: savedSettings.models,
        selectedModel: savedSettings.selectedModel
      });
    }
  },

  // 保存模型设置
  saveModelSettings() {
    wx.setStorageSync('aiModelSettings', {
      models: this.data.models,
      selectedModel: this.data.selectedModel
    });
  },

  // 选择模型
  selectModel(e) {
    const modelId = e.currentTarget.dataset.id;
    const model = this.data.models.find(m => m.id === modelId);
    
    if (!model.configured) {
      wx.showToast({
        title: '请先配置API Key',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ selectedModel: modelId });
    this.saveModelSettings();
    
    // 同步到蓝牙设备
    bluetoothManager.sendJSON({
      type: 'AI_MODEL_SWITCH',
      modelId: modelId,
      modelName: model.name,
      provider: model.provider,
      timestamp: Date.now()
    }, { silent: true })
      .then(() => {
        console.log('AI模型切换已同步到设备');
      })
      .catch(err => {
        console.log('同步失败:', err);
      });
    
    wx.showToast({
      title: `已切换到${model.name}`,
      icon: 'success'
    });
  },

  // 切换模型启用状态
  toggleModel(e) {
    const index = e.currentTarget.dataset.index;
    const models = this.data.models;
    models[index].enabled = !models[index].enabled;
    this.setData({ models });
    this.saveModelSettings();
  },

  // 配置模型
  configureModel(e) {
    const index = e.currentTarget.dataset.index;
    const model = this.data.models[index];
    
    this.setData({
      showConfigModal: true,
      currentConfigModel: { ...model, index }
    });
  },

  // 关闭配置弹窗
  closeConfigModal() {
    this.setData({
      showConfigModal: false,
      currentConfigModel: null
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空方法，用于阻止点击事件冒泡
  },

  // 输入API Key
  inputApiKey(e) {
    const apiKey = e.detail.value;
    const currentConfigModel = this.data.currentConfigModel;
    currentConfigModel.apiKey = apiKey;
    this.setData({ currentConfigModel });
  },

  // 保存配置
  saveConfig() {
    const { currentConfigModel } = this.data;
    
    if (!currentConfigModel.apiKey) {
      wx.showToast({
        title: '请输入API Key',
        icon: 'none'
      });
      return;
    }

    const models = this.data.models;
    models[currentConfigModel.index].apiKey = currentConfigModel.apiKey;
    models[currentConfigModel.index].configured = true;
    models[currentConfigModel.index].enabled = true;

    this.setData({ 
      models,
      showConfigModal: false,
      currentConfigModel: null
    });
    this.saveModelSettings();
    
    // 同步API配置到蓝牙设备
    bluetoothManager.sendJSON({
      type: 'AI_API_CONFIG',
      modelId: currentConfigModel.id,
      modelName: currentConfigModel.name,
      provider: currentConfigModel.provider,
      configured: true,
      timestamp: Date.now()
    }, { silent: true })
      .then(() => {
        console.log('API配置已同步到设备');
      })
      .catch(err => {
        console.log('同步失败:', err);
      });

    wx.showToast({
      title: '配置保存成功',
      icon: 'success'
    });
  },

  // 测试连接
  testConnection() {
    wx.showLoading({
      title: '测试中...'
    });

    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '连接成功',
        icon: 'success'
      });
    }, 1500);
  }
});
