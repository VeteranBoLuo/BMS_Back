# 轻笺 🌊 

![top-language](https://img.shields.io/github/languages/top/VeteranBoLuo/BMS_Back)
[![Website](https://img.shields.io/website?up_message=online&url=https%3A%2F%2Fboluo66.top)](https://boluo66.top) 
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/VeteranBoLuo/BMS_Back)
![GitHub last commit](https://img.shields.io/github/last-commit/VeteranBoLuo/BMS_Back)

> **云端书签的智能管理革命**  
轻笺是专为效率控设计的云端书签管理神器，以智能标签为核心，帮你瞬间归档网页、笔记与灵感碎片。通过动态关联的标签网络，实现书签/笔记的跨设备秒搜、多维分类与智能推荐，让知识管理像刷社交动态一样轻松有趣


🌐 **立即体验**：[轻笺](https://boluo66.top/#/home)  
📱 **多端适配**：完美支持桌面/移动设备

## 📑 目录
- [🛠 技术架构](#-技术栈)  
- [⚡ 核心功能](#-核心功能)  
- [🚀 快速开始](#-快速开始)  
- [✨ 开发路线](#-未来路线图)  
- [⭐ 参与贡献](#-Stargazers)  

## 🛠 技术栈
| 层级       | 技术选型                          |
|------------|-----------------------------------|
| **前端**   | Vue3 + Pinia + Vite + Typescript |
| **后端**   | Node.js + Express + Mysql       |
| **工具链** | GitHub Actions     |


## ⚡ 核心功能

### 🧲 __书签 & 笔记__
- **智能书签引擎**  
  🌐 一键保存网页（自动抓取网站图标与描述），支持**多标签分类**（如`#前端` `#灵感库`），书签间通过标签动态关联形成**知识图谱**。  
  🔍 **闪电搜索**：支持书名/标签/描述跨字段联合检索（如“React教程 #框架”），结果按关联度智能排序。  
  📦 **批量管理**：拖拽式书签归类、标签批量操作（如为50个书签统一添加`#deprecated`标签）。

- **轻量化笔记辅助**  
  📝 笔记与书签**共享标签体系**，可绑定书签生成“**知识卡片**”（例：技术文档+学习心得联动）。

### 📦 __配置中心__
- **🖼 书签管理**  
  可视化卡片墙/列表视图自由切换，支持按标签、收藏时间、热度多维度排序。  
  🗑️ **智能清理**：自动识别失效链接，定期提醒整理冗余书签。

- **🧭 智能标签工坊**  
  🔗 标签关系图谱可视化（如`#前端`→关联`#Vue`/`#React`），支持标签合并/别名设置。  
  🏷️ **嵌套标签系统**：支持多级标签嵌套（如`#学习/前端/框架`），实现精细化分类。

- **🛠 个人实验室**  
  ⚙️ **快捷键操作**：支持书签、标签右键直接快速修改删除。  
  🌓 **主题皮肤库**：莫兰迪色系/暗黑模式/自定义主题色。  
  📱 **多端同步策略**：自适应移动端布局。


## 🚀 快速开始
```bash
# 克隆前端仓库
git clone https://github.com/VeteranBoLuo/BMS_Front

# 安装依赖
npm install

# 启动开发环境 (访问 http://localhost:5173)
npm run dev

# 生产环境构建
npm run build
```
> 💡 后端服务需同步部署 [BMS_Back](https://github.com/VeteranBoLuo/BMS_Back)


## ✨ 未来路线图
- **AI智能归档**：基于历史行为自动推荐书签标签  
- **灵感火花**：关联书签的智能内容推荐引擎  
- **轻笺宇宙**：UGC书签合集共享


## ⭐ Stargazers

非常感谢各位好心人留下的星星。非常感谢你们的支持！

[![Stargazers for BMS_Front](https://reporoster.com/stars/VeteranBoLuo/BMS_Back)](https://github.com/VeteranBoLuo/BMS_Back/stargazers)
