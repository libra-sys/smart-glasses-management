// 音效设置页面
const bluetoothManager = require('../../utils/bluetooth.js');

Page({
  data: {
    soundEnabled: true,
    voiceEnabled: true,
    volume: 70,
    currentSound: 1,
    customAudioPath: '',
    customAudioName: '',
    audioContext: null,
    soundList: [
      { id: 1, name: '西游', cloudPath: 'cloud://cloud1-6gyt300c51f0e484.636c-cloud1-6gyt300c51f0e484-1386884445/audio/default.mp3' },
      { id: 2, name: 'luo', cloudPath: 'cloud://cloud1-6gyt300c51f0e484.636c-cloud1-6gyt300c51f0e484-1386884445/audio/bell.mp3' },
      { id: 3, name: 'only', cloudPath: 'cloud://cloud1-6gyt300c51f0e484.636c-cloud1-6gyt300c51f0e484-1386884445/audio/soft.mp3' },
      { id: 4, name: 'luo', cloudPath: 'cloud://cloud1-6gyt300c51f0e484.636c-cloud1-6gyt300c51f0e484-1386884445/audio/tech.mp3' },
      { id: 5, name: '自定义音效', isCustom: true }
    ]
  },

  onLoad() {
    this.loadSettings();
    this.audioContext = wx.createInnerAudioContext();
  },

  onUnload() {
    // 页面卸载时释放音频资源
    if (this.audioContext) {
      this.audioContext.destroy();
    }
  },

  // 加载设置
  loadSettings() {
    const soundEnabled = wx.getStorageSync('soundEnabled');
    const voiceEnabled = wx.getStorageSync('voiceEnabled');
    const volume = wx.getStorageSync('volume');
    const currentSound = wx.getStorageSync('currentSound');
    const customAudioPath = wx.getStorageSync('customAudioPath');
    const customAudioName = wx.getStorageSync('customAudioName');

    this.setData({
      soundEnabled: soundEnabled !== undefined ? soundEnabled : true,
      voiceEnabled: voiceEnabled !== undefined ? voiceEnabled : true,
      volume: volume || 70,
      currentSound: currentSound || 1,
      customAudioPath: customAudioPath || '',
      customAudioName: customAudioName || ''
    });
  },

  // 切换提示音
  toggleSound(e) {
    const enabled = e.detail.value;
    this.setData({
      soundEnabled: enabled
    });
    
    // 发送设置到蓝牙设备
    this.syncToDevice({
      type: 'SOUND_SETTING',
      soundEnabled: enabled
    });
  },

  // 切换语音播报
  toggleVoice(e) {
    const enabled = e.detail.value;
    this.setData({
      voiceEnabled: enabled
    });
    
    // 发送设置到蓝牙设备
    this.syncToDevice({
      type: 'VOICE_SETTING',
      voiceEnabled: enabled
    });
  },

  // 选择音效
  selectSound(e) {
    const id = e.currentTarget.dataset.id;
    const sound = this.data.soundList.find(item => item.id === id);
    
    // 如果选择的是自定义音效，检查是否已上传
    if (sound && sound.isCustom && !this.data.customAudioPath) {
      wx.showToast({
        title: '请先选择自定义音频文件',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      currentSound: id
    });
    
    // 发送设置到蓝牙设备
    this.syncToDevice({
      type: 'SOUND_SELECT',
      soundId: id,
      soundName: sound.name,
      isCustom: sound.isCustom || false
    });
  },

  // 试听音效
  playSound(e) {
    const id = e.currentTarget.dataset.id;
    const sound = this.data.soundList.find(item => item.id === id);
    
    if (!sound) {
      wx.showToast({
        title: '音效不存在',
        icon: 'none'
      });
      return;
    }
    
    // 如果是自定义音效，播放自定义音频
    if (sound.isCustom) {
      this.playCustomAudio();
      return;
    }
    
    wx.showLoading({
      title: '加载中...'
    });
    
    // 如果是云存储路径，先获取临时链接
    if (sound.cloudPath) {
      wx.cloud.getTempFileURL({
        fileList: [sound.cloudPath],
        success: res => {
          wx.hideLoading();
          console.log('云存储文件获取结果:', res);
          
          if (res.fileList && res.fileList.length > 0) {
            const fileInfo = res.fileList[0];
            if (fileInfo.status === 0) {
              // 获取成功
              this.playAudioFile(fileInfo.tempFileURL, sound.name);
            } else {
              // 文件不存在或获取失败
              console.error('文件获取失败:', fileInfo);
              wx.showModal({
                title: '提示',
                content: '音效文件未上传到云存储，请先在云开发控制台上传音频文件到 audio 文件夹',
                showCancel: false
              });
            }
          } else {
            wx.showToast({
              title: '音效文件获取失败',
              icon: 'none'
            });
          }
        },
        fail: err => {
          wx.hideLoading();
          console.error('获取云存储文件失败', err);
          wx.showModal({
            title: '提示',
            content: '获取云存储文件失败，请检查云开发环境配置',
            showCancel: false
          });
        }
      });
    } else if (sound.path) {
      // 本地路径直接播放
      wx.hideLoading();
      this.playAudioFile(sound.path, sound.name);
    } else {
      wx.hideLoading();
      wx.showToast({
        title: '音效文件路径未配置',
        icon: 'none'
      });
    }
  },

  // 播放音频文件
  playAudioFile(audioPath, audioName) {
    if (this.audioContext) {
      this.audioContext.src = audioPath;
      this.audioContext.volume = this.data.volume / 100;
      this.audioContext.play();
      
      wx.showToast({
        title: '播放: ' + audioName,
        icon: 'none'
      });
    }
  },

  // 选择音频文件
  chooseAudioFile() {
    // 使用云存储上传或从本地相册选择
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'], // 视频文件可能包含音频
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = res.tempFiles[0];
        
        this.setData({
          customAudioPath: file.tempFilePath,
          customAudioName: '自定义音效.mp3'
        });

        wx.showToast({
          title: '文件选择成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        // 如果chooseMedia失败，尝试使用chooseMessageFile
        wx.chooseMessageFile({
          count: 1,
          type: 'file',
          extension: ['mp3', 'wav', 'aac', 'm4a'],
          success: (res) => {
            const file = res.tempFiles[0];
            
            // 检查文件类型
            const fileName = file.name;
            const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
            
            if (!['.mp3', '.wav', '.aac', '.m4a'].includes(fileExt)) {
              wx.showToast({
                title: '请选择音频文件',
                icon: 'none'
              });
              return;
            }

            // 检查文件大小（限制为5MB）
            if (file.size > 5 * 1024 * 1024) {
              wx.showToast({
                title: '文件大小不能超过5MB',
                icon: 'none'
              });
              return;
            }

            this.setData({
              customAudioPath: file.path,
              customAudioName: fileName
            });

            wx.showToast({
              title: '文件选择成功',
              icon: 'success'
            });
          },
          fail: () => {
            wx.showToast({
              title: '取消选择',
              icon: 'none'
            });
          }
        });
      }
    });
  },

  // 播放自定义音频
  playCustomAudio() {
    if (!this.data.customAudioPath) {
      wx.showToast({
        title: '请先选择音频文件',
        icon: 'none'
      });
      return;
    }

    if (this.audioContext) {
      this.audioContext.src = this.data.customAudioPath;
      this.audioContext.volume = this.data.volume / 100;
      this.audioContext.play();
      
      wx.showToast({
        title: '播放: ' + (this.data.customAudioName || '自定义音效'),
        icon: 'none'
      });
    }
  },

  // 移除自定义音频
  removeCustomAudio() {
    wx.showModal({
      title: '提示',
      content: '确定要移除该自定义音效吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            customAudioPath: '',
            customAudioName: ''
          });
          wx.showToast({
            title: '已移除',
            icon: 'success'
          });
        }
      }
    });
  },

  // 音量变化
  volumeChange(e) {
    const newVolume = e.detail.value;
    this.setData({
      volume: newVolume
    });
    
    // 实时更新音频上下文的音量
    if (this.audioContext) {
      this.audioContext.volume = newVolume / 100;
    }
    
    // 发送设置到蓝牙设备
    this.syncToDevice({
      type: 'VOLUME_SETTING',
      volume: newVolume
    });
  },

  // 保存设置
  saveSettings() {
    const { soundEnabled, voiceEnabled, volume, currentSound, customAudioPath, customAudioName } = this.data;
    
    wx.setStorageSync('soundEnabled', soundEnabled);
    wx.setStorageSync('voiceEnabled', voiceEnabled);
    wx.setStorageSync('volume', volume);
    wx.setStorageSync('currentSound', currentSound);
    wx.setStorageSync('customAudioPath', customAudioPath);
    wx.setStorageSync('customAudioName', customAudioName);

    // 同步所有设置到蓝牙设备
    this.syncToDevice({
      type: 'SOUND_SETTINGS_ALL',
      soundEnabled,
      voiceEnabled,
      volume,
      currentSound,
      soundName: this.data.soundList.find(s => s.id === currentSound)?.name || '',
      timestamp: Date.now()
    });

    wx.showToast({
      title: '设置已保存',
      icon: 'success'
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },
  
  /**
   * 同步设置到蓝牙设备
   */
  syncToDevice(data) {
    bluetoothManager.sendJSON(data, { silent: true })
      .then(() => {
        console.log('音效设置已同步到设备:', data);
      })
      .catch(err => {
        console.log('同步设置失败（可能未连接设备）:', err);
      });
  }
});
