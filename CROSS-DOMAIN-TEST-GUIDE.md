# 跨域名测试指南

## 为什么需要跨域名测试？

要真正测试"页面来源限制"，需要使用**不同域名**的页面。如果两个页面是同一个域名，根据浏览器的**同源策略**，它们本来就应该有相同的权限，所以不能证明"没有页面来源限制"。

## 如何部署到不同域名？

### 方案 1：使用 GitHub Pages（推荐，免费）

1. **创建新仓库**：
   - 在 GitHub 上创建一个新仓库（例如：`webview-test-domain2`）
   - 把 `bridge-audit-a.html` 复制到新仓库

2. **启用 GitHub Pages**：
   - 仓库设置 → Pages
   - 选择分支（通常是 `main`）
   - 保存

3. **获得新域名**：
   - 你会得到一个类似 `https://你的用户名.github.io/webview-test-domain2/` 的 URL
   - 这就是你的**不同域名**测试页面

### 方案 2：使用 Netlify（免费，简单）

1. **访问**：https://www.netlify.com/
2. **注册/登录**
3. **拖拽部署**：
   - 把 `bridge-audit-a.html` 放在一个文件夹里
   - 拖拽文件夹到 Netlify
   - 你会得到一个类似 `https://随机名字.netlify.app/` 的 URL

### 方案 3：使用 Vercel（你已经用过）

1. **创建新项目**：
   - 在 Vercel 上创建新项目
   - 把 `bridge-audit-a.html` 部署到新项目
   - 你会得到一个不同的域名（例如：`https://webview-test-2.vercel.app/`）

### 方案 4：使用现有的不同域名服务

如果你有其他域名或托管服务，也可以使用。

## 测试步骤

1. **准备两个不同域名的页面**：
   - 页面 A：`https://webview-wheat-eight.vercel.app/tests/bridge-audit-a.html`（现有）
   - 页面 B：`https://新域名.com/bridge-audit-a.html`（新部署）

2. **在 QQ WebView 中测试**：
   - 在 QQ 中打开页面 A，扫描并复制结果
   - 在 QQ 中打开页面 B（**不同域名**），扫描并复制结果
   - 对比两个结果

3. **分析结果**：
   - **如果两个页面的 API 完全相同** → 说明**没有页面来源限制**（严重风险）
   - **如果两个页面的 API 不同** → 说明**有基于域名的限制**（相对安全）

## 注意事项

- 确保两个页面是**完全不同的域名**（不仅仅是子域名）
- 例如：`webview-wheat-eight.vercel.app` 和 `webview-test-2.vercel.app` 是**不同的域名**
- 例如：`example.com` 和 `test.com` 是**不同的域名**
- 例如：`example.com` 和 `subdomain.example.com` 是**不同的域名**（但可能共享某些权限）

## 快速测试（不需要部署）

如果你想快速测试，可以：
1. 使用现有的不同域名服务（例如：GitHub Pages、Netlify、Vercel）
2. 或者使用在线代码编辑器（例如：CodePen、JSFiddle），它们通常提供不同的域名

