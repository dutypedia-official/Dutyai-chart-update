# KlineCharts-demo-svelte
这是一个示例项目，使用KlineCharts(10.0.0-alpha1)绘制金融K线图，界面UI从[KLineChart Pro](https://pro.klinecharts.com/getting-started.html)改写(KLineChart Pro使用Solid-js，本项目改写为svelte)  
本项目使用[sveltekit](https://svelte.dev/)  
如需vue版本，请参考[klinechart-ui-demo](https://github.com/anyongjin/klinechart-ui-demo)（此版本基于KlineChart 9.8.10）

# 如何使用
由于交易界面UI要求的定制性一般比较高，将此项目打包为package不太适合自由修改。  
所以建议直接clone本项目，提取需要的部分，自由修改页面组件和UI  

## 开始预览
```bash
npm install
npm run dev
```

## 开发笔记
**国际化**  
使用inlang的国际化[插件](https://inlang.com/m/dxnzrydw/paraglide-sveltekit-i18n/getting-started)
1. 在 project.inlang/settings.json 中添加语言标签，并在 messages 文件夹下添加语言文件。
2. 在需要使用语言标签的地方，使用:
```typescript
import * as m from '$lib/paraglide/messages.js'
m.hello()
m['hello']()
```

**注册新指标**  
在 src/lib/coms.ts 中添加新指标的字段和默认参数。

**编译为静态资源**  
sveltekit支持编译静态资源，只需将svelte.config.js中的`adapter-auto`改为`adapter-static`，然后执行`npm run build`，即可在dist目录下生成静态资源。

**数据来源**  
为演示需要，本项目固定使用KlineChart的假数据，如需使用真实数据，请在src/lib/mydatafeed.ts中取消注释改为自己的接口

**云端指标**  
本项目原生支持云端指标加载和显示，后端需提供`/kline/all_inds`和`/kline/calc_ind`接口，具体参数请参考`src/lib/indicators/cloudInds.ts`

**单页面多K线**  
本项目未使用全局store，故理论上支持多窗体，但尚未测试，请自行测试，如有问题请提issue

## 侧边栏状态恢复机制

为了解决页面刷新时侧边栏闪烁的问题，本项目实现了一套完整的侧边栏状态恢复机制。

### 问题描述
在页面刷新时，侧边栏的显示状态和宽度需要从 localStorage 中恢复，但由于 Svelte 组件的生命周期，状态恢复发生在 `onMount` 阶段，这会导致：
1. 初始渲染时侧边栏处于默认状态
2. `onMount` 后状态突然改变，产生视觉闪烁
3. 布局重排导致图表内容区域跳动

### 解决方案

#### 1. 早期引导状态恢复 (Early Bootstrap)
在 `app.html` 中添加了早期执行的脚本，在首次渲染前从 localStorage 读取侧边栏状态：

```javascript
// 在组件渲染前读取持久化状态
const persistedVisible = localStorage.getItem('dutyai.chart.sidebar.visible');
const persistedWidth = localStorage.getItem('dutyai.chart.sidebar.widthPx');

// 存储到全局对象供组件使用
window.__sidebarBootstrap = {
    visible: visible,
    widthPx: visible ? widthPx : 0,
    transitionsEnabled: false
};
```

#### 2. CSS 变量预设
在状态读取后立即设置 CSS 变量，防止布局偏移：

```javascript
// 设置初始 CSS 变量防止布局偏移
const root = document.documentElement;
root.style.setProperty('--sidebar-width', visible ? widthPx + 'px' : '0px');
root.style.setProperty('--sidebar-visible', visible ? '1' : '0');
```

#### 3. 无闪烁 CSS 规则
添加了关键的 CSS 规则来防止初始渲染时的闪烁：

```css
/* 防止侧边栏在初始渲染时可见（如果不应该可见） */
.sidebar-container {
    width: var(--sidebar-width, 0px) !important;
    transition: none !important;
    overflow: hidden;
}

/* 在初始加载期间禁用所有过渡效果 */
.sidebar-container,
.sidebar-container *,
.chart-container,
.chart-container * {
    transition: none !important;
}
```

#### 4. 组件集成
- **SidebarHost.svelte**: 从全局引导状态初始化，使用统一的状态管理函数
- **chart.svelte**: 应用 CSS 变量确保图表容器从一开始就预留正确的空间
- **sidebarBootstrap.ts**: 提供统一的状态管理 API

#### 5. 过渡控制
实现了智能的过渡控制机制：
- 初始加载时禁用过渡效果
- 在 `onMount` 完成后通过 `requestAnimationFrame` 启用过渡
- 在调整大小操作期间临时禁用过渡

### 关键文件

- `src/app.html`: 早期引导脚本和无闪烁 CSS
- `src/lib/kline/sidebarBootstrap.ts`: 状态管理工具函数
- `src/lib/kline/SidebarHost.svelte`: 主要侧边栏组件
- `src/lib/kline/chart.svelte`: 图表容器布局

### 使用说明

此机制是自动的，无需额外配置。侧边栏状态会自动持久化到 localStorage，并在页面刷新时无缝恢复，不会产生任何视觉闪烁或布局跳动。

## TODO
* 滚动条样式未全局生效

## 联系我
请加[KlineChart](https://klinecharts.com/)作者微信，进入微信群，@火木；
或[发邮件](mailto:anyongjin163@163.com)

# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
