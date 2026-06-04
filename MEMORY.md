# LUMINA 记忆快照

> 写入时间：2026-06-02  
> 从多次对话中提取，用于迁移到新的 AI 环境时快速恢复上下文

---

## 1. 身份

- **负责项目**：LUMINA（液态玻璃博客系统）
- **角色**：全栈开发者 / 架构师，负责前后端设计、Bug 修复、部署优化、终端动效启动脚本、自动提交系统
- **仓库地址**：`https://github.com/cao123-2024/myblog.git`
- **分支**：`master`

---

## 2. 项目背景

- **用途**：个人博客系统，包含文章发布、评论、好友私聊、五子棋对战、文件下载、壁纸管理
- **当前阶段**：已上线（Vercel）+ 本地开发维护中
- **技术栈**：
  - 后端：Node.js + Express 4.18
  - 数据库：双模式 — 本地 JSON 文件 / 线上 Supabase (PostgreSQL)
  - 认证：JWT (jsonwebtoken)
  - 文件上传：Multer
  - 密码哈希：bcryptjs
  - 前端：原生 JS（无 Vue/React 框架）+ CSS3 液态玻璃
  - 部署：Vercel Serverless
  - 本地启动：Node.js spawn + ANSI 终端动效
- **Node.js 版本**：v24.15.0（本地）
- **端口**：3000

### 完整技术参与过程

1. **设计语言制定** — Win11 Blue + 液态玻璃 (backdrop-filter blur 36px) + 磨砂质感 14 层阴影 + 弹性阻尼动画 + IOS 大圆角 22px + 禁止 emoji 图标 + 禁止蓝紫混搭
2. **所有 CSS 重写** — `public/css/liquid-glass.css` 从零编写，完整的 glass panel、card-glass、btn-primary/btn-glass/btn-danger、input-glass、模态框、Toast、入场动画、响应式
3. **前端 SPA 架构搭建** — API 客户端、Store 状态管理、路由导航、Toast 系统、头像系统（12 个预设 SVG inline）
4. **所有页面 JS 编写** — login（滑动卡片三面板）、home（轮播+文章列表+分页）、article（详情+评论）、admin（用户管理+封禁+标签+上传审批）、friends（好友列表+申请）、profile（个人资料+壁纸）、messages（私聊+群发）、games（五子棋+2048+贪吃蛇+扫雷+数独+俄罗斯方块+打砖块+乒乓球+机甲对战）、downloads（文件管理）、announcements（公告管理）
5. **后端路由全量编写** — 11 个路由文件，含 JWT 认证、角色鉴权、文件上传、双人联机游戏匹配
6. **数据库双模式设计** — JSON 本地自动创建管理员 / Supabase 自动建表 + RLS，一份代码自动切换
7. **Bug 扫描与修复** — 三次全量审计（路由层、数据库层、前端 JS 层），发现并修复 39 个隐藏 Bug
8. **启动脚本动画重写** — 从丑陋的逐行 println 改为 ANSI 丝滑动效 + 服务器退出后重启/退出选择
9. **本地性能优化** — 去掉 Vercel 图片压缩限制，本地直传原图
10. **自动提交系统** — 每次启动自动 `git add/commit/push`

---

## 3. 代码架构记忆

### 3.1 目录结构

```
myblog/
├── server.js              ← 应用入口，Express 配置、路由挂载
├── package.json           ← express, multer, jsonwebtoken, bcryptjs
├── vercel.json            ← Vercel 部署：所有流量 rewrite 到 /api/index.js
├── .gitignore             ← 忽略 node_modules/, uploads/, database/data/, .env, *.log
├── deploy.js              ← Vercel CLI 辅助
│
├── 启动.bat               ← 双击启动，找 node.exe 绝对路径后调 scripts/start.js
├── 启动.ps1               ← PowerShell 版启动
│
├── scripts/
│   ├── start.js           ← 终端动效启动（清屏+Logo+旋转+成功框+重启/退出选择）
│   └── autocommit.js      ← 自动 git add/commit/push
│
├── api/
│   └── index.js           ← Vercel Serverless 入口（require server.js + module.exports）
│
├── database/
│   ├── db.js              ← 桥接文件（导出 init.js）
│   └── init.js            ← 双模式数据库核心：jsonTable() 工厂 / Supabase REST API
│
├── middleware/
│   └── auth.js            ← JWT 签发/验证 + auth/optionalAuth/adminOnly/superAdminOnly/canManageUser/canEditArticle
│
├── routes/
│   ├── auth.js            ← POST /register, /login
│   ├── articles.js        ← GET/POST/PUT/DELETE /articles
│   ├── comments.js        ← GET/POST/DELETE /comments
│   ├── friends.js         ← GET/POST/DELETE /friends + /request, /accept, /reject
│   ├── users.js           ← GET/PUT /users + 搜索 + 头像/背景上传
│   ├── admin.js           ← PUT/DELETE /admin/users + 封禁/解封/标签/提升/降级/验证码/PIN/申诉
│   ├── messages.js        ← GET/POST /messages + /conversations + /broadcast
│   ├── downloads.js       ← GET/POST/DELETE /downloads
│   ├── announcements.js   ← GET/POST/PUT/DELETE /announcements
│   ├── wallpapers.js      ← GET/POST/DELETE /wallpapers + 图片文件服务
│   └── game.js            ← POST /game/heartbeat, /queue, /move, /room + /invite
│
├── public/
│   ├── index.html         ← 唯一 HTML + 全页面 DOM 容器 + 入场动画 overlay
│   ├── css/
│   │   └── liquid-glass.css  ← 设计系统全部 CSS（300+ 行）
│   ├── js/
│   │   ├── app.js         ← API 客户端、Store、navigate、toast、avatarUrl、formatDate、compressImage
│   │   ├── components/
│   │   │   └── modal.js   ← showModal / showConfirm / showInputModal
│   │   └── pages/
│   │       ├── login.js   ← 登录/注册/管理员验证 三面板滑动卡片
│   │       ├── home.js    ← 首页文章列表 + 轮播图 + 分页
│   │       ├── article.js ← 文章详情 + 评论
│   │       ├── admin.js   ← 管理员面板
│   │       ├── friends.js ← 好友系统
│   │       ├── profile.js ← 个人资料
│   │       ├── messages.js← 私聊
│   │       ├── games.js   ← 游戏中心（9 个游戏）
│   │       ├── downloads.js← 下载中心
│   │       ├── announcements.js ← 公告管理
│   │       └── static.js  ← 静态工具函数
│   └── img/
│       ├── slide-1.png, slide-2.jpg, slide-3.jpg
│       └── wallpapers/    ← 20 张壁纸（0-19.jpg）
```

### 3.2 数据流

```
浏览器 SPA
  ├── index.html 加载 → app.js 初始化 Store → 检查 localStorage token
  ├── navigate('home') → 动态加载 pages/home.js → render_home() 返回 DOM → 插入 #main-content
  ├── API.fetch('/articles') → server.js → routes/articles.js → database/init.js → JSON/Supabase
  └── 响应 → 更新 DOM

后端：
  server.js
    ├── express.json(100mb 本地 / 5mb Vercel)
    ├── express.static('public/')     ← CSS/JS/IMG
    ├── /api → 等待 DB 就绪 → 挂载所有路由
    └── /* → index.html (SPA 兜底)
```

### 3.3 关键函数职责

| 文件 | 函数 | 职责 |
|------|------|------|
| database/init.js | `jsonTable(name)` | 工厂函数，创建 JSON 表 CRUD |
| database/init.js | `initDb()` | 检测模式，JSON 建 admin，Supabase 建表 |
| middleware/auth.js | `auth(req,res,next)` | Bearer token 验证 + 封禁检查 + 申诉放行 |
| middleware/auth.js | `canManageUser(actor,target)` | semi_admin 只能管 user，admin 可管除超级管理员外的所有 |
| public/js/app.js | `API.get/post/put/delete/...` | fetch 封装，自动附加 token |
| public/js/app.js | `Store` | 用户状态、登录/退出、管理员验证 |
| public/js/app.js | `navigate(page,id)` | SPA 路由 |
| scripts/start.js | `box(lines)` | ANSI 画框（精确计算中文宽度） |
| scripts/start.js | `askPrompt()` | 服务器退出后 Enter=重启 / Q=退出 |
| scripts/start.js | `startServer()` | spawn server.js，Ctrl+C 只杀子进程 |

### 3.4 路由总览

| 路由前缀 | 文件 | 主要端点 |
|---------|------|---------|
| `/api` | auth.js | POST /register, /login |
| `/api/articles` | articles.js | GET /, POST /, PUT /:id, DELETE /:id |
| `/api/comments` | comments.js | GET /:articleId, POST /, DELETE /:id |
| `/api/friends` | friends.js | GET /, POST /request, /accept, /reject, DELETE /:id |
| `/api/users` | users.js | GET /:id, PUT /me, GET /search |
| `/api/admin` | admin.js | 封禁/解封/标签/提升/降级/验证码/PIN/申诉 |
| `/api/messages` | messages.js | GET /with/:id, POST /, GET /conversations, POST /broadcast |
| `/api/downloads` | downloads.js | GET /, POST /, DELETE /:id |
| `/api/announcements` | announcements.js | GET /, POST /, PUT /:id, DELETE /:id |
| `/api/wallpapers` | wallpapers.js | GET /, POST /set, POST /upload, DELETE /:id |
| `/api/game` | game.js | POST /heartbeat, /queue, /move, /room, /invite |

---

## 4. 重要决策记录

### 4.1 设计语言 (DESIGN.md 本质)

- **主色**：`#0078D4` Win11 Blue，hover `#1A88E0`，active `#005A9E`
- **玻璃效果**：`backdrop-filter: blur(36px) saturate(200%)` + 多层半透明背景
- **深色模式**：背景 `#080808`，玻璃面板 `rgba(15,15,15,0.12)`
- **圆角**：`22px`（卡片/模态框）、`14px`（按钮）、`10px`（输入框）
- **动画**：`cubic-bezier(0.34,1.56,0.64,1)` 弹性、`cubic-bezier(0.18,2.2,0.5,1)` Modal 弹出
- **严禁**：emoji 图标、蓝紫混搭、硬边框、像素阴影
- **全部定义在**：`public/css/liquid-glass.css`

### 4.2 技术选型

| 决策 | 原因 |
|------|------|
| 数据库双模式而非纯 Supabase | 本地开发不需要联网，双击即用，灵活 |
| 原生 JS 而非框架 | 项目体量小，避免依赖，加载快 |
| 全部 JS 页面对应渲染函数 | SPA 单文件部署，Vercel 友好 |
| JWT 7 天过期 | 平衡便捷和安全 |
| admin + semi_admin 双层管理 | 超级管理员可以创建子管理员分权 |
| express.json body 本地 100MB | 本地电脑性能强，不需要砍上传限制 |

### 4.3 已修复的 39 个 Bug 记忆

**P0 级（5 个）**：
1. login.js `showFieldError` — 错误元素 ID 映射错，登录错误永不显示
2. games.js — `outerHTML` 丢 onclick，单机游戏全部点不了
3. friends.js/messages.js/profile.js — `acceptFriend`/`rejectFriend`/`removeFriend` 三个文件各自定义互相覆盖
4. auth.js — 封禁用户申诉路由被 auth 中间件 403 挡死
5. games.js — eventListener 从不清理，重开游戏累加处理器

**P1 级（10 个）**：
6. init.js JSON 非原子写入（已修复：先写 `.tmp` 再 rename）
7. init.js `_nextId()` 并发冲突
8. init.js 读写无锁
9. auth.js JWT 密钥硬编码默认值
10. server.js DB 初始化失败后 `_ready` 永远 false，全部 API 永久 503（已修复：catch 里 `_ready=true; _dbFailed=true`）
11. admin.js 封禁分钟传负数
12. admin.js 申诉减刑传负数延长封禁
13. articles.js `download_id:0` 被 `||` 误转 null
14. auth.js 登录解封后返回对象仍带旧 `banned_until`
15. game.js 两处 `res.status(403/404)` 无 JSON body 客户端挂死

**P2 级（通用模式）**：
- `.trim()` 崩溃 ×9：`String(req.body.X || '').trim()` 全线替换
- XSS ×3：封面图 URL 注入、附加图 URL 注入、管理员面板用户名注入
- 权限漏洞 ×4：semi_admin 跨级/漏角色检查/心跳无校验

### 4.4 本地 vs Vercel 差异化

| 项目 | Vercel | 本地 |
|------|--------|------|
| 请求体上限 | 5MB | 100MB |
| 头像上传 | 5MB | 50MB |
| 文章图片 | 10MB | 无限制 |
| 壁纸 | 50MB | 200MB |
| 图片压缩 | 1920px + 75% 质量 | **不压缩，原图直传** |
| 数据库 | Supabase | JSON 文件 |
| 启动方式 | Vercel CLI | `启动.bat` → `scripts/start.js` |
| 判断方式 | `process.env.VERCEL === '1'` | `location.hostname === 'localhost'` |

---

## 5. 未完成的任务

1. **管理员页面用户头像预览** — admin.js 用户列表行没有显示头像
2. **文章评论实时刷新** — 当前需要手动刷新页面
3. **游戏匹配竞态问题** — `routes/game.js` 匹配队列非原子操作，高并发下可能重复匹配
4. **下载计数器竞态** — 读-改-写非原子，并发下计数可能丢失
5. **Supabase RLS 启用但无策略** — 用 service_role key 绕过，但无意义地增加了延迟
6. **vercel.json 全量 rewrite** — 静态资源没走 CDN，全走 serverless 函数
7. **前端 `unescape()` 已废弃** — app.js L257 和 profile.js L142 用了废弃 API
8. **消息页实时推送** — 当前是轮询，没有 WebSocket
9. **管理员通知** — 新用户注册、申诉提交无通知
10. **SEO** — SPA 对搜索引擎不友好，没有 SSR

---

## 6. 与外部系统的关系

### 6.1 第三方服务

| 服务 | 用途 | 配置方式 |
|------|------|---------|
| GitHub | 代码托管 + 自动提交 | `https://github.com/cao123-2024/myblog.git` |
| Supabase | 线上数据库 | 环境变量配置 |
| Vercel | 线上部署 | `vercel.json` + `api/index.js` 桥接 |

### 6.2 环境变量清单

| 变量 | 本地默认 | 说明 |
|------|---------|------|
| `PORT` | 3000 | 服务端口 |
| `JWT_SECRET` | 代码内硬编码 fallback | JWT 签名密钥 |
| `SUPABASE_URL` | 无 | Supabase 项目 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 无 | Supabase 服务密钥 |
| `ADMIN_PIN` | 000000 | 管理员 PIN 码 |
| `VERCEL` | （Vercel 自动设） | 检测部署环境 |
| `FORCE_COLOR` | 1（start.js 设置） | 终端 ANSI 颜色 |

### 6.3 数据库结构（JSON 模式）

每个 JSON 文件是一个数组，存储在 `database/data/` 下：
- `users.json` — 用户（id, username, password, nickname, avatar, role, banned_until, can_upload_images, tag, created_by, wallpaper）
- `articles.json` — 文章（id, title, content, summary, author_id, cover_image, images, download_id）
- `comments.json` — 评论（id, article_id, user_id, content, show_admin_name）
- `friends.json` — 好友关系（id, user_id, friend_id, status: pending/accepted/rejected）
- `messages.json` — 私聊消息（id, from_user, to_user, content, read）
- `downloads.json` — 下载文件（id, title, description, type, url, filename, download_count）
- `verifyCodes.json` — 验证码（id, code, used, created_at）
- `announcements.json` — 公告（id, title, content）
- `wallpapers.json` — 壁纸（id, url, filename）
- `ban_appeals.json` — 申诉（id, user_id, reason, status）
- `game_rooms.json` — 游戏房间
- `game_invites.json` — 游戏邀请

---

## 7. 给"未来的我"的建议

### 7.1 最容易踩坑的地方

1. **启动脚本 `scripts/start.js`** — 用了 ANSI 转义码画框，中文宽度计算是核心（`dw()` 函数），改了文案要重新跑一次确认对齐。`setRawMode` 在无 TTY 环境会崩溃，已加了 try-catch。

2. **三个同名函数互相覆盖** — `acceptFriend`/`rejectFriend`/`removeFriend` 在 friends.js、messages.js、profile.js 中各定义了一次。修过一次加了 `typeof loadFriendList === 'function'` 的互刷，但本质上是全局作用域问题。未来如果要改这些函数逻辑，三个文件全部要更新。

3. **前端 SPA 路由是动态 import 无机制** — 所有页面 JS 都在 index.html 中一次性 `<script>` 加载。如果你加了新页面，记得在 index.html 加 `<script>` 标签，在 `navigate()` 函数里加 case。

4. **数据库 JSON 模式是同步写入** — 虽然加了原子写入（`.tmp` → rename），但并发仍然是问题。如果将来要支持并发访问，必须引入队列或锁。

5. **Vercel 环境下 `/tmp` 是临时的** — 上传文件会在冷启动时丢失。线上不应该依赖文件存储，应该用 Supabase Storage 或 S3。

6. **管理员密码在源代码里** — `database/init.js` 第 39 行左右，JSON 模式创建 admin 用户。密码是 6 个星号，生产环境应该改掉。

7. **游戏事件监听器要用 `_gameEventCleanup`** — 之前漏清理导致内存泄漏。现在 `launchGame()` 每次启动新游戏前先调用 `_gameEventCleanup()`。如果加新游戏，必须把事件绑定存到 `_gameEventCleanup` 里。

### 7.2 需要特别注意的代码逻辑

- **middleware/auth.js 的封禁检查** — 申诉路由被特殊放行：`req.path === '/ban-appeal' && req.method === 'POST'`。改了申诉路由路径的话这里同步修改。
- **database/init.js `initDb()` 返回值** — 它返回 `{ mode, db }` 对象，`db` 是一个返回表操作函数的工厂。不要直接改 `db` 导出方式。
- **启动脚本 Ctrl+C 行为** — SIGINT 现在只杀子进程（server.js），父进程不退出。这是在 `startServer()` 里实现的，不要改回之前的 `process.exit()`。
- **autocommit.js** — 依赖 git 命令可用，检查 `git status --porcelain` 为空时跳过。不要在有未暂存更改时手动干扰。

### 7.3 还没写完但思路清晰的部分

- **WebSocket 推送** — 私聊和游戏需要实时通信，当前是轮询，考虑用 `ws` 库或 Supabase Realtime
- **图片上传到 Supabase Storage** — 避免 Vercel `/tmp` 临时文件的限制
- **文章草稿功能** — 前端已有编辑器，后端加了 `draft` 字段即可
- **文章标签/分类** — articles 表加 `tags` 字段，前端加筛选
- **夜间模式手动切换** — 当前锁定深色模式，加一个 toggle 切换浅色主题
