# PS AI Fill

Photoshop 内 AI 图像生成桌面应用，基于 Electron + React + Vite + Express。

## 功能

- **AI 图像生成** — 通过 Gemini API 在 PS 选区生成/扩展/外补图像
- **选区内生成** — 基于 Photoshop 当前选区进行 AI 填充
- **扩展画布 (Outpaint)** — 扩展图像边界，AI 补全内容
- **图像扩展 (Extend)** — 在指定方向延伸图像
- **Photoshop 桥接** — 通过 WebSocket + TCP 实时与 PS 通信，支持选区信息获取和图层导出
- **图片缓存/下载管理** — 本地缓存生成结果，支持批量下载

## 项目结构

```
ps-ai-fill/
├── electron/          # Electron 主进程 & preload
│   ├── main.cjs       # 主进程（窗口管理、IPC、服务器启动）
│   └── preload.cjs    # contextBridge API 暴露
├── src/               # React 前端源码 (Vite)
│   ├── App.jsx        # 主应用组件
│   ├── main.jsx       # 入口
│   └── index.css      # TailwindCSS 样式
├── dist/              # 构建产物
│   ├── server.cjs     # Express 服务器（AI API 代理 + PS 桥）
│   └── index.html     # 前端构建输出
├── assets/            # 应用图标
├── ps-bridge.js       # Photoshop 桥接层 (WebSocket + ExtendScript)
├── package.json
└── vite.config.js     # Vite 构建配置
```

## 开发

```bash
# 安装依赖
npm install

# 启动前端开发服务器
npm run dev

# 构建前端
npm run build
```

## 打包

使用 [electron-builder](https://www.electron.build/) 打包为 Windows 安装程序：

```bash
npx electron-builder build --win
```

## 配置

在打包后的 `resources/app/` 下放置 `.env` 文件可配置环境变量：

- `GEMINI_API_KEY` — Gemini API 密钥（可选，用于后端请求）

## 技术栈

- **桌面框架**: Electron
- **前端**: React 19 + Vite 6 + TailwindCSS 4 + Lucide Icons
- **后端**: Express 4
- **PS 桥接**: WebSocket (ws) + ExtendScript + TCP socket
- **构建工具**: electron-builder + NSIS

## 许可

MIT
