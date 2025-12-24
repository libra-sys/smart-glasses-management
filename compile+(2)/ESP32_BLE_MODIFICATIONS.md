# ESP32 BLE 功能添加指南

## 需要安装的库

在 Arduino IDE 中安装以下库（通过"工具" → "管理库"）：

1. **ESP32 BLE Arduino**（通常 ESP32 开发板包已自带，无需额外安装）
   - 如果没有，搜索并安装 `ESP32 BLE Arduino`

## 代码修改详细步骤

### 1. 添加 BLE 头文件（第 4-16 行之间）

**位置：** 在 `#include <SPI.h>` 之后，`using namespace websockets;` 之前

**原代码：**
```cpp
#include <SPI.h>        // <<< 改成 SPI
using namespace websockets;
```

**修改为：**
```cpp
#include <SPI.h>        // <<< 改成 SPI
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
using namespace websockets;
```

**具体位置：第 15 行后插入 4 行**

---

### 2. 添加 BLE 全局变量（第 92 行后）

**位置：** 在 `volatile bool run_audio_stream = false;` 之后

**原代码：**
```cpp
I2SClass i2sIn;   // PDM RX (Mic)
I2SClass i2sOut;  // STD TX (Speaker)
volatile bool run_audio_stream = false;

// ====================================================================
// Camera
// ====================================================================
```

**修改为：**
```cpp
I2SClass i2sIn;   // PDM RX (Mic)
I2SClass i2sOut;  // STD TX (Speaker)
volatile bool run_audio_stream = false;

// ===== BLE =====
#define BLE_SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHAR_VOLUME_UUID        "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHAR_POWER_UUID         "beb5483e-36e1-4688-b7f5-ea07361b26a9"
#define CHAR_BATTERY_UUID       "beb5483e-36e1-4688-b7f5-ea07361b26aa"
#define CHAR_STATUS_UUID        "beb5483e-36e1-4688-b7f5-ea07361b26ab"

BLEServer* pBLEServer = nullptr;
BLECharacteristic* pCharVolume = nullptr;
BLECharacteristic* pCharPower = nullptr;
BLECharacteristic* pCharBattery = nullptr;
BLECharacteristic* pCharStatus = nullptr;
volatile bool ble_device_connected = false;
volatile uint8_t current_volume = 50;
volatile uint8_t current_battery = 85;

// ====================================================================
// Camera
// ====================================================================
```

**具体位置：第 92 行后插入 18 行**

---

### 3. 添加 BLE 回调类和初始化函数（第 93 行之前）

**位置：** 在 `// ====================================================================` 和 `// Camera` 之间

**插入以下完整代码：**

```cpp
// ====================================================================
// BLE Server Callbacks
// ====================================================================
class BLEServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    ble_device_connected = true;
    Serial.println("[BLE] Client connected");
  }
  void onDisconnect(BLEServer* pServer) {
    ble_device_connected = false;
    Serial.println("[BLE] Client disconnected");
    pServer->startAdvertising();
  }
};

class VolumeCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      current_volume = (uint8_t)value[0];
      current_volume = constrain(current_volume, 0, 100);
      
      // 实际音量控制逻辑（如果硬件支持）
      // 这里可以控制 MAX98357A 的增益或通过软件调整 PCM 音量
      Serial.printf("[BLE] Volume set to: %d%%\n", current_volume);
    }
  }
};

class PowerCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    std::string value = pCharacteristic->getValue();
    if (value.length() > 0) {
      uint8_t cmd = (uint8_t)value[0];
      if (cmd == 1) {
        Serial.println("[BLE] Power ON command");
        // 实际开机逻辑
      } else if (cmd == 0) {
        Serial.println("[BLE] Power OFF command");
        // 实际关机逻辑（如进入深度睡眠）
        // esp_deep_sleep_start();
      }
    }
  }
};

void initBLE() {
  Serial.println("[BLE] Initializing...");
  
  BLEDevice::init("AIGlasses-ESP32");
  pBLEServer = BLEDevice::createServer();
  pBLEServer->setCallbacks(new BLEServerCallbacks());
  
  BLEService *pService = pBLEServer->createService(BLE_SERVICE_UUID);
  
  // 音量特征（可读可写可通知）
  pCharVolume = pService->createCharacteristic(
    CHAR_VOLUME_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharVolume->setCallbacks(new VolumeCallbacks());
  pCharVolume->addDescriptor(new BLE2902());
  pCharVolume->setValue(&current_volume, 1);
  
  // 电源特征（可读可写）
  pCharPower = pService->createCharacteristic(
    CHAR_POWER_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE
  );
  pCharPower->setCallbacks(new PowerCallbacks());
  uint8_t power_state = 1;
  pCharPower->setValue(&power_state, 1);
  
  // 电量特征（只读可通知）
  pCharBattery = pService->createCharacteristic(
    CHAR_BATTERY_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharBattery->addDescriptor(new BLE2902());
  pCharBattery->setValue(&current_battery, 1);
  
  // 状态特征（只读）
  pCharStatus = pService->createCharacteristic(
    CHAR_STATUS_UUID,
    BLECharacteristic::PROPERTY_READ
  );
  String status = "{\"wifi\":true,\"camera\":true,\"audio\":true}";
  pCharStatus->setValue(status.c_str());
  
  pService->start();
  
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(BLE_SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  
  Serial.println("[BLE] Service started, advertising...");
}

void updateBLEBattery(uint8_t level) {
  if (pCharBattery && ble_device_connected) {
    current_battery = constrain(level, 0, 100);
    pCharBattery->setValue(&current_battery, 1);
    pCharBattery->notify();
  }
}

void updateBLEVolume(uint8_t vol) {
  if (pCharVolume && ble_device_connected) {
    current_volume = constrain(vol, 0, 100);
    pCharVolume->setValue(&current_volume, 1);
    pCharVolume->notify();
  }
}
```

**具体位置：在原第 93 行 `// Camera` 注释之前插入以上全部代码（共约 120 行）**

---

### 4. 在 setup() 中调用 BLE 初始化（第 1037 行后）

**位置：** 在所有 `xTaskCreatePinnedToCore` 之后，`wsCam.onEvent` 之前

**原代码：**
```cpp
  xTaskCreatePinnedToCore(taskTTSPlay,    "tts_play",  4096, NULL, 2, NULL, 0);

  wsCam.onEvent([](WebsocketsEvent ev, String){
```

**修改为：**
```cpp
  xTaskCreatePinnedToCore(taskTTSPlay,    "tts_play",  4096, NULL, 2, NULL, 0);

  initBLE();

  wsCam.onEvent([](WebsocketsEvent ev, String){
```

**具体位置：第 1037 行后插入 2 行（1 行调用 + 1 行空行）**

---

## 修改总结

| 位置 | 操作 | 行数 |
|------|------|------|
| 第 15 行后 | 添加 BLE 头文件 | +4 行 |
| 第 92 行后 | 添加 BLE 全局变量定义 | +18 行 |
| 第 93 行前 | 添加 BLE 回调类和初始化函数 | +120 行 |
| 第 1037 行后 | 调用 initBLE() | +2 行 |
| **总计** | | **+144 行** |

## 验证步骤

1. **编译检查**
   - Arduino IDE 编译无错误
   - 确认 BLE 库已正确引入

2. **上传到 ESP32**
   - 选择板子：`XIAO_ESP32S3`
   - 上传代码

3. **串口监视器验证**
   - 应该看到 `[BLE] Initializing...`
   - 应该看到 `[BLE] Service started, advertising...`

4. **小程序连接测试**
   - 打开小程序设备管理页
   - 搜索设备，应该能找到 `AIGlasses-ESP32`
   - 连接后可以控制音量和查看电量

## 注意事项

1. **UUID 必须与小程序匹配**
   - 服务 UUID: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
   - 各特征值 UUID 已在代码中定义

2. **设备名称**
   - BLE 广播名称: `AIGlasses-ESP32`
   - 小程序搜索时显示此名称

3. **音量控制**
   - 当前只是接收并打印，实际硬件控制需要根据你的音频方案调整
   - 可以在 `VolumeCallbacks::onWrite` 中添加实际控制逻辑

4. **电量更新**
   - 定期调用 `updateBLEBattery(level)` 来推送电量变化
   - 可以在 `loop()` 或独立任务中实现
