# 🔍 关键发现：通过 Performance API 检测 iframe 登录状态

## 测试结果分析

### 测试条件
- **用户已登录 Reddit**（账号：karess）
- **测试时间**：2025-12-06 02:38:03
- **测试环境**：QQ WebView

### 关键发现：方法4 检测到 API 请求！

```json
"方法4": {
  "detectedResources": [
    {
      "url": "https://www.reddit.com/",
      "type": "iframe",
      "size": 0,
      "duration": 1042
    },
    {
      "url": "https://oauth.reddit.com/api/v1/me",
      "type": "fetch",
      "size": 0,
      "duration": 185
    }
  ]
}
```

## 🎯 核心发现

### 1. **Performance API 可以检测到 iframe 内部的 API 请求**

虽然我们无法直接访问 iframe 的内容（受同源策略限制），但 **Performance API 可以检测到 iframe 内部发起的网络请求**！

- ✅ 检测到了 `https://oauth.reddit.com/api/v1/me` 请求
- ✅ 这是 Reddit 的**用户信息 API**
- ✅ 说明 iframe 内部确实在尝试获取用户信息

### 2. **为什么 Bridge 检测不到登录状态？**

```json
"方法12": {
  "tests": {
    "redditAPI": {
      "status": 200,
      "hasUserData": false,
      "allFields": ["features"],
      "loggedIn": false
    }
  }
}
```

**原因分析**：
- Bridge（`TXWebKitNativeFetch`）**不携带 Cookie**
- 当 Bridge 访问 `/api/v1/me` 时，Reddit 返回的是**匿名用户数据**（只有 `features` 字段）
- 但 iframe 内部访问同样的 API 时，**会携带 Cookie**，所以能获取到用户信息

### 3. **为什么方法11（URL检测）检测不到登录状态？**

```json
"方法11": {
  "currentSrc": "https://www.reddit.com/",
  "detection": {
    "pathname": "/",
    "loginStatus": "在主页（无法确定登录状态）"
  }
}
```

**原因分析**：
- Reddit 是 **SPA（单页应用）**
- 登录后 URL **不会变化**，仍然显示 `https://www.reddit.com/`
- 所以无法通过 URL 判断登录状态

## 💡 实际意义

### 这个发现说明了什么？

1. **侧信道攻击的可能性**
   - 即使无法直接读取 iframe 内容
   - 但可以通过 **Performance API** 检测到 iframe 内部的网络请求
   - 如果检测到 `/api/v1/me` 请求，说明用户可能已登录

2. **隐私泄露风险**
   - 外部页面可以检测到 iframe 内部的 API 调用
   - 通过分析 API 请求模式，可以推断用户的登录状态
   - 这是一个**侧信道信息泄露**

3. **为什么 Bridge 无法检测？**
   - Bridge 不携带 Cookie，所以无法获取用户信息
   - 但 iframe 内部可以正常访问（因为会携带 Cookie）
   - 这说明了 **Cookie 隔离**的存在

## 🔬 技术原理

### Performance API 的工作原理

```
用户访问页面
  ↓
iframe 加载 Reddit
  ↓
Reddit 内部发起 API 请求（/api/v1/me）
  ↓
浏览器记录到 Performance API
  ↓
外部页面可以读取 Performance API
  ↓
检测到 API 请求 → 推断登录状态
```

### 同源策略的限制

- ❌ 无法访问 `iframe.contentDocument`
- ❌ 无法访问 `iframe.contentWindow.location`
- ❌ 无法读取 iframe 内部的 DOM
- ✅ 但可以检测到 iframe 内部的**网络请求**（通过 Performance API）

## 📊 对比分析

| 方法 | 能否检测登录状态 | 原因 |
|------|----------------|------|
| 方法1-3 | ❌ | 受同源策略限制 |
| **方法4** | ✅ | **可以检测到 API 请求** |
| 方法5-10 | ❌ | 受同源策略限制 |
| 方法11 | ❌ | Reddit 是 SPA，URL 不变 |
| 方法12 | ❌ | Bridge 不携带 Cookie |
| 方法13 | ❌ | 尺寸未变化 |

## 🎓 学术价值

### 这个发现对论文的意义

1. **证明了侧信道攻击的可行性**
   - 即使有同源策略保护
   - 仍然可以通过 Performance API 泄露信息

2. **揭示了 WebView 的安全边界**
   - Bridge 和 iframe 的 Cookie 隔离
   - 但 Performance API 可能成为泄露点

3. **实际应用场景**
   - 恶意网站可以检测用户是否登录了 Reddit
   - 通过分析 API 请求模式，推断用户行为

## 🚀 下一步研究

1. **改进方法4**
   - 分析更多 API 请求模式
   - 检测其他登录指示器（如 `/api/v1/user/me`）

2. **研究其他侧信道**
   - 检测资源加载时间
   - 检测网络请求频率
   - 检测错误响应模式

3. **对比不同网站**
   - Reddit（SPA，URL 不变）
   - 其他网站（URL 会变化）

## 📝 总结

**核心发现**：
- ✅ 可以通过 **Performance API** 检测到 iframe 内部的 API 请求
- ✅ 如果检测到 `/api/v1/me` 请求，说明用户可能已登录
- ❌ Bridge 无法检测（因为不携带 Cookie）
- ❌ URL 检测无法检测（因为 Reddit 是 SPA）

**实际意义**：
- 这是一个**侧信道信息泄露**
- 外部页面可以推断用户的登录状态
- 对隐私研究有重要价值

