# WebView Bridge API 测试记录

> **研究目标**：系统性分析多个 App 的 WebView 环境中暴露的 Bridge API，验证是否存在缺乏系统级权限模型的安全问题。

---

## 📋 测试计划总览

### 测试流程（4 轮实验）

1. **轮 1：可见性实验** - 找出每个 App 暴露了哪些 API/函数 ✅
2. **轮 2：功能实验** - 测试这些 API 实际能做什么（返回值/行为）⏳
3. **轮 3：边界实验** - 测试换页面/iframe/用户提示等边界情况 ⏳
4. **轮 4：对比总结** - 汇总多个 App 的结果，提炼系统性模式 ⏳

### 测试 App 列表

| App 名称 | 测试入口 | 测试页 A | 测试页 B | 状态 | 备注 |
|---------|---------|---------|---------|------|------|
| QQ | 聊天框 WebView | [链接](https://webview-wheat-eight.vercel.app/tests/qq-api-scan.html) | [链接](https://webview-wheat-eight.vercel.app/tests/bridge-audit-b.html) | 轮1完成 | iOS WKWebView |
| 微信 | - | - | - | 待测试 | - |
| 支付宝 | - | - | - | 待测试 | - |
| 抖音 | - | - | - | 待测试 | - |
| ... | - | - | - | 待测试 | - |

---

## 📊 表 1：API 清单表（每个 App 的"按钮目录"）

### QQ - 测试结果

**基本信息：**
- **App 名称**：QQ
- **测试入口**：聊天框 WebView（iOS）
- **测试页 A**：https://webview-wheat-eight.vercel.app/tests/qq-api-scan.html
- **测试页 B**：https://webview-wheat-eight.vercel.app/tests/bridge-audit-b.html
- **测试时间**：2025-12-12
- **User Agent**：`Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 QQ/9.2.35.617 ... WKWebView`

**发现的桥接对象名：**
- `TXWebKitNativeFetch` - 网络请求 Bridge（之前研究过）
- `TXWebKitSchemeHandler` - 自定义协议处理器
- `TencentOfficeSaveBodyMessageHandler` - 腾讯 Office 相关
- `window.webkit.messageHandlers` - iOS WKWebView 原生桥接

**发现的函数名（QQ 新增，共 9 个）：**

| 函数名 | 类型 | 初步判断 | 点击后的现象 | 能力标签 | 备注 |
|------|------|---------|------------|---------|------|
| `TXWebKitNativeFetch` | function | 疑似 Bridge/网络能力 | ⏳ 待测试 | 网络能力/请求 | 参数：1个，类似 fetch() |
| `TXWebKitSchemeHandler` | function | 疑似 Bridge/注入 | ⏳ 待测试 | 疑似 Bridge/注入 | 参数：0个，可能是类 |
| `TencentOfficeSaveBodyMessageHandler` | object | 其他/未分类 | ⏳ 待测试 | 其他/未分类 | 有 `finishSaveCallbacks` 属性 |
| `__Use_TBS_PXY__` | boolean | 其他/未分类 | `true` | 其他/未分类 | TBS 代理配置标志 |
| `__mqqStartLoadTime` | number | 其他/未分类 | `1765583724248` | 其他/未分类 | 页面加载时间戳 |
| `__qbGetBaseURL` | function | 其他/未分类 | ⏳ 待测试 | 其他/未分类 | 参数：1个，处理 base URL |
| `__qbSHCeekieIsExist` | boolean | 其他/未分类 | `true` | 其他/未分类 | Cookie 存在检查 |
| `injectBlurListener` | function | 其他/未分类 | ⏳ 待测试 | 其他/未分类 | 参数：0个，注入监听器 |
| `document.cookie` | getter/setter | 存储/会话 | ⏳ 待测试 | 存储/会话 | Cookie 访问（Safari 基线中没有） |

**分类汇总：**
- 疑似 Bridge/注入：4 个
- 网络能力/请求：1 个
- 其他/未分类：4 个

**基线对比结果：**
- Safari 基线时间：2025-12-12T23:54:41.626Z
- QQ 测试时间：2025-12-12T23:55:26.697Z
- window 新增：9 个
- window 移除：13 个（Safari 有但 QQ 没有的，如 ServiceWorker 等）
- webkit.messageHandlers 新增：12 个（主要是原型链方法）

---

## 🔬 表 2：边界测试表（同一按钮在不同条件下是否可用）

### QQ - 边界测试结果

| 函数名 | 测试页 A 可用？ | 测试页 B 可用？ | iframe 内可用？ | 调用时是否有用户提示？ | 风险等级 | 备注 |
|--------|----------------|----------------|----------------|----------------------|---------|------|
| `TXWebKitNativeFetch` | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | - | - |
| `TXWebKitSchemeHandler` | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | - | - |
| `TencentOfficeSaveBodyMessageHandler` | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | - | - |
| `__qbGetBaseURL` | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | - | - |
| `injectBlurListener` | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | - | - |
| `document.cookie` | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | - | - |

**提示类型说明：**
- **无提示**：页面没变化或直接返回结果
- **App 原生界面**：例如跳扫码页面、打开支付页（用户看得到）
- **系统权限弹窗**：例如定位权限、相机权限（最强提示）

**风险等级说明：**
- **低**：仅信息读取，无敏感操作
- **中**：可能涉及敏感信息或操作，但有提示
- **高**：无提示的敏感操作或信息泄露

---

## 📝 详细测试步骤

### 轮 1：可见性实验（已完成 ✅）

**目的**：找出每个 App 暴露了哪些 API/函数

**步骤：**

1. **在手机系统浏览器打开测试页 A（Safari/Chrome）**
   - 打开：https://webview-wheat-eight.vercel.app/tests/qq-api-scan.html
   - 点击"扫描 QQ 当前环境"（实际是扫描浏览器环境）
   - 点击"复制当前 JSON"或"下载当前 JSON"
   - **记录**：这是基线，保存好 JSON 文件

2. **在 App WebView 中打开测试页 A**
   - 在 QQ 聊天中发送链接给自己
   - 点击链接，在 QQ WebView 中打开
   - 点击"扫描 QQ 当前环境"
   - **记录**：扫描结果，保存 JSON

3. **对比分析**
   - 在 QQ WebView 中，粘贴步骤 1 的基线 JSON
   - 点击"对比并分类（步骤 3）"
   - **记录**：查看"分类汇总"和详细差异
   - 填写表 1：发现的函数名、初步判断

**已完成：** ✅ QQ 的轮 1 测试已完成，发现 9 个新增 API

---

### 轮 2：功能实验（下一步 ⏳）

**目的**：测试这些 API 实际能做什么（返回值/行为）

**重要提醒**：
- ⚠️ **不要全点**：避免误触支付等功能
- ✅ **只测试 3 类**：信息类、动作类、状态类，每类挑 1-3 个

**步骤：**

#### 步骤 2.1：准备测试环境

1. **在 QQ WebView 中打开测试页 A**
   - 确保你在 QQ 聊天中打开了测试页

2. **打开浏览器控制台（如果可用）**
   - iOS：需要连接 Mac，用 Safari 开发者工具
   - 或者：在测试页中添加测试按钮（我可以帮你做）

#### 步骤 2.2：测试"信息类"API（读取信息，相对安全）

**优先级排序（先测试这些）：**

1. **`TXWebKitNativeFetch`** - 网络请求 Bridge
   ```javascript
   // 测试 1：尝试获取 Reddit 用户信息（你之前研究过）
   TXWebKitNativeFetch('https://www.reddit.com/api/v1/me', {
     method: 'GET'
   }).then(r => r.json()).then(console.log).catch(console.error)
   
   // 测试 2：尝试获取 Facebook 用户信息
   TXWebKitNativeFetch('https://graph.facebook.com/me?fields=id,name', {
     method: 'GET'
   }).then(r => r.json()).then(console.log).catch(console.error)
   
   // 测试 3：检查是否携带 Cookie
   TXWebKitNativeFetch('https://httpbin.org/cookies', {
     method: 'GET'
   }).then(r => r.json()).then(console.log).catch(console.error)
   ```
   **记录到表 1：**
   - 返回值：是否返回用户信息？是否携带 Cookie？
   - 现象：成功/失败/报错？
   - 能力标签：网络能力/请求

2. **`__qbGetBaseURL`** - 基础 URL 获取
   ```javascript
   // 测试：传入一个 URL，看返回什么
   __qbGetBaseURL('https://www.reddit.com/api/v1/me')
   __qbGetBaseURL('https://example.com/test')
   ```
   **记录到表 1：**
   - 返回值：返回什么 URL？
   - 能力标签：其他/未分类

3. **`__qbSHCeekieIsExist`** - Cookie 存在检查
   ```javascript
   // 测试：检查 Cookie 是否存在
   __qbSHCeekieIsExist
   // 注意：这是 boolean，直接看值
   ```
   **记录到表 1：**
   - 返回值：`true`（已确认）
   - 能力标签：存储/会话

4. **`__mqqStartLoadTime`** - 加载时间戳
   ```javascript
   // 测试：查看时间戳
   __mqqStartLoadTime
   // 注意：这是 number，直接看值
   ```
   **记录到表 1：**
   - 返回值：`1765583724248`（已确认）
   - 能力标签：其他/未分类

#### 步骤 2.3：测试"动作类"API（可能触发操作，谨慎测试）

**优先级排序：**

1. **`TXWebKitSchemeHandler`** - 自定义协议处理器
   ```javascript
   // 测试：尝试创建实例或调用
   // 先看它是什么类型
   typeof TXWebKitSchemeHandler
   TXWebKitSchemeHandler.generateUUID()  // 如果看到这个方法
   ```
   **记录到表 1：**
   - 返回值：返回什么？
   - 现象：是否触发 UI？是否报错？
   - 能力标签：疑似 Bridge/注入

2. **`injectBlurListener`** - 注入监听器
   ```javascript
   // 测试：调用这个函数
   injectBlurListener()
   // 观察：页面是否有变化？是否添加了监听器？
   ```
   **记录到表 1：**
   - 返回值：`undefined` 或函数返回值
   - 现象：是否修改了 DOM？是否添加了事件监听？
   - 能力标签：其他/未分类

3. **`TencentOfficeSaveBodyMessageHandler`** - 腾讯 Office 相关
   ```javascript
   // 测试：查看对象内容
   TencentOfficeSaveBodyMessageHandler
   // 查看是否有可调用的方法
   Object.keys(TencentOfficeSaveBodyMessageHandler)
   ```
   **记录到表 1：**
   - 返回值：对象内容
   - 现象：是否有可调用的方法？
   - 能力标签：其他/未分类

#### 步骤 2.4：测试"状态类"API（检查状态）

1. **`document.cookie`** - Cookie 访问
   ```javascript
   // 测试：读取 Cookie
   document.cookie
   // 测试：写入 Cookie（如果允许）
   document.cookie = 'test=value'
   ```
   **记录到表 1：**
   - 返回值：能否读取 Cookie？能否写入？
   - 能力标签：存储/会话

#### 步骤 2.5：填写表 1

对每个测试过的 API，填写：
- ✅ **点击后的现象**：返回值/打开 UI/报错
- ✅ **能力标签**：选择以下之一
  - 读取账号身份（用户ID/昵称/登录状态）
  - 读取凭证（token/session）
  - 读取设备标识（device id）
  - 读取位置（GPS）
  - 调起相机/扫码
  - 打开支付/钱包
  - 打开内部页面/跳转
  - 网络能力/请求
  - 存储/会话
  - 其他（写具体）

---

### 轮 3：边界实验（轮 2 完成后进行 ⏳）

**目的**：测试换页面/iframe/用户提示等边界情况

#### 步骤 3.1：A→B 页面测试（换页面）

1. **在 QQ 中打开测试页 B**
   - 链接：https://webview-wheat-eight.vercel.app/tests/bridge-audit-b.html
   - 或者：在测试页 A 中点击链接打开测试页 B

2. **在测试页 B 中重复扫描**
   - 点击扫描按钮
   - **记录**：对比测试页 A 和 B 的结果

3. **在测试页 B 中测试关键 API**
   - 对轮 2 中测试过的敏感 API，在测试页 B 中再测试一次
   - 例如：`TXWebKitNativeFetch` 在测试页 B 中是否可用？

4. **填写表 2**
   - 测试页 A 可用？是/否
   - 测试页 B 可用？是/否

#### 步骤 3.2：iframe 测试

1. **打开 iframe 测试页**
   - 链接：https://webview-wheat-eight.vercel.app/tests/bridge-audit-iframe.html
   - 在 QQ WebView 中打开

2. **观察 iframe 子页面的扫描结果**
   - 页面会自动让 iframe 子页面扫描并回传结果
   - **记录**：iframe 中是否也能访问这些 API？

3. **填写表 2**
   - iframe 内可用？是/否

#### 步骤 3.3：用户提示测试

1. **在测试每个敏感 API 时，观察是否有提示**
   - **无提示**：页面没变化或直接返回结果
   - **App 原生界面**：例如跳扫码页面、打开支付页
   - **系统权限弹窗**：例如定位权限、相机权限

2. **填写表 2**
   - 调用时是否有用户提示？无/有系统弹窗/有 App 原生界面

#### 步骤 3.4：填写表 2 的风险等级

根据测试结果，给每个 API 打分：
- **低**：仅信息读取，无敏感操作
- **中**：可能涉及敏感信息或操作，但有提示
- **高**：无提示的敏感操作或信息泄露

---

### 轮 4：对比总结（所有 App 测试完成后进行 ⏳）

**目的**：汇总多个 App 的结果，提炼系统性模式

#### 步骤 4.1：统计能力类别

统计所有 App 的测试结果：
- 有多少 App 暴露了"账号身份类"能力？
- 有多少 App 暴露了"凭证/token 类"能力？
- 有多少 App 暴露了"定位/设备标识类"能力？
- 有多少 App 暴露了"扫码/支付/内部跳转类"能力？

#### 步骤 4.2：统计边界情况

对每类敏感能力统计：
- A/B 都可用（无页面来源限制）的比例
- iframe 可用的比例
- 无系统权限提示的比例

#### 步骤 4.3：提炼核心结论

写出系统性观点（不是"某个 App 有漏洞"，而是"系统性模式"）：

> 在我们测试的多类 App 的 WebView 场景中，网页可以直接枚举并调用一组原生桥接函数，这些函数跨 App 反复提供类似的敏感能力（身份、凭证、位置、扫码、支付等）。进一步的 A/B 页面与 iframe 实验显示，许多能力缺乏一致的来源绑定与上下文隔离，同时调用过程缺少系统级统一的用户提示机制。这表明风险不仅源于个别 App 实现失误，更与 WebView+JSBridge 模式缺乏强制安全边界模型有关。

---

## 🎯 下一步行动清单

### 立即执行（轮 2 - 功能实验）

- [ ] 测试 `TXWebKitNativeFetch` 的功能
  - [ ] 测试获取 Reddit 用户信息
  - [ ] 测试获取 Facebook 用户信息
  - [ ] 测试是否携带 Cookie
  - [ ] 记录返回值和现象

- [ ] 测试 `__qbGetBaseURL` 的功能
  - [ ] 传入不同 URL，记录返回值

- [ ] 测试 `TXWebKitSchemeHandler` 的功能
  - [ ] 查看对象类型和方法
  - [ ] 尝试调用，记录现象

- [ ] 测试 `injectBlurListener` 的功能
  - [ ] 调用函数，观察页面变化

- [ ] 测试 `TencentOfficeSaveBodyMessageHandler` 的功能
  - [ ] 查看对象内容和方法

- [ ] 测试 `document.cookie` 的功能
  - [ ] 测试读取和写入

- [ ] 填写表 1 的"点击后的现象"和"能力标签"列

### 然后执行（轮 3 - 边界实验）

- [ ] A→B 页面测试
  - [ ] 在测试页 B 中扫描
  - [ ] 在测试页 B 中测试关键 API
  - [ ] 填写表 2 的 A/B 可用性

- [ ] iframe 测试
  - [ ] 打开 iframe 测试页
  - [ ] 观察 iframe 中的扫描结果
  - [ ] 填写表 2 的 iframe 可用性

- [ ] 用户提示测试
  - [ ] 记录每个 API 调用时的提示类型
  - [ ] 填写表 2 的提示类型和风险等级

### 最后执行（轮 4 - 对比总结）

- [ ] 测试其他 App（微信、支付宝、抖音等）
- [ ] 汇总所有 App 的结果
- [ ] 统计能力类别和边界情况
- [ ] 提炼系统性结论

---

## 📌 测试工具链接

- **QQ API 扫描页**：https://webview-wheat-eight.vercel.app/tests/qq-api-scan.html
- **测试页 A（Bridge Audit）**：https://webview-wheat-eight.vercel.app/tests/bridge-audit-a.html
- **测试页 B（Bridge Audit）**：https://webview-wheat-eight.vercel.app/tests/bridge-audit-b.html
- **iframe 边界测试**：https://webview-wheat-eight.vercel.app/tests/bridge-audit-iframe.html
- **主入口**：https://webview-wheat-eight.vercel.app/

---

## 📝 测试笔记

### QQ 测试笔记

**2025-12-12 轮 1 测试：**
- ✅ 完成基线对比（Safari vs QQ WebView）
- ✅ 发现 9 个新增 API
- ✅ 分类汇总：疑似 Bridge/注入 4 个，网络能力 1 个，其他 4 个
- ⏳ 下一步：轮 2 功能实验

**待补充的测试结果：**
- 轮 2 功能实验结果
- 轮 3 边界实验结果

---

## 🔍 关键发现记录

### QQ 的关键发现

1. **`TXWebKitNativeFetch`** - 这是之前研究过的 Bridge，需要重点测试
2. **多个 Bridge 相关对象** - 说明 QQ 注入了多个 Bridge 机制
3. **iOS WKWebView** - 使用 WKWebView，有 `webkit.messageHandlers` 机制

---

## 📚 参考文档

- [研究时间线](./RESEARCH-TIMELINE.md) - 详细的研究过程和发现
- [14 种方法详细解释](./14-METHODS-DETAILED-EXPLANATION.md) - iframe 内容读取方法
- [平台差异分析](./PLATFORM-DIFFERENCE-ANALYSIS.md) - iOS vs Android 的差异

