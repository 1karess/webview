# Vercel 跨域测试设置步骤

## 当前状态

你已经在 Vercel 的"创建新项目"界面，可以看到：
- 左侧：Import Git Repository（导入 Git 仓库）
- 右侧：Clone Template（克隆模板）
- 你的 GitHub 账号已连接：`1karess`
- 可以看到 `webview` 仓库

## 方案选择

### 方案 1：使用现有仓库创建新项目（推荐）

**优点**：使用现有代码，只需要部署到新项目

**步骤**：
1. 在左侧 "Import Git Repository" 区域
2. 找到 `webview` 仓库（显示 "webview · 1m ago"）
3. 点击右侧的 **"Import"** 按钮
4. 在项目设置页面：
   - **Project Name**：改为 `webview-test-domain2`（或任何你喜欢的名字）
   - **Framework Preset**：选择 "Other" 或 "Other (Static HTML)"
   - **Root Directory**：选择 `webview`（如果测试文件在 webview 文件夹下）
   - 其他设置保持默认
5. 点击 **"Deploy"**
6. 等待部署完成（几分钟）
7. 你会得到新域名：`https://webview-test-domain2.vercel.app/`

**测试链接**：
- 现有：`https://webview-wheat-eight.vercel.app/tests/bridge-audit-a.html`
- 新项目：`https://webview-test-domain2.vercel.app/tests/bridge-audit-a.html`

### 方案 2：创建新仓库（真正的跨域）

如果你想创建完全独立的项目：

**步骤**：
1. 先在 GitHub 创建新仓库：
   - 访问：https://github.com/new
   - 仓库名：`webview-test-domain2`
   - 选择 Public
   - 不要初始化 README
2. 上传测试文件到新仓库：
   - 把 `bridge-audit-a.html` 上传到新仓库
3. 回到 Vercel：
   - 在 "Import Git Repository" 区域
   - 搜索 `webview-test-domain2`
   - 点击 "Import"
   - 部署

## 推荐操作

**我建议使用方案 1**（使用现有仓库创建新项目）：
- 最简单
- 不需要创建新仓库
- 只需要改项目名，Vercel 会自动创建新域名

## 部署后的测试步骤

1. **等待部署完成**（通常 1-2 分钟）
2. **获得新域名**：`https://webview-test-domain2.vercel.app/`
3. **测试链接**：
   - 测试页 A（现有）：`https://webview-wheat-eight.vercel.app/tests/bridge-audit-a.html`
   - 测试页 A（新域名）：`https://webview-test-domain2.vercel.app/tests/bridge-audit-a.html`
4. **在 QQ WebView 中测试**：
   - 先打开现有域名的测试页，扫描并复制结果
   - 再打开新域名的测试页，扫描并复制结果
   - 对比两个结果，看 API 是否相同

## 如果部署后找不到测试文件

如果部署后访问 `https://webview-test-domain2.vercel.app/tests/bridge-audit-a.html` 显示 404：

**解决方法**：
1. 在 Vercel 项目设置中，检查 "Root Directory" 设置
2. 如果测试文件在 `webview/tests/` 下，Root Directory 应该设置为 `webview`
3. 或者，直接在项目根目录创建一个 `index.html`，重定向到测试页面

## 下一步

部署完成后，你可以：
1. 测试新域名是否能正常访问
2. 在 QQ WebView 中测试两个域名的 API 是否相同
3. 如果相同 → 说明没有页面来源限制（系统性问题）
4. 如果不同 → 说明有基于域名的限制（相对安全）

