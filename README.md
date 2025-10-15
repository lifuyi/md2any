# 公众号 Markdown 编辑器

<div align="center">
  <img src="logo.svg" width="120" height="120" alt="公众号 Markdown 编辑器">

  一个专为微信公众号设计的 Markdown 编辑器
</div>

## 🌟 在线体验

👉 **[]()**

## ✨ 功能特点



### 📸 智能图片处理（⭐ 最新升级）
- **智能粘贴**：支持从任何地方粘贴图片（截图、浏览器、文件管理器）
- **自动压缩**：图片自动压缩到合理大小（最高压缩 80%+）
- **本地存储**：使用 IndexedDB 持久化存储，刷新不丢失
- **编辑友好**：编辑器中使用短链接（`img://img-xxx`），不会卡顿
- **多图网格**：2-3 列自动排版，类似朋友圈
- **完美兼容**：复制到公众号时自动转 Base64

### 🚀 强大功能
- **实时预览**：左侧编辑，右侧即时查看效果
- **一键复制**：直接粘贴到公众号编辑器，格式完美保留
- **智能粘贴**：支持从飞书、Notion、Word 等富文本应用直接粘贴
- **图片拖拽**：支持拖拽图片文件到编辑器
- **样式收藏**：收藏常用样式，快速切换
- **文件上传**：支持 .md / .markdown 文件
- **代码高亮**：优雅的代码块展示，支持多种语言
- **响应式设计**：完美适配桌面、平板、手机

## 📖 使用指南

### 快速开始

2. 在左侧输入或粘贴 Markdown 内容
3. 选择喜欢的样式主题
4. 点击「复制到公众号」
5. 粘贴到微信公众号编辑器



## 🛠️ 技术栈

- **Vue 3** - 渐进式前端框架
- **Markdown-it** - 强大的 Markdown 解析器
- **Highlight.js** - 代码语法高亮
- **IndexedDB** - 本地图片持久化存储
- **Canvas API** - 客户端图片压缩
- **Turndown** - HTML 转 Markdown（智能粘贴）
- **纯 CSS** - 无需构建工具，开箱即用

## 📂 项目结构




## 💡 核心特性

### ⭐ 图片处理系统（最新升级）

**技术架构**：
```
用户粘贴图片
    ↓
Canvas API 压缩（最大 1920px，质量 85%）
    ↓
IndexedDB 持久化存储
    ↓
编辑器显示短链接（img://img-xxx）
    ↓
预览区从 IndexedDB 加载显示
    ↓
复制时自动转 Base64
```

**核心优势**：
- ✅ **100% 成功率**：不依赖外部图床，完全本地化
- ✅ **编辑器流畅**：短链接不会造成卡顿
- ✅ **刷新不丢失**：IndexedDB 持久化存储
- ✅ **智能压缩**：平均压缩 50%-80%
- ✅ **跨平台支持**：支持截图、浏览器、文件管理器等所有粘贴来源

**多图网格布局**：
- 连续 2 张图片：并排两列展示
- 连续 3 张图片：一行三列展示
- 连续 4 张图片：2×2 网格
- 5 张及以上：3 列网格布局

### 公众号完美兼容
- ✅ 自动将 CSS Grid 转换为 Table 布局
- ✅ 所有样式转为内联样式
- ✅ 图片自动转 Base64
- ✅ 强制样式优先级（!important）

### 推荐样式
带有 ✨ 标识的样式是特别推荐的：
- **Anthropic Claude** - 优雅的技术文档风格
- **金融时报** - 专业的财经风格
- **纽约时报** - 经典的新闻风格
- **技术风格** - 程序员最爱

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 如何贡献
1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

### 添加新样式
1. 在 `styles.js` 中添加新的样式配置
2. 确保包含所有必需的元素样式
3. 测试各种 Markdown 元素的渲染效果
4. 提交 PR 并附上效果截图

## 👨‍💻 作者

**花生** (alchaincyf)
- 📧 邮箱：[alchaincyf@gmail.com](mailto:alchaincyf@gmail.com)
- 🌟 知识星球：[AI编程：从入门到精通](https://wx.zsxq.com/group/48888144124288)
- 💻 GitHub：[@alchaincyf](https://github.com/alchaincyf)

## 🎓 知识星球

本项目是我为知识星球「**AI编程：从入门到精通**」的用户开源的工具。

在星球里，你可以：
- 🚀 学习 AI 编程最佳实践
- 💡 获取更多开源项目
- 🤝 与同好交流技术
- 📚 获得系统化的学习路径

👉 [加入知识星球](https://wx.zsxq.com/group/48888144124288)

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 开源。

你可以自由地：
- ✅ 商业使用
- ✅ 修改
- ✅ 分发
- ✅ 私有使用

## 🙏 致谢

- 感谢所有贡献者和使用者
- 感谢知识星球的朋友们的支持
- 特别感谢 Claude 在项目开发中的协助

## 📊 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=alchaincyf/huasheng_editor&type=Date)](https://star-history.com/#alchaincyf/huasheng_editor&Date)

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/alchaincyf">花生</a>
  <br>
  如果觉得有用，请给个 ⭐️ Star 支持一下！
</div>