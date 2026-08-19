# DeepSeek Harness 插件开发指南

> 依据 DeepSeek Harness 官方文档（cordis 插件教程、发布指南）与本项目实战经验整理。

DeepSeek Harness 基于 **Cordis** 微内核：**一切皆插件**。插件描述自己向系统贡献的内容（服务、事件、工具、界面），由组合文件把孩子装配成一个应用。本文面向"用 dsh 的能力做一个 Web 端可见的插件"（如本仓库的会话管理）。

---

## 1. 插件是什么 / 三种形态

一个插件就是一个模块，通过命名导出 `apply(ctx)` 向系统注册自己的贡献；`ctx`（Context）是它与系统对话的入口。

Cordis 接受三种形态：

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

// 1. 函数形态（最常见）
export function apply(ctx: Context) {}

// 2. 对象形态：一个带 apply 的对象
export const objectPlugin = { name: 'obj', apply(ctx: Context) {} }

// 3. 类形态：Service 子类（当你需要对外发布一个服务时）
export class MyService extends Service {
  constructor(ctx: Context) { super(ctx, 'myService') }
}
export default MyService
```

在需要对外暴露服务之前，用函数形态即可；要提供服务、被其它插件注入时，用 Service 形态。

## 2. 关键写法

```ts
export const name = 'my-plugin'        // 显示元数据（可选，用于诊断）
export const inject = ['someService']  // 声明硬依赖：这些服务就绪后本插件才 apply
export function apply(ctx: Context) {
  // 注册副作用；插件停止/卸载时必须能撤销
  ctx.effect(() => {
    const off = someSubscribe(() => {})
    return () => off()                 // disposer：卸载时调用
  })
  ctx.on('some/event', () => {})       // 监听事件（ctx.on 返回解绑函数）
}
```

组合（怎么把插件接进应用）由 `cordis.yml` / `cordis.patch.yml` 描述：

```yaml
# 一个配置项 = 一个插件
- name: './hello.ts'                 # 相对路径
# 或
- id: my-plugin
  name: 'npm-package-name'           # npm 包名 / bundle
```

loader 会并发挂载各项；加载顺序由服务依赖（`inject`）决定，不是文件顺序。

## 3. 一个包的双面：Host 与 Client

一个 npm 包可以同时贡献**两块**：

| 面 | 载体 | 作用 |
|---|---|---|
| Host（Node 侧） | `main` → `lib/index.js` | 服务、事件、工具、持久化逻辑 |
| Client（浏览器侧） | `exports['./client']` → `lib/client.js` + `package.json` 的 `dsh.client` | 页面 UI、主题、slot |

loader 行会挂载 **Host 面**；`client-modules` 通过 `dsh.client` 发现 **Client 面**并把它送进 Web 启动图。所以一个包可同时是 Host 插件和 Client 插件。

### 3.1 Host 面：对外暴露服务（@Remote）

要让浏览器端能调用 Host 端，用 Cordis/Typert 的 **Remote 服务**：

```ts
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'

export class MyService extends TypertRemoteService {
  constructor(ctx: Context) { super(ctx, 'myService') }

  @Remote('list')
  list(): MyListResult { /* ... */ }
}
export default MyService
```

- `package.json` 需 `exports['./typert']` → 生成的 `lib/typert.host.js`（由 `typert-loader` 在挂载时自动注册贡献）。
- 客户端通过 `ctx.remote.myService.list()` 调用。
- **返回值是 `RemoteResult<T>` = `{ ok: true, value }` 或 `{ ok: false, error }`** —— 客户端必须解包 `value`，不能直接当业务对象用。

### 3.2 Client 面：注册设置页 / UI

浏览器端插件用 slot 系统挂界面。设置页用 `settings.section`：

```ts
import { createElement } from 'react'
export const inject = ['slots', 'remote', 'remote.myService']

export function apply(ctx: ClientContext) {
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'my-plugin',
    order: 30,
    label: '我的设置页',
  }, MyPage))
}
```

- `package.json` 要 `dsh.client = { platform: 'web', inject: [...] }` 且 `exports['./client']`。
- Remote 命名空间由 `dsh-api-remotes`（平台共享包）统一挂载；插件在 `inject` 里声明 `remote.<服务名>` 后即可用 `ctx.remote.<服务名>.*`。**不要**在插件里绕过挂载。

## 4. package.json 必备骨架

```jsonc
{
  "name": "@you/my-plugin",
  "main": "lib/index.js",
  "exports": {
    ".": { "types": "./lib/types/index.d.ts", "default": "./lib/index.js" },
    "./client": { "types": "./lib/types/client/index.d.ts", "default": "./lib/client.js" },
    "./typert": { "types": "./lib/typert.host.d.ts", "default": "./lib/typert.host.js" }
  },
  "dsh": {
    "client": { "inject": ["@deepseek-ai/dsh-client-runtime", "@deepseek-ai/dsh-api-remotes"], "platform": "web" }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "*",
    "@deepseek-ai/dsh-typert-protocol": "*",
    "react": "*"
  },
  "files": ["lib"]
}
```

要点：
- **`main` + `exports['.']`**：Host 插件入口（loader 挂载的点）。
- **`exports['./client']` + `dsh.client`**：让浏览器加载 Client 面。
- **`exports['./typert']`**：Host 的 Remote 贡献（有 @Remote 服务时必需）。
- **`peerDependencies` 用 `*`**：`@deepseek-ai/*` 与 `react` 由 dsh 部署环境提供，勿随包安装/发布。
- **`files: ["lib"]`**：只发布构建产物。

## 5. 构建（依赖 dsh 开发环境）

Host 的 `@Remote`（typert 生成）与 Client bundle 都依赖 dsh 仓库的 `tsc + tsdown` 工具链：

```bash
pnpm install
pnpm build:lib:host     # Host 构建 + typert 生成（lib/index.js, typert.host.js, typert.remote-client.js）
pnpm build:lib:client   # 客户端 bundle（lib/client.js）
```

每次重建 Host 后，`typert.remote-client.js` 需按需做 zod 具名化处理（本仓库对当前工具链做了 `scripts/rewrite-remote-zod.mjs` + tsdown 的 `zod` ESM alias，见 readme）。

> 从远端安装走的是**源码不是产物**：要让 git/npm 安装即用，必须提供自包含的 `prepare` 脚本（pnpm 在 git 安装后运行它自建 `lib/`），否则没有 `lib/` 加载失败。

## 6. 部署 / 安装

`dsh plugin --profile <name> add <spec>` 本质是在 profile 目录跑 `pnpm add <spec>`，并自动把识别为 **bundle**（`dsh.bundle.patch`）的包加进 `dsh.profile.bundles`。

| 来源 | 命令 | 说明 |
|---|---|---|
| 本地目录 | `dsh plugin add /abs/path/to/plugin` | 最直接；源码或含 `lib/` 皆可 |
| git | `dsh plugin add github:you/plugin#<sha>` | 拉**源码**，需 `prepare` 且 pnpm≥10 要用 profile 内 `pnpm-workspace.yaml` 的 `allowBuilds` 授权 |
| tarball | `dsh plugin add ./plugin-0.1.0.tgz` | `pnpm pack` 打包，自带 `lib/`，免构建授权 |
| npm | `dsh plugin add your-package` | `pnpm publish` 时构建好 `lib/` |

- bundle 包的 `cordis.patch.yml` 用 `- insert:` 挂载自己的插件行（或依赖的插件行）。
- 改配置后**重启 `dsh web`** 生效。
- profile 的 `node_modules/@deepseek-ai/` 下条目 dsh 要求是**符号链接**（指向全局 dsh 安装）；别放真实目录。

## 7. 常见坑（实战）

1. **ESM 解析**：loader 从 profile 目录沿 node_modules 链解析插件包，包必须能被 ESM import 到。
2. **symlink**：`profiles/node_modules/@deepseek-ai/<pkg>` 需是指向全局 dsh node_modules 的符号链接。
3. **zod 内联**：某些 tsdown 版本会把 zod 的 CJS interop 留成外部 `require("zod")`，而 zod 不是平台 seed → 用 ESM alias 使其内联。
4. **Remote 方法名**：不要与平台保留名冲突（如 `remove` 是 cordis `Service` 原型方法），否则报 `method conflicts with its namespace service`。
5. **RemoteResult 解包**：客户端拿到的是 `{ ok, value }`，要用 `value`。
6. **self-inject 死锁 / Guard**：客户端 `inject` 声明 `remote.X` 却由本插件挂载 → apply 永不触发；交由 `dsh-api-remotes`（或改用动态注入）解决。
7. **启动早期服务未就绪**：Host 服务依赖的存储域可能尚未打开 → 用 `static inject` + 轮询/事件兜底，避免服务"永久 inert"。

## 8. 从 0 到发布（步骤清单）

1. 在 dsh 仓库存放/按仓库规范新建包源码（`src/index.ts` 等）。
2. 写 `package.json`（见 §4）+ 源码（函数/服务形态，§2、§3）。
3. 在 dsh 仓库构建：`pnpm build:lib:host` + `pnpm build:lib:client`，产出 `lib/`、`typert.*`。
4. 本地验证：`dsh plugin --profile web add /abs/path` → 重启 → 检查页面/日志。
5. 发布：
   - 简单：`pnpm pack` 出 tarball，或把含 `lib/` 的目录给使用者本地 add；
   - 公开：git 托管（需 `prepare` + `allowBuilds`）或 `pnpm publish` 到 npm / GitHub Packages。
6. 在 GitHub 仓库加 **`dsh-plugin` topic** 便于被检索发现。
7. 打 tag（`git tag vX.Y.Z` + push）便于锁定版本安装。

---

参考：`docs/cordis-tutorial/*`、`docs/user/develop/basic/publish.zh.md`（dsh 仓库内），以及本仓库 `readme.md`。
