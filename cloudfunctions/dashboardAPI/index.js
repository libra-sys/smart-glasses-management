const cloud = require('wx-server-sdk');
const fetch = require('node-fetch');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const DASHBOARD_API = 'https://help.hlw.work/api/dashboard-sync';

exports.main = async (event) => {
  const { type } = event;
  
  try {
    switch (type) {
      case 'getDevices':
        const devices = await db.collection('devices').get();
        return { success: true, data: devices.data };
        
      case 'getStats':
        const stats = await db.collection('miniapp_stats')
          .orderBy('date', 'desc')
          .limit(1)
          .get();
        return { success: true, data: stats.data[0] };
        
      case 'getAIStats':
        const aiStats = await db.collection('ai_stats')
          .doc('ai_stats_current')
          .get();
        return { success: true, data: aiStats.data };
        
      case 'getServiceLogs':
        const logs = await db.collection('service_logs')
          .orderBy('createdAt', 'desc')
          .limit(50)
          .get();
        return { success: true, data: logs.data };

      case 'syncToDashboard':
        const [devicesData, statsData, aiData, logsData] = await Promise.all([
          db.collection('devices').get(),
          db.collection('miniapp_stats').orderBy('date', 'desc').limit(1).get(),
          db.collection('ai_stats').doc('ai_stats_current').get(),
          db.collection('service_logs').orderBy('createdAt', 'desc').limit(50).get()
        ]);

        const payload = {
          devices: devicesData.data,
          stats: statsData.data[0],
          aiStats: aiData.data,
          serviceLogs: logsData.data,
          timestamp: new Date().toISOString()
        };

        const response = await fetch(DASHBOARD_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        return { success: true, data: result };
        
      default:
        return { success: false, error: 'Unknown type' };
    }
  } catch (e) {
    console.error('Error:', e);
    return { success: false, error: e.message };
  }
};
