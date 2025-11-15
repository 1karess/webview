# Vercel部署指南

## 📋 部署步骤

### 步骤1：在Vercel上创建新项目

1. **访问Vercel Dashboard**
   - 打开 https://vercel.com/dashboard
   - 确保你已经登录（用学校邮箱）

2. **点击 "Add New Project"**
   - 在Projects页面，点击右上角的 "Add New Project" 按钮

3. **导入GitHub仓库**
   - 如果仓库还没有连接，点击 "Import Git Repository"
   - 选择你的 `webview` 仓库
   - 如果看不到仓库，点击 "Adjust GitHub App Permissions" 授权访问

### 步骤2：配置项目设置

在导入仓库后，Vercel会自动检测项目类型：

1. **Framework Preset**
   - 选择 "Other" 或 "Static Site"
   - Vercel会自动识别为静态网站

2. **Root Directory**
   - 保持默认（根目录 `/`）
   - 因为所有文件都在根目录

3. **Build Command**
   - 留空（静态文件不需要构建）

4. **Output Directory**
   - 留空或填写 `.`（当前目录）

5. **Install Command**
   - 留空（没有依赖需要安装）

### 步骤3：部署项目

1. **点击 "Deploy"**
   - 点击右下角的 "Deploy" 按钮
   - Vercel会自动开始部署

2. **等待部署完成**
   - 通常需要1-2分钟
   - 可以在部署日志中查看进度

3. **获得免费域名**
   - 部署完成后，你会看到：
     - **Production URL**: `webview-xxx.vercel.app`
     - **Preview URLs**: 每次提交都会生成新的预览链接

### 步骤4：访问你的网站

部署完成后，你会获得：

- **主域名**：`https://webview-xxx.vercel.app`
- **测试页面**：
  - `https://webview-xxx.vercel.app/tests/bridge-probe/`
  - `https://webview-xxx.vercel.app/tests/storage-isolation/`

---

## 🔧 项目配置说明

### vercel.json 配置文件

我已经创建了 `vercel.json` 文件，包含以下配置：

1. **静态文件部署**：使用 `@vercel/static` 构建器
2. **路由配置**：所有路径都正确映射
3. **缓存控制**：禁用缓存，确保测试结果准确

### 文件结构

```
webview/
├── index.html                    # 主页
├── vercel.json                   # Vercel配置
├── tests/
│   ├── bridge-probe/
│   │   └── index.html           # Bridge检测工具
│   └── storage-isolation/
│       └── index.html           # Storage隔离工具
└── ...
```

---

## 📝 部署后需要做的事情

### 1. 更新代码中的域名引用

部署完成后，需要更新所有文档中的域名引用：

**需要更新的文件：**
- `tests/storage-isolation/PRESENTATION-FOR-FRESHMEN.md`
- `tests/storage-isolation/TEST-RESULTS.md`
- `tests/storage-isolation/TEST-PLAN.md`

**替换规则：**
```bash
# 将旧域名替换为新域名
1karess.github.io → webview-xxx.vercel.app
```

### 2. 测试所有功能

部署后，测试以下功能：

- [ ] Bridge检测工具是否正常工作
- [ ] Storage隔离工具是否正常工作
- [ ] 所有链接是否可访问
- [ ] 在QQ中打开是否正常（不再被拦截）

### 3. 配置自定义域名（可选）

如果你想使用自定义域名：

1. 在Vercel项目设置中，进入 "Domains"
2. 添加你的自定义域名
3. 按照提示配置DNS

---

## 🚀 快速部署命令（如果使用Vercel CLI）

如果你想用命令行部署：

```bash
# 安装Vercel CLI
npm i -g vercel

# 登录Vercel
vercel login

# 部署项目
cd /Users/karess/Desktop/project/webview
vercel

# 部署到生产环境
vercel --prod
```

---

## ✅ 部署检查清单

- [ ] 在Vercel上创建新项目
- [ ] 导入GitHub仓库
- [ ] 配置项目设置（Framework: Other）
- [ ] 点击Deploy部署
- [ ] 等待部署完成
- [ ] 获得免费域名（`webview-xxx.vercel.app`）
- [ ] 测试所有功能是否正常
- [ ] 更新代码中的域名引用
- [ ] 在QQ中测试是否不再被拦截

---

## 🎯 部署后的URL示例

部署完成后，你会获得类似这样的URL：

```
主域名：
https://webview-abc123.vercel.app

Bridge检测工具：
https://webview-abc123.vercel.app/tests/bridge-probe/

Storage隔离工具：
https://webview-abc123.vercel.app/tests/storage-isolation/
```

---

## 💡 常见问题

### Q1: 部署失败怎么办？
**A:** 检查：
- 确保仓库已正确导入
- 检查 `vercel.json` 配置是否正确
- 查看部署日志中的错误信息

### Q2: 如何更新代码？
**A:** 
- 推送到GitHub后，Vercel会自动重新部署
- 或者手动在Vercel Dashboard中点击 "Redeploy"

### Q3: 如何查看部署日志？
**A:**
- 在Vercel Dashboard中，点击项目
- 进入 "Deployments" 标签
- 点击具体的部署，查看日志

### Q4: 如何配置环境变量？
**A:**
- 在项目设置中，进入 "Environment Variables"
- 添加需要的环境变量

---

## 📞 需要帮助？

如果遇到问题：
1. 查看Vercel文档：https://vercel.com/docs
2. 检查部署日志中的错误信息
3. 确保所有文件都已提交到GitHub



