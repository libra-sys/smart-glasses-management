const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const results = [];
  
  try {
    // 0. 自动创建集合（表）
    const collections = ['devices', 'miniapp_stats', 'ai_stats', 'service_logs'];
    for (const collName of collections) {
      try {
        await db.createCollection(collName);
        console.log(`集合 ${collName} 创建成功`);
      } catch (e) {
        console.log(`集合 ${collName} 已存在，跳过创建`);
      }
    }
    
    // 1. 初始化设备数据 (D01-D20)
    const devices = [];
    for (let i = 1; i <= 20; i++) {
      const deviceId = `D${String(i).padStart(2, '0')}`;
      devices.push({
        _id: deviceId,
        name: `智能眼镜 ${deviceId}`,
        userId: null, // 初始未绑定
        location: {
          lat: 39.9042 + (Math.random() - 0.5) * 0.1,
          lng: 116.4074 + (Math.random() - 0.5) * 0.1,
          address: `北京市${['东城区', '西城区', '朝阳区', '海淀区'][Math.floor(Math.random() * 4)]}`
        },
        battery: Math.floor(Math.random() * 40) + 60,
        signal: Math.floor(Math.random() * 2) + 3,
        status: Math.random() > 0.3 ? 'online' : 'offline',
        lastActive: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        model: 'AR-Glass-Pro',
        firmwareVersion: '2.1.0',
        connectedAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString()
      });
    }
    
    // 批量插入设备
    for (const device of devices) {
      try {
        await db.collection('devices').add({ data: device });
      } catch (e) {
        // 已存在则更新
        await db.collection('devices').doc(device._id).update({ data: device });
      }
    }
    results.push({ collection: 'devices', count: devices.length, success: true });
    
    // 2. 初始化小程序统计数据
    const today = new Date().toISOString().split('T')[0];
    const miniappStats = {
      _id: `stats_${today.replace(/-/g, '')}`,
      date: today,
      bindedGlasses: 156,
      todayUpdates: 23,
      activeUsers: 89,
      totalComponents: 42,
      updatedAt: new Date().toISOString()
    };
    
    try {
      await db.collection('miniapp_stats').add({ data: miniappStats });
    } catch (e) {
      await db.collection('miniapp_stats').doc(miniappStats._id).update({ data: miniappStats });
    }
    results.push({ collection: 'miniapp_stats', success: true });
    
    // 3. 初始化AI算法统计
    const aiStats = {
      _id: 'ai_stats_current',
      version: '3.2.1',
      qps: 1247,
      recognitionStats: {
        pedestrian: 8234,
        vehicle: 3421,
        stairs: 1567,
        obstacle: 2103
      },
      accuracy: 0.967,
      avgResponseTime: 45,
      updatedAt: new Date().toISOString()
    };
    
    try {
      await db.collection('ai_stats').add({ data: aiStats });
    } catch (e) {
      await db.collection('ai_stats').doc(aiStats._id).update({ data: aiStats });
    }
    results.push({ collection: 'ai_stats', success: true });
    
    // 4. 初始化服务流水日志
    const serviceLogs = [
      {
        _id: 'log_001',
        type: 'help',
        userId: 'user_001',
        deviceId: 'D01',
        title: '寻找走失老人',
        description: '在朝阳公园附近走失，穿深色外套',
        location: { lat: 39.9289, lng: 116.4833 },
        status: 'completed',
        priority: 'high',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 1800000).toISOString()
      },
      {
        _id: 'log_002',
        type: 'navigation',
        userId: 'user_002',
        deviceId: 'D05',
        title: '前往天安门广场',
        description: '语音导航中',
        location: { lat: 39.9042, lng: 116.4074 },
        status: 'in_progress',
        priority: 'normal',
        createdAt: new Date(Date.now() - 1200000).toISOString()
      },
      {
        _id: 'log_003',
        type: 'mutual_aid',
        userId: 'user_003',
        deviceId: 'D08',
        title: '协助过马路',
        description: '红绿灯路口辅助识别',
        location: { lat: 39.9100, lng: 116.4150 },
        status: 'completed',
        priority: 'normal',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        completedAt: new Date(Date.now() - 7000000).toISOString()
      }
    ];
    
    for (const log of serviceLogs) {
      try {
        await db.collection('service_logs').add({ data: log });
      } catch (e) {
        await db.collection('service_logs').doc(log._id).update({ data: log });
      }
    }
    results.push({ collection: 'service_logs', count: serviceLogs.length, success: true });
    
    return {
      success: true,
      message: '数据初始化成功',
      results: results,
      timestamp: new Date().toISOString()
    };
    
  } catch (e) {
    console.error('初始化失败:', e);
    return {
      success: false,
      error: e.message,
      results: results
    };
  }
};
