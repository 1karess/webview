# GitHub Pages 快速设置（使用现有仓库）

## 你的现有仓库

- **仓库地址**：`https://github.com/1karess/webview.git`
- **GitHub 用户名**：`1karess`
- **仓库名**：`webview`

## 快速设置步骤

### 步骤 1：启用 GitHub Pages

1. 访问：https://github.com/1karess/webview/settings/pages
2. 在 "Source" 下选择 "Deploy from a branch"
3. 选择 "main" 分支
4. 文件夹选择 "/ (root)" 或 "/webview"（如果测试页面在 webview 文件夹下）
5. 点击 "Save"

### 步骤 2：等待部署（几分钟）

GitHub Pages 会自动部署，几分钟后你就可以访问了。

### 步骤 3：访问测试链接

部署完成后，你的测试链接会是：

**如果选择 "/ (root)"**：
- 测试页 A：`https://1karess.github.io/webview/tests/bridge-audit-a.html`
- 测试页 B：`https://1karess.github.io/webview/tests/bridge-audit-b.html`
- 超简单测试：`https://1karess.github.io/webview/tests/ultra-simple-test.html`

**如果选择 "/webview"**：
- 测试页 A：`https://1karess.github.io/webview/webview/tests/bridge-audit-a.html`
- 测试页 B：`https://1karess.github.io/webview/webview/tests/bridge-audit-b.html`

## 创建不同域名的测试页面

### 方法 1：使用 GitHub Pages 的子路径（最简单）

1. 在仓库中创建一个新文件夹：`cross-domain-test/`
2. 把 `bridge-audit-a.html` 复制到这个文件夹
3. 启用 GitHub Pages，指向这个文件夹
4. 链接会是：`https://1karess.github.io/webview/cross-domain-test/bridge-audit-a.html`

**注意**：这仍然是同一个域名，但可以用来测试路径差异。

### 方法 2：使用 GitHub Pages 的不同仓库（真正的跨域）

1. 创建新仓库：`webview-test-domain2`
2. 上传 `bridge-audit-a.html` 到新仓库
3. 启用 GitHub Pages
4. 链接会是：`https://1karess.github.io/webview-test-domain2/bridge-audit-a.html`

**这是真正的跨域测试**：
- 现有域名：`1karess.github.io/webview/...`
- 新域名：`1karess.github.io/webview-test-domain2/...`

虽然都是 `github.io`，但路径不同，可以用来测试。

### 方法 3：使用其他免费服务（真正的跨域）

- **Netlify**：`https://随机名字.netlify.app/`
- **Vercel**：`https://随机名字.vercel.app/`（你已经用过）
- **GitHub Pages 的不同用户名**：如果你有另一个 GitHub 账号

## 测试链接汇总

### 现有链接（Vercel）
- 测试页 A：`https://webview-wheat-eight.vercel.app/tests/bridge-audit-a.html`
- 测试页 B：`https://webview-wheat-eight.vercel.app/tests/bridge-audit-b.html`

### GitHub Pages 链接（设置后）
- 测试页 A：`https://1karess.github.io/webview/tests/bridge-audit-a.html`
- 测试页 B：`https://1karess.github.io/webview/tests/bridge-audit-b.html`

### 跨域测试
- 需要创建新仓库或使用其他服务

## 快速操作

**如果你想立即使用现有仓库**：

1. 访问：https://github.com/1karess/webview/settings/pages
2. 选择 "main" 分支，"/ (root)" 文件夹
3. 保存
4. 几分钟后访问：`https://1karess.github.io/webview/tests/bridge-audit-a.html`

**如果你想创建真正的跨域测试**：

1. 创建新仓库：`webview-test-domain2`
2. 上传 `bridge-audit-a.html`
3. 启用 GitHub Pages
4. 访问：`https://1karess.github.io/webview-test-domain2/bridge-audit-a.html`

