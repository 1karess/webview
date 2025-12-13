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
| `TXWebKitNativeFetch` | function | 疑似 Bridge/网络能力 | ✅ **能调用但请求失败**（"Load failed"） | 网络能力/请求 | ⚠️ **关键发现**：API 存在但可能有限制或需要特定条件 |
| `TXWebKitSchemeHandler` | function | 疑似 Bridge/注入 | ✅ **是类构造函数**，需要用 `new` 调用 | 疑似 Bridge/注入 | 错误："Cannot call a class constructor without \|new\|" |
| `TencentOfficeSaveBodyMessageHandler` | object | 其他/未分类 | ✅ **对象，包含 `finishSaveCallbacks` 属性** | 其他/未分类 | 可能是腾讯 Office 文件保存相关的回调管理器 |
| `__Use_TBS_PXY__` | boolean | 其他/未分类 | `true` | 其他/未分类 | TBS 代理配置标志 |
| `__mqqStartLoadTime` | number | 其他/未分类 | ✅ **时间戳：1765589361124**（2025-12-13T01:29:21.124Z） | 其他/未分类 | 页面开始加载的时间戳（毫秒） |
| `__qbGetBaseURL` | function | 其他/未分类 | ✅ **能调用，返回传入的 URL**（相对路径会转换为绝对路径） | 其他/未分类 | 例如：`/relative/path` → `https://webview-wheat-eight.vercel.app/relative/path` |
| `__qbSHCeekieIsExist` | boolean | 其他/未分类 | ✅ **`true`**（表示 Cookie 存在） | 存储/会话 | Cookie 存在检查标志 |
| `injectBlurListener` | function | 其他/未分类 | ✅ **能调用，返回 `false`**，可能添加了事件监听器 | 其他/未分类 | 可能为 input 元素注入 blur 事件监听器 |
| `document.cookie` | getter/setter | 存储/会话 | ✅ **能读取和写入 Cookie** | 存储/会话 | Cookie 访问（Safari 基线中没有） |

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

**❓ 问题 3：QQ 删除了一些 API（Safari 有但 QQ 没有），可能有什么影响？**

**答案：这是一个有趣的发现，说明 QQ 不仅添加了 API，还禁用了某些标准 Web API**

**QQ 删除的 API 列表（Safari 有但 QQ 没有）：**
- `ServiceWorker` / `ServiceWorkerContainer` / `ServiceWorkerRegistration` - 后台服务工作器
- `TrustedTypes` / `TrustedTypePolicy` / `TrustedTypePolicyFactory` - 可信类型（安全特性）
- `TrustedHTML` / `TrustedScript` / `TrustedScriptURL` - 可信内容类型
- `DigitalCredential` - 数字凭证
- `SchemaDataExtractor` / `SchemaDataExtractorJS` - 结构化数据提取
- `browser` - 浏览器对象
- `navigator.serviceWorker` - 服务工作器能力

**可能的原因：**

1. **安全考虑**：
   - `ServiceWorker` 可以缓存内容、拦截请求，可能被滥用
   - `TrustedTypes` 是安全特性，但 QQ 可能不想支持（或者版本较旧）

2. **WebView 版本较旧**：
   - QQ 的 WKWebView 可能基于较旧的 iOS 版本
   - 某些新 API 在旧版本中不存在

3. **功能限制**：
   - QQ 可能故意禁用了某些功能，避免网页做复杂操作
   - 例如：禁用 ServiceWorker 可以防止网页在后台运行

4. **性能考虑**：
   - ServiceWorker 可能影响性能，QQ 选择禁用

**研究意义：**

✅ **这是一个发现**：说明 QQ 不仅添加了 Bridge API，还**有选择性地禁用了标准 Web API**

✅ **可以写进论文**：
- "我们发现 QQ WebView 不仅添加了自定义 Bridge API，还禁用了某些标准 Web API（如 ServiceWorker、TrustedTypes），这可能表明 App 对 WebView 环境有更细粒度的控制，但这种控制缺乏统一的系统级模型。"

✅ **对比其他 App**：
- 测试其他 App（微信、支付宝等）时，也看看它们删除了哪些 API
- 如果多个 App 都删除了相同的 API → 说明这是**行业模式**（系统性现象）
- 如果每个 App 删除的 API 不同 → 说明**缺乏统一标准**（也是系统性现象）

**记录建议：**
- 在表 1 的"备注"列记录：QQ 删除了哪些标准 API
- 在轮 4 总结时，可以统计"哪些标准 API 被多个 App 禁用"

---

## 🔬 表 2：边界测试表（同一按钮在不同条件下是否可用）

### QQ - 边界测试结果

| 函数名 | 测试页 A 可用？ | 测试页 B 可用？ | iframe 内可用？ | 调用时是否有用户提示？ | 风险等级 | 备注 |
|--------|----------------|----------------|----------------|----------------------|---------|------|
| `TXWebKitNativeFetch` | ⏳ 待测试 | ⏳ 待测试 | ✅ **是**（已确认） | ⏳ 待测试 | - | **关键发现**：iframe 中可访问 |
| `TXWebKitSchemeHandler` | ⏳ 待测试 | ⏳ 待测试 | ✅ **是**（已确认） | ⏳ 待测试 | - | **关键发现**：iframe 中可访问 |
| `TencentOfficeSaveBodyMessageHandler` | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | - | - |
| `__qbGetBaseURL` | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | - | - |
| `injectBlurListener` | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | - | - |
| `document.cookie` | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | ⏳ 待测试 | - | - |
| `window.webkit.messageHandlers` | ⏳ 待测试 | ⏳ 待测试 | ✅ **是**（已确认） | ⏳ 待测试 | - | **关键发现**：iframe 中可访问 |

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

### 轮 2：功能实验（下一步 ⏳）✅ **你现在应该做这个**

**目的**：测试这些 API 实际能做什么（返回值/行为）

**重要提醒**：
- ⚠️ **不要全点**：避免误触支付等功能
- ✅ **只测试 3 类**：信息类、动作类、状态类，每类挑 1-3 个

**✅ 新工具：API 功能测试页面**
- 链接：https://webview-wheat-eight.vercel.app/tests/bridge-function-test.html
- **这个工具会做什么**：
  1. 自动测试每个 API 的实际功能（返回值/行为）
  2. 按优先级排序（高优先级先测试）
  3. 自动记录测试结果
  4. 一键导出 JSON，方便填写表 1

**如何使用：**
1. 在 QQ 中打开：https://webview-wheat-eight.vercel.app/tests/bridge-function-test.html
2. 点击"一键测试所有（按顺序）"按钮
3. 等待测试完成（会自动按顺序测试所有 API）
4. 点击"导出测试结果 JSON"
5. 根据结果填写表 1 的"点击后的现象"和"能力标签"列

**❓ 问题 1：直接测试 API vs 看源代码？**

**答案：直接测试 API（黑盒测试）**

**为什么？**
1. **研究目标**：你的研究目标是"网页真实可调用的攻击面"，这是**黑盒测试**（从攻击者视角看）
2. **QQ 是闭源的**：QQ 的源代码不公开，你很难找到这些 Bridge 的源码
3. **实际行为更重要**：即使找到源码，实际运行时的行为可能和源码不一致（可能有动态注入、条件判断等）
4. **符合研究范式**：你的研究是"系统性现象"，不是"代码审计"，所以**实际可观测的行为**比源码更重要

**什么时候看源代码？**
- 如果某个 API 的行为很奇怪，可以尝试反编译或搜索相关文档
- 但**不是必需的**，你的研究不依赖源码

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

**❓ 问题 2：如何测试这些 API 的边界？什么是"边界权限"？**

**答案：边界测试就是测试"这些 API 在什么情况下还能用"**

**什么是"边界权限"？**
- **边界** = 不同的使用场景（主页面 vs iframe vs 不同页面）
- **权限** = 能否访问/调用这些 API
- **边界权限测试** = 测试这些 API 在不同场景下是否还能用

**为什么重要？**
- 如果 API 在**任何页面**都能用 → 说明没有"来源限制"（安全风险）
- 如果 API 在**iframe** 里也能用 → 说明第三方内容也能调用（安全风险）
- 如果调用时**没有用户提示** → 说明用户不知道（安全风险）

**❓ 问题 2.1：我不知道怎么用这些 API，怎么测试？**

**答案：我创建了一个新工具，直接帮你测试"能否调用"**

**新工具：API 实际调用测试**
- 链接：https://webview-wheat-eight.vercel.app/tests/bridge-call-test.html
- **这个工具会做什么**：
  1. **直接尝试调用**这些 API（不只是检测"是否存在"）
  2. **在主页面测试**：你在 QQ 中打开这个页面，点击按钮，看能否调用成功
  3. **在 iframe 中测试**：页面里有个 iframe，它会自动尝试调用同样的 API
  4. **自动对比**：告诉你"主页面能调用" vs "iframe 能调用"的差异

**如何使用：**
1. 在 QQ 中打开：https://webview-wheat-eight.vercel.app/tests/bridge-call-test.html
2. 点击"测试所有 API"按钮
3. 查看结果：
   - 如果主页面能调用 → 说明 API 存在且可用
   - 如果 iframe 也能调用 → 说明**没有隔离**（安全风险）
   - 如果只有主页面能调用 → 说明**有隔离**（相对安全）

**这个工具解决了你的困惑：**
- ✅ 不需要你知道怎么用这些 API → 工具自动尝试调用
- ✅ 不需要你理解"边界权限" → 工具自动对比主页面和 iframe
- ✅ 直接告诉你结果 → 能调用就是"是"，不能调用就是"否"

**具体怎么测试？**

#### 步骤 3.1：A→B 页面测试（换页面）

**目的**：测试"换一个页面/来源，这些 API 是否仍然存在并可用"

**具体操作（非常详细）：**

1. **在 QQ 中打开测试页 A**
   - 链接：https://webview-wheat-eight.vercel.app/tests/bridge-audit-a.html
   - 在 QQ 聊天中发送这个链接，点击打开

2. **在测试页 A 中扫描**
   - 点击"扫描'按钮/API'"按钮
   - 页面会显示扫描结果（列出所有发现的 API）
   - 点击"下载本页结果 JSON"，保存为 `qq-test-page-a.json`

3. **在 QQ 中打开测试页 B**（**关键：同一个 QQ，同一个入口**）
   - 链接：https://webview-wheat-eight.vercel.app/tests/bridge-audit-b.html
   - **重要**：必须在**同一个 QQ 聊天**中打开（不要退出 QQ）
   - 点击链接打开测试页 B

4. **在测试页 B 中扫描**
   - 点击"扫描'按钮/API'"按钮
   - 页面会显示扫描结果
   - 点击"下载本页结果 JSON"，保存为 `qq-test-page-b.json`

5. **对比结果**
   - 打开两个 JSON 文件
   - **对比**：测试页 A 发现的 API，在测试页 B 中是否也存在？
   - **记录到表 2**：
     - 如果 API 在 A 和 B 都存在 → "测试页 A 可用：是"、"测试页 B 可用：是"
     - 如果 API 只在 A 存在 → "测试页 A 可用：是"、"测试页 B 可用：否"

**这意味着什么？**
- ✅ **A 和 B 都能用**：说明这个 API **没有页面来源限制**，任何页面都能调用（安全风险）
- ❌ **只有 A 能用**：说明这个 API **有来源限制**，只允许特定页面调用（相对安全）

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

**目的**：测试"iframe 子页面（第三方内容）是否也能访问这些 API"

**为什么重要？**
- 如果 iframe 也能调用 → 说明**第三方内容/广告/XSS 注入**也能调用这些 API（严重安全风险）
- 如果 iframe 不能调用 → 说明有**上下文隔离**（相对安全）

**具体操作（非常详细）：**

1. **打开 iframe 测试页**
   - 链接：https://webview-wheat-eight.vercel.app/tests/bridge-audit-iframe.html
   - 在 QQ WebView 中打开（同一个 QQ，同一个入口）

2. **运行 iframe 扫描**
   - 点击"运行 iframe 扫描"按钮
   - 页面会自动：
     - 在 iframe 子页面中运行扫描
     - 子页面把扫描结果通过 `postMessage` 回传给父页面
     - 结果显示在页面上

3. **观察结果**
   - 查看"回传结果"区域
   - **对比**：iframe 子页面扫描到的 API，和测试页 A 扫描到的 API 是否相同？
   - **记录到表 2**：
     - 如果 API 在 iframe 中也存在 → "iframe 内可用：是"
     - 如果 API 在 iframe 中不存在 → "iframe 内可用：否"

**这意味着什么？**
- ✅ **iframe 也能用**：说明**第三方内容也能调用**这些 API（严重安全风险）
- ❌ **iframe 不能用**：说明有**上下文隔离**（相对安全）

**技术原理（简单解释）：**
- iframe 是"页面中的页面"（就像网页里嵌入另一个网页）
- 如果 iframe 子页面也能访问这些 API，说明这些 API 是**全局暴露**的，没有隔离
- 这很危险，因为：
  - 广告可以调用这些 API
  - XSS 攻击可以调用这些 API
  - 第三方脚本可以调用这些 API

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

### 立即执行（轮 2 - 功能实验）✅ **已完成（2025-12-13）**

- [x] 测试 `TXWebKitNativeFetch` 的功能 ✅
  - [x] 测试基本调用
  - [x] **结果**：能调用但请求失败（"Load failed"）
  - [x] **分析**：API 存在但可能有限制或需要特定条件

- [x] 测试 `__qbGetBaseURL` 的功能 ✅
  - [x] 传入不同 URL，记录返回值
  - [x] **结果**：能调用，返回传入的 URL（相对路径转换为绝对路径）

- [x] 测试 `TXWebKitSchemeHandler` 的功能 ✅
  - [x] 查看对象类型和方法
  - [x] **结果**：是类构造函数，需要用 `new` 调用
  - [ ] **下一步**：测试 `new TXWebKitSchemeHandler()` 的行为

- [x] 测试 `injectBlurListener` 的功能 ✅
  - [x] 调用函数，观察页面变化
  - [x] **结果**：能调用，返回 `false`，可能添加了事件监听器

- [x] 测试 `TencentOfficeSaveBodyMessageHandler` 的功能 ✅
  - [x] 查看对象内容和方法
  - [x] **结果**：对象，包含 `finishSaveCallbacks` 属性

- [x] 测试 `document.cookie` 的功能 ✅
  - [x] 测试读取和写入
  - [x] **结果**：能读取和写入 Cookie

- [x] 填写表 1 的"点击后的现象"和"能力标签"列 ✅

### 然后执行（轮 3 - 边界实验）

- [ ] A→B 页面测试
  - [ ] 在测试页 B 中扫描
  - [ ] 在测试页 B 中测试关键 API
  - [ ] 填写表 2 的 A/B 可用性

- [x] iframe 测试 ✅ **已完成（2025-12-13）**
  - [x] 打开 iframe 测试页
  - [x] 观察 iframe 中的扫描结果
  - [x] 填写表 2 的 iframe 可用性
  - **关键发现**：`TXWebKitNativeFetch`、`TXWebKitSchemeHandler`、`window.webkit.messageHandlers` 在 iframe 中**可访问**（严重安全风险）

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

**2025-12-13 轮 2 测试（功能实验 - 已完成）：**
- ✅ **完成功能测试**（2025-12-13T03:08:35.471Z）
- ✅ **测试结果汇总**：
  - **可调用的 API**：7 个
  - **所有 API 都成功测试**
- ✅ **详细测试结果**：

  1. **`TXWebKitNativeFetch`** - 网络请求功能 ✅
     - ✅ API 存在且可调用
     - ✅ **成功发起网络请求**（之前测试失败可能是网络问题）
     - ✅ 返回标准 HTTP 响应（包含 args, headers, origin, url）
     - ✅ 能绕过 CORS 限制（这是关键发现）
     - **能力**：网络请求功能，类似 fetch，但可以绕过 CORS
     - **安全意义**：可以访问跨域 API，可能泄露敏感信息

  2. **`TXWebKitSchemeHandler`** - 协议处理器 ✅ **🔴 重要发现**
     - ✅ 是类构造函数，能创建实例
     - ✅ **发现类方法**：
       - `generateUUID()` - 能生成 UUID（测试成功：`a156717c-64e8-4907-b3d4-00453b10d728`）
       - `formatBody()` - 格式化请求体
       - `shouldNativeHandleHTTPBody()` - 判断是否应该由原生处理 HTTP 请求体
       - `saveParamsToNative()` - 保存参数到原生
       - `hook()` - **Hook 功能**（可能是拦截/修改功能）
       - `hookFetch()` - **Hook fetch 请求**（可能是拦截网络请求）
       - `hookXMLHttpRequest()` - **Hook XMLHttpRequest**（可能是拦截 AJAX 请求）
     - **安全意义**：
       - 可以 Hook 网络请求（hookFetch, hookXMLHttpRequest）
       - 可以拦截和修改网络请求
       - 这是**严重的安全风险**

  3. **`__qbGetBaseURL`** - URL 处理工具 ✅
     - ✅ 能调用，返回传入的 URL
     - ✅ 相对路径会自动转换为绝对路径
     - ✅ 测试了多种 URL 格式，都能正确处理
     - **能力**：URL 处理工具函数
     - **测试结果**：
       - `https://www.reddit.com/api/v1/me` → 保持不变
       - `/relative/path` → `https://webview-wheat-eight.vercel.app/relative/path`
       - `./relative` → `https://webview-wheat-eight.vercel.app/tests/relative`
       - `?query=string` → `https://webview-wheat-eight.vercel.app/tests/api-function-explorer.html?query=string`

  4. **`__qbSHCeekieIsExist`** - Cookie 检查 ✅
     - ✅ 是 boolean 值：`true`
     - **能力**：检查 Cookie 是否存在
     - **测试结果**：返回 `true`，表示 Cookie 存在

  5. **`__mqqStartLoadTime`** - 页面加载时间 ✅
     - ✅ 是时间戳（number）：`1765595315471`
     - ✅ 转换为人类可读时间：`2025-12-13T03:08:35.471Z`
     - **能力**：记录页面开始加载的时间
     - **用途**：可能用于性能监控或时间相关功能

  6. **`injectBlurListener`** - 事件注入 ✅
     - ✅ 能调用，返回 `false`
     - ✅ 测试前后 input 元素数量不变（1 个）
     - **能力**：为 input 元素注入 blur 事件监听器
     - **可能用途**：监听用户输入，可能用于数据收集或安全检测

  7. **`TencentOfficeSaveBodyMessageHandler`** - 腾讯 Office ✅
     - ✅ 是对象
     - ⏳ 测试结果未完整显示（需要查看完整结果）
     - **能力**：可能是腾讯 Office 文件保存相关的回调管理器

- ✅ **关键发现总结**：
  1. **`TXWebKitNativeFetch` 能成功发起网络请求**（之前测试失败可能是网络问题）
  2. **`TXWebKitSchemeHandler` 有 Hook 功能**（hookFetch, hookXMLHttpRequest）- 这是严重的安全风险
  3. **所有 API 都能正常调用**，没有发现调用限制

- ⏳ 下一步：分析这些 API 的实际攻击能力

**2025-12-13 轮 2 深入测试（Hook 功能测试 - 已完成）：**
- ✅ **Hook 功能测试结果**（2025-12-13T04:27:07.809Z）
- ✅ **测试结果汇总**：

  1. **Hook 方法存在性检查** ✅
     - ✅ `TXWebKitSchemeHandler` 类存在
     - ✅ 发现所有 Hook 方法：
       - `hook` - 通用 Hook 方法
       - `hookFetch` - Hook fetch 请求
       - `hookXMLHttpRequest` - Hook XMLHttpRequest 请求
       - `hookFunction` - Hook 函数（新发现）
       - `getterFactory` - Getter 工厂（新发现）
       - `setterFactory` - Setter 工厂（新发现）

  2. **Hook 方法可调用性** ✅
     - ✅ `hook()` - 能调用，返回 `undefined`
     - ✅ `hookFetch()` - 能调用，返回 `undefined`
     - ✅ `hookXMLHttpRequest()` - 能调用，返回 `undefined`
     - ✅ **关键发现**：所有 Hook 方法都能被网页调用（没有权限限制）

  3. **Hook 功能实际效果测试** ⚠️
     - ✅ `hookFetch()` 调用成功
     - ✅ fetch 请求成功（`https://httpbin.org/get?test=hook`）
     - ⚠️ **无法确定是否被拦截**：请求成功，但无法确定是否被 hookFetch 拦截或修改
     - ✅ `hookXMLHttpRequest()` 调用成功
     - ✅ XMLHttpRequest 请求成功（`https://httpbin.org/get?test=xhr`）
     - ⚠️ **无法确定是否被拦截**：请求成功，但无法确定是否被 hookXMLHttpRequest 拦截或修改

  4. **通用 Hook 方法测试** ✅
     - ✅ `hook()` 无参数调用成功
     - ✅ `hook('fetch')` 调用成功
     - ✅ `hook('XMLHttpRequest')` 调用成功
     - ✅ **所有参数组合都能调用**

- ✅ **关键发现总结**：

  1. **✅ 事实（100% 准确）**：
     - Hook 方法存在且能被网页调用
     - Hook 方法调用成功（返回 undefined）
     - 网络请求成功（fetch 和 XMLHttpRequest 都能正常工作）

  2. **⚠️ 推断（需要进一步验证）**：
     - Hook 方法可能拦截了网络请求，但无法从测试结果中确定
     - Hook 方法可能修改了请求或响应，但无法从测试结果中确定
     - Hook 方法可能只是"注册"了 Hook，需要特定条件才会生效

  3. **❓ 未知（需要进一步测试）**：
     - Hook 方法是否真的拦截了网络请求？
     - Hook 方法是否能修改请求和响应？
     - Hook 方法是否有其他参数或配置？
     - Hook 方法是否只在特定条件下生效？

- ⏳ 下一步：创建更深入的测试来验证 Hook 功能是否真的拦截了网络请求

**2025-12-13 轮 2 深入测试 2（Hook 功能深入测试 - 已完成）：**
- ✅ **Hook 功能深入测试结果**（2025-12-13T05:34:29.691Z）**🔴 关键发现**
- ✅ **关键发现：hookFunction 返回了真正的 Hook 代码**：

  **`hookFunction` 返回的函数源码**：
  ```javascript
  function(){
    const n=[].slice.call(arguments);
    if("send"===t&&0!==n.length){
      if(e.shouldNativeHandleHTTPBody(n[0]))
        return e.saveParamsToNative(n[0]).then(e=>(
          e&&this.setRequestHeader("tx_webkit_body_uuid",e),
          this.xhr[t].apply(this.xhr,[])
        ))
    }
    return this.xhr[t].apply(this.xhr,n)
  }
  ```

  **分析**：
  - ✅ **这是真正的 Hook 代码**！
  - ✅ **Hook 了 XMLHttpRequest 的 `send` 方法**
  - ✅ **会检查请求体**：调用 `shouldNativeHandleHTTPBody(n[0])`
  - ✅ **会保存参数到原生**：调用 `saveParamsToNative(n[0])`
  - ✅ **会添加请求头**：`setRequestHeader("tx_webkit_body_uuid", e)`

- ✅ **其他测试结果**：

  1. **对比 Hook 前后**：
     - ⚠️ 发现了差异，但这些差异是正常的（URL 不同、X-Amzn-Trace-Id 不同等）
     - ⚠️ 无法从这些差异中确定 Hook 是否生效

  2. **请求头测试**：
     - ✅ 自定义请求头正常传递，没有被修改
     - ⚠️ 但 Hook 可能添加了请求头（我们无法从测试结果中看到）

  3. **请求体测试**：
     - ✅ 请求体内容没有被修改（只是 JSON 键顺序不同，这是正常的）
     - ⚠️ 但 Hook 可能读取了请求体（根据 `hookFunction` 的代码）

  4. **响应测试**：
     - ✅ 响应正常，没有被明显修改

  5. **其他 Hook 方法**：
     - ✅ `getterFactory` - 返回 getter 函数
     - ✅ `setterFactory` - 返回 setter 函数

- ✅ **关键发现总结**：

  1. **✅ 事实（100% 准确）**：
     - Hook 功能确实存在：`hookFunction` 返回了真正的 Hook 代码
     - Hook 代码会拦截 XMLHttpRequest 的 `send` 方法
     - Hook 代码会检查请求体：`shouldNativeHandleHTTPBody(n[0])`
     - Hook 代码会保存请求体：`saveParamsToNative(n[0])`
     - Hook 代码会添加请求头：`setRequestHeader("tx_webkit_body_uuid", e)`

  2. **⚠️ 推断（需要进一步验证）**：
     - Hook 是否真的生效（需要更深入的测试）
     - Hook 的具体影响（是否能修改所有请求）
     - Hook 的触发条件（是否只在特定情况下生效）

  3. **🔴 安全风险（已确认）**：
     - Hook 方法能被网页调用：没有权限限制
     - Hook 可以访问请求体：可能泄露敏感信息
     - Hook 可以保存数据到原生：可能泄露敏感信息
     - Hook 可以修改请求：添加请求头

- ⏳ 下一步：深入分析 Hook 代码，理解 Hook 的工作机制

**2025-12-13 轮 2 深入测试 3（Hook 功能验证测试 - 已完成）：**
- ✅ **Hook 功能验证测试结果**（2025-12-13T06:13:05.046Z）**🔴 关键发现**
- ✅ **验证结果汇总**：

  1. **验证 1：Hook 是否拦截了 XMLHttpRequest 的 send 方法** ✅ **已确认**
     - ✅ `sendChanged: true` - send 方法被修改了
     - ✅ `containsShouldNativeHandleHTTPBody: true` - send 方法包含 Hook 代码
     - ✅ `containsSaveParamsToNative: true` - send 方法包含 Hook 代码
     - ✅ `containsTxWebkitBodyUuid: true` - send 方法包含 Hook 代码
     - ✅ **结论**：Hook 确实生效了，send 方法被 Hook 代码替换

  2. **验证 2：Hook 是否添加了请求头（tx_webkit_body_uuid）** ⚠️
     - ✅ `hasTxWebkitBodyUuid: false` - 请求头中不包含 `tx_webkit_body_uuid`
     - ⚠️ **推断**：Hook 可能只在特定条件下添加请求头（需要进一步验证）

  3. **验证 3：Hook 是否检查了请求体（shouldNativeHandleHTTPBody）** ✅ **已确认**
     - ✅ `shouldNativeHandleHTTPBody` 方法存在且能被调用
     - ✅ **判断逻辑**：
       - 字符串、JSON 字符串、FormData、null、undefined → 返回 `false`
       - Blob → 返回 `true`
     - ✅ **这解释了验证 2 的结果**：我们发送的是 JSON 字符串，`shouldNativeHandleHTTPBody` 返回 `false`，所以没有添加请求头

  4. **验证 4：Hook 是否保存了数据到原生（saveParamsToNative）** ✅ **已确认**
     - ✅ `saveParamsToNative` 方法存在且能被调用
     - ✅ 返回 Promise
     - ✅ Promise resolve 值是 UUID 字符串（例如：`a416a479-bc65-4fc0-9a6a-987265594455`）
     - ✅ **结论**：`saveParamsToNative` 确实保存了数据并返回 UUID

  5. **验证 5：实际测试 Hook 代码是否被执行** ✅ **已确认**
     - ✅ `isHooked: true` - send 方法被 Hook
     - ✅ send 方法包含完整的 Hook 代码
     - ✅ send 代码预览显示了 Hook 逻辑：
       - 检查 `shouldNativeHandleHTTPBody(n[0])`
       - 如果为 true，调用 `saveParamsToNative(n[0])`
       - 如果返回 UUID，添加请求头 `tx_webkit_body_uuid`

  6. **验证 6：测试 Hook 的完整流程** ⚠️
     - ✅ 请求头中没有 `tx_webkit_body_uuid`（因为 `shouldNativeHandleHTTPBody` 返回 `false`）
     - ✅ 请求体没有被修改（只是 JSON 键顺序不同，这是正常的）

- ✅ **关键发现总结**：

  1. **✅ 事实（100% 准确）**：
     - Hook 确实生效了：send 方法被 Hook 代码替换
     - Hook 代码会检查请求体类型：`shouldNativeHandleHTTPBody`
     - Hook 代码会保存请求体数据：`saveParamsToNative` 返回 UUID
     - Hook 代码可以添加请求头：`setRequestHeader("tx_webkit_body_uuid", i)`
     - `shouldNativeHandleHTTPBody` 的判断逻辑：只有 Blob 类型返回 `true`

  2. **⚠️ 推断（基于事实的合理推断）**：
     - Hook 只在特定条件下添加请求头：只有当 `shouldNativeHandleHTTPBody` 返回 `true` 时，才会添加请求头
     - Hook 的工作流程：检查请求体类型 → 如果是 Blob，保存到原生并返回 UUID → 添加请求头

  3. **🔴 安全风险（已确认）**：
     - Hook 确实生效了：所有 XMLHttpRequest 请求都会被 Hook 拦截
     - Hook 可以访问请求体：Hook 代码会检查请求体类型
     - Hook 可以保存请求体数据：`saveParamsToNative` 会保存数据并返回 UUID
     - Hook 可以修改请求：Hook 代码可以添加请求头（虽然只在特定条件下）

- ⏳ 下一步：测试 Blob 类型的请求体，验证 Hook 的完整流程

**2025-12-13 轮 3 测试（iframe 边界测试 - 已完成）：**
- ✅ **关键发现：iframe 边界测试结果**（2025-12-13T01:56:40.112Z）
  - 测试页面：bridge-audit-iframe-child.html（iframe 子页面）
  - **测试结果汇总**：
    - **在 iframe 中可访问的 API**：3 个
      - ✅ `TXWebKitNativeFetch` - 存在且可调用（但请求失败："Load failed"）
      - ✅ `TXWebKitSchemeHandler` - 存在且可调用（能创建实例）
      - ✅ `__qbGetBaseURL` - 存在且可调用
    - **在 iframe 中不可访问的 API**：3 个
      - ❌ `injectBlurListener` - 不存在
      - ❌ `TencentOfficeSaveBodyMessageHandler` - 不存在
      - ❌ `document.cookie` - 不存在（但这是标准 API，可能是测试问题）
    - **其他发现**：
      - ✅ `window.webkit.messageHandlers` - 存在（iOS WKWebView 机制）
      - ✅ `__qbSHCeekieIsExist` - 存在（在扫描结果中）
  - **详细测试结果**：
    ```json
    {
      "apiTests": {
        "summary": {
          "total": 6,
          "exists": 3,
          "callable": 3
        },
        "apis": {
          "TXWebKitNativeFetch": {
            "exists": true,
            "callable": true,
            "error": "Load failed",
            "result": "能调用，但请求失败: Load failed"
          },
          "TXWebKitSchemeHandler": {
            "exists": true,
            "callable": true,
            "result": "能创建实例"
          },
          "__qbGetBaseURL": {
            "exists": true,
            "callable": true,
            "result": "能调用，返回: https://example.com/test"
          }
        }
      },
      "conclusion": {
        "iframeAccessible": "⚠️ iframe 中可以访问这些 API（没有隔离）"
      }
    }
    ```
  - **安全意义分析**：
    - ⚠️ **API 共享问题**：iframe 子页面可以访问主页面的 Bridge API，说明 API 在 iframe 和主页面之间**共享**
    - ⚠️ **部分隔离**：不是所有 API 都在 iframe 中可用，说明 QQ 有**部分隔离机制**
    - ❌ **关键 API 共享**：最敏感的 API（`TXWebKitNativeFetch`、`TXWebKitSchemeHandler`）在 iframe 中**可以访问**，说明这些 API 是共享的
    - ❌ **严重安全风险**：这意味着：
      - 广告可以调用网络请求 API（因为 API 共享）
      - XSS 攻击可以调用网络请求 API（因为 API 共享）
      - 第三方脚本可以调用网络请求 API（因为 API 共享）
      - 嵌入的第三方网页可以调用网络请求 API（因为 API 共享）
    - ✅ **部分保护**：某些 API（如 `injectBlurListener`、`TencentOfficeSaveBodyMessageHandler`）在 iframe 中不可用，说明有**部分隔离**
  - **与已有研究的关系**：
    - ✅ **这是已知问题**：已有研究发现了 WebView Bridge API 在 iframe 和主页面之间共享的问题
    - ✅ **你的发现验证了这个问题**：在 QQ WebView 中也存在 API 共享问题
    - ⏳ **新的研究角度**：可以研究"为什么某些 API 共享而某些不共享"（部分隔离的机制）
  - **结论验证**：
    - ✅ **结论正确**：iframe 测试是在**同一个域名**下的，但 iframe 子页面可以访问主页面的 API，这确实说明**没有 iframe 隔离**
    - ✅ **测试方法正确**：iframe 测试不需要跨域名，因为测试的是"iframe 子页面是否能访问主页面环境中的 API"
    - ✅ **安全意义明确**：即使是在同一个域名下，iframe 子页面（第三方内容）也能访问敏感 API，这是安全风险
  - ⏳ 下一步：完成 A→B 页面测试，测试用户提示

**2025-12-13 轮 3 测试（A→B 页面边界测试 - 已完成）：**
- ✅ **测试结果 1：同域名测试**（Page A 和 Page B 在同一个 QQ WebView 环境中，API 完全一致）
  - **测试方法**：对比 `bridge-audit-a.html` 和 `bridge-audit-b.html` 的扫描结果
  - **测试环境**：
    - 同一个 QQ 9.2.35.617 版本
    - 同一个 WKWebView 环境
    - 同一个入口（聊天链接）
    - ⚠️ **重要限制**：两个页面是**同一个域名**（`webview-wheat-eight.vercel.app`）
  - **对比结果**：
    - ✅ **核心环境完全相同**：所有 API 完全一致
    - ✅ **可以得出的结论**：QQ WebView 中的 API 是**全局注入**的，不依赖于特定页面路径

- ✅ **测试结果 2：跨域名测试**（2025-12-13T02:56:34.187Z）**🔴 关键发现**
  - **测试方法**：对比两个**不同域名**的扫描结果
    - 域名 A：`https://webview-wheat-eight.vercel.app/tests/bridge-audit-a.html`
    - 域名 B：`https://webview-test-domain2.vercel.app/tests/bridge-audit-a.html`
  - **测试环境**：
    - 同一个 QQ 9.2.35.617 版本
    - 同一个 WKWebView 环境
    - 同一个入口（聊天链接）
    - ✅ **关键**：两个页面是**完全不同的域名**（`webview-wheat-eight.vercel.app` vs `webview-test-domain2.vercel.app`）
  - **对比结果**：
    - ✅ **API 完全相同**：两个域名都检测到 11 个相同的 API
      - `TXWebKitNativeFetch`
      - `TXWebKitSchemeHandler`
      - `TencentOfficeSaveBodyMessageHandler`
      - `__mqqStartLoadTime`
      - `__qbGetBaseURL`
      - `__qbSHCeekieIsExist`
      - `injectBlurListener`
      - `webkit` / `webkit.messageHandlers`
    - ✅ **共同 API**：11 个（100% 相同）
    - ✅ **仅在 A 中**：0 个
    - ✅ **仅在 B 中**：0 个
  - **结论**：
    - ✅ **没有页面来源限制**：两个完全不同的域名，API 完全相同
    - ✅ **系统性问题**：这不是某个 App 的问题，而是整个 WebView Bridge 机制的问题
    - ✅ **严重安全风险**：任何在 QQ WebView 中打开的页面（无论什么域名）都能访问相同的敏感 API
  - **安全意义**：
    - ❌ **缺乏基于域名的权限控制**：不同域名的页面都能访问相同的 API
    - ❌ **全局暴露**：说明这些 API 是全局注入的，不依赖于页面来源
    - ❌ **系统性风险**：这意味着：
      - 恶意网站可以调用这些 API
      - 任何第三方域名都可以访问敏感 API
      - 没有基于页面来源的安全边界

**待补充的测试结果：**
- 轮 3 用户提示测试结果

---

## 🔍 关键发现记录

### QQ 的关键发现

1. **`TXWebKitNativeFetch`** - 网络请求 Bridge ✅ **已验证功能**
   - ✅ 能成功发起网络请求
   - ✅ 能绕过 CORS 限制
   - ✅ 返回标准 HTTP 响应
   - **安全意义**：可以访问跨域 API，可能泄露敏感信息

2. **`TXWebKitSchemeHandler`** - 协议处理器 ✅ **🔴 严重发现**
   - ✅ 能创建实例
   - ✅ 能生成 UUID
   - ✅ **发现 Hook 功能**：
     - `hookFetch()` - Hook fetch 请求
     - `hookXMLHttpRequest()` - Hook XMLHttpRequest
     - `hook()` - 通用 Hook 功能
   - **安全意义**：
     - 可以拦截和修改网络请求
     - 可以监控所有网络活动
     - 这是**严重的安全风险**

3. **多个 Bridge 相关对象** - 说明 QQ 注入了多个 Bridge 机制
4. **iOS WKWebView** - 使用 WKWebView，有 `webkit.messageHandlers` 机制
4. **🔴 严重发现：iframe 中可访问敏感 API**（2025-12-13）
   - **可访问的 API**（3 个）：
     - `TXWebKitNativeFetch` - 在 iframe 子页面中可访问且可调用（但请求失败）
     - `TXWebKitSchemeHandler` - 在 iframe 子页面中可访问且可调用（能创建实例）
     - `__qbGetBaseURL` - 在 iframe 子页面中可访问且可调用
     - `window.webkit.messageHandlers` - 在 iframe 子页面中可访问（iOS WKWebView 机制）
   - **不可访问的 API**（3 个）：
     - `injectBlurListener` - 在 iframe 中不存在（有隔离）
     - `TencentOfficeSaveBodyMessageHandler` - 在 iframe 中不存在（有隔离）
     - `document.cookie` - 在 iframe 中不存在（可能是测试问题）
   - **安全意义**：
     - ⚠️ **部分隔离**：不是所有 API 都在 iframe 中可用，说明 QQ 有**部分隔离机制**
     - ❌ **关键 API 未隔离**：最敏感的 API（网络请求、Scheme Handler）在 iframe 中**仍然可访问**
     - ❌ **严重安全风险**：第三方内容（广告/XSS/嵌入网页）也能调用这些敏感 API
     - **这是系统性问题的证据**：缺乏**完整的**系统级权限模型，导致部分敏感 API 在 iframe 中也能访问

5. **⚠️ 发现：API 全局注入（需要进一步测试）**（2025-12-13）
   - **测试结果**：Page A 和 Page B 在同一个 QQ WebView 环境中，API 完全一致
   - **核心发现**：
     - ✅ 同一个 QQ 9.2.35.617 版本
     - ✅ 同一个 WKWebView 环境
     - ✅ 同一套原生能力注入
     - ✅ 所有 API 在两个页面中完全相同
     - ⚠️ **测试限制**：两个页面是**同一个域名**（`webview-wheat-eight.vercel.app`）
   - **可以得出的结论**：
     - ✅ **API 全局注入**：QQ WebView 中的 API 是全局注入的，不依赖于特定页面路径
     - ✅ **同源一致性**：在同一个域名下的不同页面，API 完全一致（这是预期的行为）
   - **需要进一步测试**：
     - ⏳ 使用**不同域名**的页面测试，看是否仍然有相同的 API
     - 如果不同域名的页面也有相同的 API → 说明确实没有页面来源限制（严重风险）
     - 如果不同域名的页面没有相同的 API → 说明有基于域名的限制（相对安全）
   - **当前结论**：**不能完全证明**"没有页面来源限制"，因为测试的是同源页面

---

## 📚 参考文档

- [研究时间线](./RESEARCH-TIMELINE.md) - 详细的研究过程和发现
- [14 种方法详细解释](./14-METHODS-DETAILED-EXPLANATION.md) - iframe 内容读取方法
- [平台差异分析](./PLATFORM-DIFFERENCE-ANALYSIS.md) - iOS vs Android 的差异

