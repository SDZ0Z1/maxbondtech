# Maxbond Technology 官网

Maxbond Technology（香港 IT 服务公司）的官方网站。纯 HTML + CSS + JS，无框架、无构建步骤，可直接部署到 GitHub Pages。

风格参考 sprout.store：白底黑字 + 荧光绿（`#ccff4d`）、像素风 logo / 图标、手写批注、等宽字高亮、信纸风 FAQ。主视觉和内容图标是白底上的 ASCII 字符画（风格参考 Kort AI）：黑色字符表现明暗，最密的地方垫荧光绿色块。Hero 是一颗浮在海浪上、自转的荧光绿大陆地球。

## 文件结构

```
index.html                       首页（长页）
services/
  website-development.html       Website Development
  mobile-development.html        Mobile Development
  ai-chatbot.html                AI Chatbot（含 Max 演示区）
  customized-solution.html       Customized Solution
contact.html                     联系页（表单）
404.html                         404 页（GitHub Pages 自动使用）
assets/
  css/style.css                  全站样式（顶部有目录）
  js/config.js                   ★ 公司资料、表单接口配置
  js/main.js                     导航、标签页、滚动动画、表单
  js/chatbot.js                  聊天机器人 "Max"（前端演示版）
  js/ascii.js                    ASCII 字符画（Hero、服务卡片、服务页头图、ASCII 图标）
  js/icon-art.js                 ASCII 图标用的像素图数据（由 pixel-art.mjs 生成）
  img/                           logo、favicon、分享图、Max 头像 (max.svg)
  img/icons/                     像素图标（小图标直接使用；也是 ASCII 图标的无 JS 备用图）
  img/logos/                     各技术的官方 Logo（Tools we use 跑马灯）
tools/pixel-art.mjs              像素图标 / logo 生成器（可选，需要 Node）
robots.txt / sitemap.xml         SEO
.nojekyll                        让 GitHub Pages 原样发布文件
```

## 本地预览

任选一种方式启动静态服务器，然后打开 <http://localhost:5500>：

```bash
python -m http.server 5500
```

```bash
npx serve -l 5500
```

> 直接双击打开 HTML 也能看，但部分功能（例如 404 页）需要通过服务器访问才准确。

## 上线前必须替换的内容

### 1. 联系资料（占位符）

在编辑器里用「全局查找替换」处理以下字符串，会同时改到所有 HTML 和 `config.js`：

| 占位符 | 说明 |
| --- | --- |
| `hello@maxbondtech.com` | 公司邮箱 |
| `+852 0000 0000` | 电话（显示用） |
| `+85200000000` | 电话（`tel:` 链接用，无空格） |
| `Unit 0000, 00/F, Example Tower, Hong Kong` | 办公地址 |
| `Mon–Fri, 9:30am – 6:30pm HKT` | 办公时间（联系页） |

### 2. 客户评价（目前是虚构示例）

`index.html` 中 `<!-- PLACEHOLDER -->` 注释下的 3 条评价是示意文案，**上线前必须换成真实客户评价（并取得客户同意）或整段删除**。

### 3. 需要客户确认的文案

文案是英文初稿，以下承诺性内容请客户逐条确认，不符合就修改：

- 免费咨询（free consultation / free 30-minute call）
- 一个工作日内回复
- 固定价格报价（fixed-price quote）
- 时间预估：网站 4–8 周、Chatbot 2–4 周、App 2–4 个月、系统 2–6 个月；价格套餐里的 4–6 周 / 6–12 周 / 3–6 个月
- 免费保养期：Launch 1 个月、Grow 3 个月
- 各服务页「Tools we use」里列出的技术（跑马灯里的 Logo）
- 支付方式（FPS、Stripe、PayPal、AlipayHK、WeChat Pay）
- 联系表单的预算区间（HK$50,000 / 150,000 / 500,000）
- 首页行业跑马灯（Retail、F&B 等）

## 联系表单

GitHub Pages 是静态托管，表单需要第三方服务帮忙发邮件。配置在 `assets/js/config.js` 的 `form`：

- **未配置时（现在）**：点击「Send message」会打开访客自己的邮件程序，内容已预先填好，发到公司邮箱。
- **Web3Forms**（免费 250 封/月，用邮箱申请 access key 即可）：
  ```js
  form: {
    endpoint: 'https://api.web3forms.com/submit',
    extraFields: { access_key: '你的 ACCESS KEY' },
    subject: 'New enquiry from maxbondtech.com',
  }
  ```
- **Formspree**（免费 50 封/月，需注册）：
  ```js
  form: {
    endpoint: 'https://formspree.io/f/你的表单ID',
    extraFields: {},
    subject: 'New enquiry from maxbondtech.com',
  }
  ```

表单自带必填校验和防垃圾机器人的隐藏字段。服务页的「Get a free quote」按钮会带上 `?service=website` 等参数，自动勾选对应服务。

## 聊天机器人 "Max"

- 右下角的 Max 是**纯前端演示版**：用关键字匹配回答服务、价格、时间、联系方式等问题，数据不会离开浏览器。
- 问答内容在 `assets/js/chatbot.js` 的 `INTENTS` 数组里，每条有关键字（`keys`）、回答（`reply`）和推荐追问按钮（`chips`），可直接增删。
- **以后要接真正的 AI**：不要把 API key 写进前端（任何人都看得到）。做一个小后端（例如 Cloudflare Worker / Vercel Function）保管 key，然后在页面里调用：
  ```js
  window.MaxbondChat.setResolver(async (message, history) => {
    const res = await fetch('https://你的后端/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    });
    return (await res.json()).reply; // 纯文本，会自动转义
  });
  ```
- 任何按钮加上 `data-open-chat` 属性即可打开聊天窗口。

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库（例如 `maxbond-website`），把本文件夹所有文件推上去：
   ```bash
   git init
   git add .
   git commit -m "Initial website"
   git branch -M main
   git remote add origin https://github.com/<你的账号>/maxbond-website.git
   git push -u origin main
   ```
2. 仓库 **Settings → Pages**：Source 选 **Deploy from a branch**，Branch 选 `main` / `(root)`，保存。
3. 一两分钟后网站会出现在 `https://<你的账号>.github.io/maxbond-website/`。全站用的是相对路径，子路径下也能正常运行。

### 绑定 maxbondtech.com

DNS 配好之后再做（否则 github.io 地址会跳转到还打不开的域名）：

1. 在域名商后台添加 DNS 记录：

   | 类型 | 主机 | 值 |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `<你的账号>.github.io` |

2. 仓库 **Settings → Pages → Custom domain** 填 `maxbondtech.com` 并保存（GitHub 会自动在仓库里生成 `CNAME` 文件）。
3. 证书签发后勾选 **Enforce HTTPS**。

`sitemap.xml`、`robots.txt` 和各页面的 canonical / 分享图链接已经按 `https://maxbondtech.com/` 写好。

## 修改设计

- **颜色、字体、间距**：`assets/css/style.css` 顶部的 `:root` 变量。
- **页头 / 页脚**：每个 HTML 页面各有一份（纯静态，利于 SEO），修改时记得 7 个页面一起改（`index.html`、`contact.html`、`404.html`、`services/*.html`）。
- **ASCII 字符画**（Hero、服务卡片、服务页头图）：由 `assets/js/ascii.js` 在浏览器里用 Canvas 实时绘制。
  - 颜色：`style.css` 里的 `--ascii-ink`（字符颜色，黑色）和 `--ascii-hl`（高亮色块，荧光绿）。荧光绿字符直接放在白底上几乎看不见，所以用的是"黑字符 + 荧光绿色块"的双色画法，和网站里 `delivered on time` 这类荧光笔高亮是同一种做法。
  - 图案：`ascii.js` 里的 `SCENES` 有五个场景。
    - `earth`（首页 Hero）：每一帧实时计算。地球缓慢自转，被照亮的大陆用荧光绿色块表示（大陆形状是程序生成的），还有极地冰盖、大气边缘光和海面反光；前景是五层滚动的海浪，浪花是荧光绿；天空有很淡的星点。
    - `website`、`mobile`、`chatbot`、`custom`（服务卡片和服务页）：各是一段 Canvas 绘图代码，颜色越深字符越密，最密的部分变成荧光绿色块。
  - 使用：任何位置放 `<canvas class="ascii" data-ascii="website"></canvas>` 即可。可用 `data-cell="5x7"` 调整字符大小，加上 `data-stars` 会在空白处加星点。
  - 动画包括入场显现、轻微闪烁和鼠标靠近时字符跳动、变亮；画面滚出屏幕时自动暂停。系统开启「减少动态效果」时只显示静态画面。
- **ASCII 图标**（功能卡片、Why us、合作流程、价格套餐、咨询横幅、404 数字）：在 HTML 里写成 `<img class="ico" data-ascii-icon="rocket" src="…/icons/rocket.svg">`，`ascii.js` 会把它换成画布，按同一张像素图用字符重画：黑色轮廓变成 `0`/`1`，荧光绿像素变成荧光绿色块，白色填充变成淡点。鼠标移到卡片上时图标会短暂"跳码"。没有 JavaScript 时仍显示原来的像素图标。导航、标签页、表单里 18–28px 的小图标做成字符画会看不清，所以保留像素风格。
- **像素图标 / logo / ASCII 图标数据**：都来自 `tools/pixel-art.mjs` 里的像素图。改完运行：
  ```bash
  node tools/pixel-art.mjs
  ```
  会重新输出 `assets/img/` 下的 SVG 和 `assets/js/icon-art.js`。
- **Tools we use 跑马灯**：Logo 来自开源图标库 [Simple Icons](https://simpleicons.org)（CC0 授权，商标归各品牌所有），已经填好品牌色、存放在 `assets/img/logos/`。默认显示灰色，鼠标悬停时显示品牌色。要加新工具：从 Simple Icons 下载对应 SVG，在 `<svg` 后面加上 `fill="#品牌色"`，再在服务页的 `logo-row` 里加一个 `<li class="tool">`（两个 `logo-row` 都要加）。AWS、OpenAI、Slack、Microsoft 系列的 Logo 不在 Simple Icons 里，所以没有放。
- **Max 头像**：`assets/img/max.svg`，像素风格（荧光绿气泡加眼睛），同样由 `tools/pixel-art.mjs` 里的 `MAX` 像素图生成。
- **分享图**：`assets/img/og-image.png`（1200×630），换图时保持同名即可。

## 浏览器与可访问性

- 支持主流现代浏览器（Chrome、Safari、Edge、Firefox）及手机。
- 尊重系统「减少动态效果」设置；键盘可操作导航、标签页、FAQ 和聊天窗口。
