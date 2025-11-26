const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const crypto = require('crypto');

// 密码加密函数
const encryptPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

// 用户注册
const userRegister = async (event) => {
  try {
    const { username, phone, password } = event.data;
    
    // 检查手机号是否已注册
    const existUser = await db.collection('users').where({
      phone: phone
    }).get();
    
    if (existUser.data.length > 0) {
      return {
        success: false,
        code: 400,
        message: '该手机号已注册'
      };
    }
    
    // 加密密码
    const encryptedPassword = encryptPassword(password);
    
    // 创建用户
    const result = await db.collection('users').add({
      data: {
        username: username,
        phone: phone,
        password: encryptedPassword,
        avatar: '',
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });
    
    return {
      success: true,
      code: 200,
      message: '注册成功',
      data: {
        userId: result._id
      }
    };
  } catch (e) {
    console.error('注册失败:', e);
    return {
      success: false,
      code: 500,
      message: '注册失败：' + e.message
    };
  }
};

// 用户登录
const userLogin = async (event) => {
  try {
    const { phone, password } = event.data;
    
    // 查询用户
    const userResult = await db.collection('users').where({
      phone: phone
    }).get();
    
    if (userResult.data.length === 0) {
      return {
        success: false,
        code: 404,
        message: '用户不存在'
      };
    }
    
    const user = userResult.data[0];
    
    // 验证密码
    const encryptedPassword = encryptPassword(password);
    if (user.password !== encryptedPassword) {
      return {
        success: false,
        code: 401,
        message: '密码错误'
      };
    }
    
    // 登录成功，返回用户信息（不包含密码）
    return {
      success: true,
      code: 200,
      message: '登录成功',
      data: {
        userId: user._id,
        username: user.username,
        phone: user.phone,
        avatar: user.avatar
      }
    };
  } catch (e) {
    console.error('登录失败:', e);
    return {
      success: false,
      code: 500,
      message: '登录失败：' + e.message
    };
  }
};

// 微信登录
const wechatLogin = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    // 查询是否已有该openid的用户
    const userResult = await db.collection('users').where({
      openid: openid
    }).get();
    
    let userData;
    
    if (userResult.data.length === 0) {
      // 新用户，自动注册
      const { userInfo } = event.data;
      const result = await db.collection('users').add({
        data: {
          openid: openid,
          username: userInfo.nickName || '微信用户',
          phone: '',
          password: '',
          avatar: userInfo.avatarUrl || '',
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
      
      userData = {
        userId: result._id,
        username: userInfo.nickName || '微信用户',
        phone: '',
        avatar: userInfo.avatarUrl || ''
      };
    } else {
      // 老用户，直接返回信息
      const user = userResult.data[0];
      userData = {
        userId: user._id,
        username: user.username,
        phone: user.phone,
        avatar: user.avatar
      };
    }
    
    return {
      success: true,
      code: 200,
      message: '登录成功',
      data: userData
    };
  } catch (e) {
    console.error('微信登录失败:', e);
    return {
      success: false,
      code: 500,
      message: '微信登录失败：' + e.message
    };
  }
};
// 获取openid
const getOpenId = async () => {
  // 获取基础信息
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 获取小程序二维码
const getMiniProgramCode = async () => {
  // 获取小程序二维码的buffer
  const resp = await cloud.openapi.wxacode.get({
    path: "pages/index/index",
  });
  const { buffer } = resp;
  // 将图片上传云存储空间
  const upload = await cloud.uploadFile({
    cloudPath: "code.png",
    fileContent: buffer,
  });
  return upload.fileID;
};

// 创建集合
const createCollection = async () => {
  try {
    // 创建集合
    await db.createCollection("sales");
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "上海",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "南京",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "广州",
        sales: 22,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "深圳",
        sales: 22,
      },
    });
    return {
      success: true,
    };
  } catch (e) {
    // 这里catch到的是该collection已经存在，从业务逻辑上来说是运行成功的，所以catch返回success给前端，避免工具在前端抛出异常
    return {
      success: true,
      data: "create collection success",
    };
  }
};

// 查询数据
const selectRecord = async () => {
  // 返回数据库查询结果
  return await db.collection("sales").get();
};

// 更新数据
const updateRecord = async (event) => {
  try {
    // 遍历修改数据库信息
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("sales")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 新增数据
const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    // 插入数据
    await db.collection("sales").add({
      data: {
        region: insertRecord.region,
        city: insertRecord.city,
        sales: Number(insertRecord.sales),
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 删除数据
const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// const getOpenId = require('./getOpenId/index');
// const getMiniProgramCode = require('./getMiniProgramCode/index');
// const createCollection = require('./createCollection/index');
// const selectRecord = require('./selectRecord/index');
// const updateRecord = require('./updateRecord/index');
// const sumRecord = require('./sumRecord/index');
// const fetchGoodsList = require('./fetchGoodsList/index');
// const genMpQrcode = require('./genMpQrcode/index');
// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getMiniProgramCode":
      return await getMiniProgramCode();
    case "createCollection":
      return await createCollection();
    case "selectRecord":
      return await selectRecord();
    case "updateRecord":
      return await updateRecord(event);
    case "insertRecord":
      return await insertRecord(event);
    case "deleteRecord":
      return await deleteRecord(event);
    case "userRegister":
      return await userRegister(event);
    case "userLogin":
      return await userLogin(event);
    case "wechatLogin":
      return await wechatLogin(event);
  }
};
