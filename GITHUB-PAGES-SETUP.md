# GitHub Pages 测试链接设置指南

## 快速设置（5分钟）

### 步骤 1：创建新仓库

1. 访问：https://github.com/new
2. 仓库名称：`webview-test-domain2`（或任何你喜欢的名字）
3. 选择 Public（GitHub Pages 需要 Public 仓库）
4. 不要初始化 README（我们直接上传文件）

### 步骤 2：上传测试文件

**方法 A：使用 GitHub Web 界面**

1. 在仓库页面，点击 "Add file" → "Upload files"
2. 把 `bridge-audit-a.html` 文件拖进去
3. 点击 "Commit changes"

**方法 B：使用 Git 命令行**

```bash
# 在你的项目目录下
cd /Users/karess/Desktop/QQ\ 泄漏项目/webview/tests

# 创建新目录
mkdir ../../github-test-domain2
cd ../../github-test-domain2

# 初始化 git
git init
git add bridge-audit-a.html
git commit -m "Add test page"
git branch -M main

# 添加远程仓库（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/webview-test-domain2.git
git push -u origin main
```

### 步骤 3：启用 GitHub Pages

1. 在仓库页面，点击 "Settings"
2. 左侧菜单找到 "Pages"
3. 在 "Source" 下选择 "Deploy from a branch"
4. 选择 "main" 分支，文件夹选择 "/ (root)"
5. 点击 "Save"

### 步骤 4：获得测试链接

几分钟后，你会得到一个链接：
- `https://YOUR_USERNAME.github.io/webview-test-domain2/bridge-audit-a.html`

这就是你的**不同域名**测试页面！

## 测试链接示例

假设你的 GitHub 用户名是 `karess`，那么：
- **现有域名**：`https://webview-wheat-eight.vercel.app/tests/bridge-audit-a.html`
- **新域名**：`https://karess.github.io/webview-test-domain2/bridge-audit-a.html`

这两个是**完全不同的域名**，可以用来测试"页面来源限制"。

## 如果不想创建新仓库

你也可以使用现有的仓库，创建一个新分支或新文件夹：

1. 在现有仓库创建新文件夹：`cross-domain-test/`
2. 把 `bridge-audit-a.html` 放进去
3. 启用 GitHub Pages，指向这个文件夹
4. 链接会是：`https://YOUR_USERNAME.github.io/REPO_NAME/cross-domain-test/bridge-audit-a.html`

## 快速测试链接（我已经帮你准备好了）

如果你告诉我你的 GitHub 用户名，我可以帮你创建一个测试链接。

或者，你可以直接使用这个模板：
- 替换 `YOUR_USERNAME` 为你的 GitHub 用户名
- 替换 `REPO_NAME` 为你的仓库名

**示例链接格式**：
```
https://YOUR_USERNAME.github.io/REPO_NAME/bridge-audit-a.html
```

