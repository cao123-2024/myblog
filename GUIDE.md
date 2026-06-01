# LUMINA — 液态玻璃博客系统 · 项目指南

> 远程仓库：`https://github.com/cao123-2024/myblog.git`
> 分支：`master`

---

## 一、项目概览

LUMINA 是一个 **Node.js（Express）单页应用博客**，具备完整的用户系统、文章发布、评论、好友私聊、五子棋对战、文件下载等功能。前端采用 **液态玻璃设计语言**，后端支持 **双模式**（本地 JSON / 线上 Supabase）自动切换。

```
技术栈：
  后端        Express 4.18  +  JWT  +  Multer  +  bcryptjs
  数据库      本地 JSON 文件  或  Supabase (PostgreSQL)
  前端        原生 JS (无框架)  +  CSS3 液态玻璃
  部署        Vercel (线上)  /  Node.js 直接运行 (本地)
```

---

## 二、设计语言 · LUMINA Design System

### 2.1 核心关键词

| 关键词 | 说明 |
|--------|------|
| **Win11 Blue** | 主色 `#0078D4`，hover `#1A88E0`，active `#005A9E` |
| **液态玻璃** | `backdrop-filter: blur(36px) saturate(200%)` + 多层半透明背景 |
| **深色模式** | 背景纯黑 `#080808`，玻璃面板透明黑 `rgba(15,15,15,0.12)` |
| **磨砂质感** | 每个面板都有 `inset` 高光 + 边缘折射 + 14 层阴影 |
| **弹簧阻尼** | 所有动画使用 `cubic-bezier` 弹性曲线，按下缩 0.97x，悬停抬 2px |
| **IOS 风格** | 大圆角 `22px`，模糊毛玻璃，无硬边框，文字轻量、留白充足 |
| **禁止 Emoji** | 所有图标手写 SVG inline，不使用任何 emoji 图片图标 |
| **禁止蓝紫混搭** | 主色只用 `#0078D4` 蓝，紫色不出现在任何 UI 元素中 |

### 2.2 设计 Token 速查

| Token | 值 | 用途 |
|-------|-----|------|
| `--blue` | `#0078D4` | 主色调、链接、激活态 |
| `--bg-page` | `#080808` | 页面根背景 |
| `--bg-glass` | `rgba(15,15,15,0.12)` | 玻璃面板背景 |
| `--border-glass` | `rgba(255,255,255,0.10)` | 玻璃面板边框 |
| `--jelly-soft` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | 按钮 / 面板缓动 |
| `--jelly-bounce` | `cubic-bezier(0.18, 2.2, 0.5, 1)` | Modal 弹出 / 登录弹入 |
| `--radius-2xl` | `22px` | 卡片 / 模态框圆角 |
| `--glass-blur` | `36px` | 玻璃面板模糊强度 |

全部定义在：[public/css/liquid-glass.css](public/css/liquid-glass.css)

---

## 三、项目目录结构

```
myblog/
│
├── server.js              ← ★ 应用入口，Express 路由挂载
├── package.json           ← 项目配置 / 依赖
├── package-lock.json      ← 依赖锁定
├── vercel.json            ← Vercel 部署配置（路由重写）
├── .gitignore             ← Git 忽略规则
├── deploy.js              ← Vercel CLI 部署辅助脚本
│
├── 启动.bat               ← Windows 双击启动
├── 启动.ps1               ← PowerShell 启动
│
├── scripts/
│   └── start.js           ← ★ 终端动效启动脚本（Logo + 旋转 + 框）
│
├── api/
│   └── index.js           ← Vercel Serverless 入口（桥接到 server.js）
│
├── database/
│   ├── db.js              ← 桥接文件（导出 init.js）
│   └── init.js            ← ★ 双模式数据库：JSON 本地 / Supabase 线上
│
├── middleware/
│   └── auth.js            ← ★ JWT 认证 / 角色鉴权 / 权限判断
│
├── routes/
│   ├── auth.js            ← 注册 / 登录 / JWT 签发
│   ├── articles.js        ← 文章 CRUD（含图片上传）
│   ├── comments.js        ← 评论 / 管理员匿名选项
│   ├── friends.js         ← 好友申请 / 接受 / 拒绝 / 删除
│   ├── users.js           ← 用户资料（头像 / 壁纸上传）
│   ├── admin.js           ← 管理员面板（封禁 / 解封 / 删除用户 / PIN 验证）
│   ├── messages.js        ← 私聊消息（好友限制 / 群发）
│   ├── downloads.js       ← 文件上传下载
│   ├── announcements.js   ← 公告 CRUD
│   ├── wallpapers.js      ← 壁纸管理
│   └── game.js            ← 五子棋（匹配 / 对局 / 邀请）
│
├── public/                ← ★ 前端（SPA 单页应用）
│   ├── index.html         ← 唯一 HTML 文件（登录 + 导航 + 全页面容器）
│   ├── css/
│   │   └── liquid-glass.css  ← ★ 设计系统全部 CSS（按钮 / 面板 / 动画 / 响应式）
│   ├── js/
│   │   ├── app.js         ← ★ 前端核心：API 客户端 / Store / 路由 / Toast / 头像
│   │   ├── components/
│   │   │   └── modal.js   ← 模态框组件
│   │   └── pages/
│   │       ├── login.js   ← 登录 / 注册 / 管理员验证（滑动卡片）
│   │       ├── home.js    ← 首页（轮播图 + 文章列表 + 分页）
│   │       ├── article.js ← 文章详情 / 评论列表
│   │       ├── admin.js   ← 管理员面板（用户列表 / 封禁 / 上传审批）
│   │       ├── friends.js ← 好友列表 / 申请管理
│   │       ├── profile.js ← 个人资料页 / 编辑 / 壁纸设置
│   │       ├── messages.js← 私聊界面（会话列表 + 聊天窗口）
│   │       ├── games.js   ← 五子棋（匹配 / 棋盘 / 邀请好友）
│   │       ├── downloads.js← 下载中心
│   │       ├── announcements.js ← 公告管理
│   │       └── static.js  ← 静态工具函数
│   └── img/
│       ├── slide-1.png    ← 轮播图 1
│       ├── slide-2.jpg    ← 轮播图 2
│       ├── slide-3.jpg    ← 轮播图 3
│       └── wallpapers/    ← 系统壁纸库（20 张）
```

---

## 四、核心文件逐行解释

### 4.1 server.js — 应用入口

| 行号 | 内容 |
|------|------|
| 1-4 | 引入 Express / path / fs / 数据库 |
| 6-8 | 端口 `3000`，检测 `process.env.VERCEL` |
| 10-15 | Vercel 模式创建 `/tmp/uploads`，本地模式创建 `uploads/` |
| 17-18 | JSON 体解析（上限 5MB） |
| 21-26 | 静态文件服务，Vercel 用 `/tmp`，本地用 `./uploads` |
| 28-40 | Multer 文件过大错误处理 |
| 42-58 | 异步数据库初始化，API 等待就绪 |
| 60-82 | 挂载全部路由（auth / articles / comments / friends / users / admin / messages / downloads / announcements / wallpapers / game） |
| 84-86 | SPA 兜底路由：所有非 API 请求返回 `index.html` |
| 88-95 | 非 Vercel 模式调用 `app.listen()` |
| 97-103 | 全局异常捕获，防止崩溃闪退 |

### 4.2 database/init.js — 双模式数据库

| 行号 | 内容 |
|------|------|
| 5 | `const MODE = (SUPABASE_URL && SUPABASE_KEY) ? 'supabase' : 'json'` ← 自动检测 |
| 9-32 | **JSON 模式**：`jsonTable()` 工厂，CRUD 操作读写 `database/data/*.json` |
| 34-43 | JSON 模式初始化：自动创建 `admin` 用户（密码 `******`） |
| 45-198 | **Supabase 模式**：REST API 封装，自动建表（articles / users / comments / friends / messages / downloads / verify_codes / announcements / wallpapers / upload_applies / game_queue / game_rooms / game_invites / ban_appeals） |
| 200-228 | `db()` 统一接口：JSON 和 Supabase 返回相同 API（all / getById / findOne / find / insert / update / delete） |

### 4.3 middleware/auth.js — 认证与鉴权

| 行号 | 内容 |
|------|------|
| 1-28 | `auth` — Bearer token 验证 + 封禁检查 |
| 30-41 | `optionalAuth` — 可选认证（公开页面也能获取当前用户） |
| 43-48 | `adminOnly` — 仅 admin/semi_admin 可访问 |
| 50-55 | `superAdminOnly` — 仅超级管理员 |
| 57-59 | `isSuperAdmin` — 无 created_by 的 admin |
| 61-67 | `canManageUser` — 是否能操作另一个用户 |
| 69-81 | `canEditArticle` — 是否能编辑/删除文章 |

### 4.4 public/css/liquid-glass.css — 设计系统

| 行号 | 内容 |
|------|------|
| 7-66 | CSS 变量：颜色 / 阴影 14 层 / 动画曲线 / 圆角 |
| 104-139 | `.glass` 面板：水珠效果，`backdrop-filter` + 镜面高光 `::before` + 边缘折射 `::after` |
| 158-197 | `.card-glass` 卡片：更厚水层，hover 上浮 + 放大 |
| 200-224 | **表面张力** `.glass-stack`：相邻面板 hover 时粘连动画 |
| 229-313 | 按钮系统：`.btn-primary` 蓝底 + `.btn-glass` 玻璃 + `.btn-danger` 红边 + 尺寸变体 |
| 316-349 | 输入框：`.input` 半透明 + `.input-glass` 玻璃 + 果冻聚焦动画 |
| 351-375 | 弹性动画帧：`jellyBounce` / `jellyPress` / `jellyPop` |
| 378-384 | 登录页面全屏布局 |
| 388-426 | **入场动画**：`.entry-overlay` + `entryReveal` LUMINA 渐变消失 |
| 430-501 | 模态框 / Toast / fadeInUp / shimmer 骨架屏 |
| 360-432 | 响应式断点（768px / 480px） |

### 4.5 public/js/app.js — 前端核心

| 行号 | 内容 |
|------|------|
| 1-38 | `API` 对象：`fetch` 封装，token/adminToken 自动附加 |
| 40-76 | `Store` 对象：用户状态、登录/退出、管理员验证、本地存储 |
| 78-89 | `toast()` 消息提示 |
| 94-116 | `navigate()` SPA 路由导航 |
| 118-135 | `updateNav()` 导航栏刷新 + 管理员链接显隐 |
| 141-166 | `App.init()` 应用初始化 |
| 168-198 | 未读消息轮询 / 公告弹窗 |
| 236-258 | 12 个预设头像（base64 SVG） |
| 261-265 | `avatarUrl()` / `formatDate()` 工具函数 |

### 4.6 scripts/start.js — 终端动效启动

功能：
1. 清屏 + 隐藏光标
2. 显示 LUMINA Logo
3. 旋转符 `◌○◔◑◕●` 动画 + "正在启动..."
4. 后台创建目录 / 释放端口 / 检查环境
5. 弹出蓝色边框成功卡片（精确对齐，ANSI 剥离后计算中文宽度）
6. `spawn` 启动 `server.js`，日志直接从终端流出
7. 出错显示红框 + 错误信息 + "按任意键退出..."，不闪退

---

## 五、本地运行

### 5.1 方式一：双击 `启动.bat`（推荐）

```
双击 → 自动找到 Node.js → 自动创建目录 → 终端动效 → 启动成功
```

内部调用：`node scripts/start.js`

### 5.2 方式二：PowerShell

```powershell
.\启动.ps1
```

### 5.3 方式三：手动

```bash
cd g:\Windows10-11V1.9\code\Project\myblog
node scripts/start.js
```

### 5.4 本地数据库

本地模式自动使用 JSON 文件存储（`database/data/*.json`），管理员用户名 `admin`、密码 `******`（6 个星号字符）。

---

## 六、部署到线上

### 6.1 Vercel 部署

```
Vercel 自动检测 vercel.json → 所有流量转发到 api/index.js → 桥接 server.js
```

环境变量（在 Vercel Dashboard 设置）：

| 变量 | 值 |
|------|-----|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` |
| `ADMIN_PIN` | `000000`（管理员 PIN 码） |
| `JWT_SECRET` | 随机字符串（可选） |

本地也可以部署：

```bash
npx vercel --prod
```

### 6.2 数据存储

| 环境 | 数据库 | 文件存储 |
|------|--------|---------|
| 本地 | `database/data/*.json` | `uploads/` |
| Vercel | Supabase (PostgreSQL) | `/tmp/uploads`（临时） |

---

## 七、Git 使用指南

### 7.1 仓库信息

```
远程：https://github.com/cao123-2024/myblog.git
分支：master
```

### 7.2 查看状态

```bash
cd g:\Windows10-11V1.9\code\Project\myblog
git status
```

### 7.3 提交三部曲

```bash
# 1. 查看改了哪些文件
git status

# 2. 添加要提交的文件（. 表示全部）
git add .

# 3. 提交，带上描述
git commit -m "修复: 启动脚本编码问题"

# 4. 推送到 GitHub
git push origin master
```

### 7.4 拉取最新代码

```bash
git pull origin master
```

### 7.5 提交信息规范（Conventional Commits）

```
前缀: 简短描述

可用前缀：
  feat:     新功能
  fix:      修复 bug
  style:    样式 / 设计调整
  refactor: 重构代码
  docs:     文档更新
  chore:    杂项（依赖、脚本等）

例子：
  fix: 启动脚本编码问题
  feat: 添加公告弹窗功能
  style: 调整导航栏玻璃透明度
  refactor: 重构数据库双模式逻辑
```

### 7.6 查看提交历史

```bash
git log --oneline -10       # 最近 10 条
git log --graph --all       # 分支图
```

### 7.7 撤销

```bash
git reset --soft HEAD~1     # 撤销最近一次 commit（保留修改）
git checkout -- 文件名      # 撤销某个文件的修改
```

---

## 八、自动提交（每次修改后自动 push）

### 8.1 创建自动提交脚本

把以下内容保存为 `scripts/autocommit.js`：

```javascript
// autocommit.js — 自动提交所有改动
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function run(cmd) {
  try { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { return ''; }
}

const status = run('git status --porcelain');
if (!status) { console.log('没有改动，跳过'); process.exit(0); }

const changed = status.split('\n').filter(Boolean).length;
run('git add .');
const msg = 'auto: ' + new Date().toLocaleString('zh-CN') + ' - ' + changed + ' files';
run('git commit -m "' + msg + '"');
run('git push origin master');
console.log('已提交: ' + msg);
```

### 8.2 在启动时自动提交

在 `scripts/start.js` 的 `main()` 函数尾部 `spawn` 之前添加一行：

```javascript
require('child_process').exec('node scripts/autocommit.js', { cwd: ROOT });
```

这样每次启动网站时都会自动把所有改动提交并推送到 GitHub。

### 8.3 使用 Git Hook 自动提交（更自动化）

在 `.git/hooks/pre-push` 中写脚本，但这种方式对新手不友好，推荐用方案 8.1。

---

## 九、常用命令速查

```bash
# 启动
node scripts/start.js

# 安装新依赖
npm install 包名

# 查看日志（本地 JSON 模式下）
cat database/data/articles.json

# 重置数据库（本地 JSON 模式）
rm database/data/*.json
# 重启后会自动重建 admin 用户

# Vercel 部署
npx vercel --prod

# Git 操作
git status
git add .
git commit -m "feat: 描述"
git push origin master
```

---

## 十、常见问题

### Q: 端口 3000 已被占用？
启动脚本会自动释放端口，或手动：
```bash
netstat -ano | findstr :3000
taskkill /F /PID <PID>
```

### Q: 本地和线上有什么区别？
- 本地：JSON 文件数据库，无需联网
- 线上：Supabase 数据库，需要在 Vercel 设环境变量
- 代码**完全同一份**，`database/init.js` 自动检测切换

### Q: 怎么换管理员密码？
编辑 `database/init.js` 第 39 行，改 `jsonTable('users').insert(...)` 里的 password，然后删掉 `database/data/users.json` 重启。

### Q: 怎么改端口？
设置环境变量 `PORT=8080`，或在 `server.js` 第 7 行改默认值。
