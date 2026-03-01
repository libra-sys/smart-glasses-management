# 智能眼镜管理系统

## 项目简介

智能眼镜管理系统是一个基于微信小程序的应用，用于管理智能眼镜设备，包括设备配对、模式设置、声音控制、AI模型管理等功能。

## 功能特性

- **设备管理**：配对、连接和管理智能眼镜设备
- **模式设置**：配置不同使用场景的模式
- **声音控制**：调节音量和音效设置
- **AI模型管理**：管理和更新设备上的AI模型
- **数据同步**：同步设备数据到云端

## 技术栈

- 前端：微信小程序
- 后端：云函数（基于腾讯云开发）
- 通信：蓝牙通信

## 目录结构

```
├── cloudfunctions/     # 云函数
│   ├── dashboardAPI/    # 仪表板API
│   ├── initDatabase/    # 数据库初始化
│   └── quickstartFunctions/ # 快速启动函数
├── miniprogram/         # 小程序代码
│   ├── components/      # 组件
│   ├── images/          # 图片资源
│   ├── pages/           # 页面
│   ├── utils/           # 工具函数
│   ├── app.js           # 应用入口
│   └── app.json         # 应用配置
├── ui/                  # UI设计文件
└── project.config.json  # 项目配置
```

## 开始使用

1. 克隆项目到本地
2. 在微信开发者工具中导入项目
3. 配置云开发环境
4. 部署云函数
5. 运行小程序

## 开发指南

### 前端开发

- 使用微信开发者工具进行开发
- 页面位于 `miniprogram/pages/` 目录
- 组件位于 `miniprogram/components/` 目录

### 后端开发

- 云函数位于 `cloudfunctions/` 目录
- 使用 `uploadCloudFunction.sh` 脚本部署云函数

## 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目。

## 许可证

本项目采用 MIT 许可证，详情请见 [LICENSE](LICENSE) 文件。