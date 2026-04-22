---
source: handcrafted
tags:
  - publish
  - checklist
publish: false
---

# Obsidian Publish 发布清单

> 此文件设 `publish: false`，不会出现在公开站点。

---

## 一、安全扫描结果（2026-04-22）

### Vault 扫描
| 目录 | 状态 | 备注 |
|---|---|---|
| AI与技术 | ✅ 安全 | 无隐私信息 |
| 计算机科学 | ✅ 安全 | 无隐私信息 |
| 数学 | ✅ 安全 | 无隐私信息 |
| 人物思想 | ✅ 安全 | 无隐私信息 |
| 投资商业 | ✅ 安全 | 无隐私信息 |
| 学科 | ✅ 安全 | 无隐私信息 |
| 中文教学/金句精选 | ✅ 安全（处理后） | 排除 10 个含学员名文件；清除 54 个文件的 GetNote 签名 URL |
| 中文教学/其他子目录 | ❌ 不发布 | 含学员真实姓名、私密对话内容 |
| Projects/ | ✅ 安全 | 手写索引页，无敏感信息 |

### GitHub Repos 扫描（15 个）
| Repo | 状态 |
|---|---|
| Tony-Claude-Code-Skills | ✅ |
| everything-claude-code | ✅ |
| claude-code-config | ✅ |
| gh-audit | ✅ |
| ChineseThinking | ✅（仅含 .env.local.example 占位符） |
| chinese-teaching-video-system | ✅ |
| LinguaLens | ✅ |
| teaching-notes-sidebar | ✅ |
| ai-video-workflow | ✅（仅含 .env.example 占位符） |
| feishu-lark-to-obsidian | ✅ |
| dev-guides-collection | ✅ |
| freespace | ✅ |
| browser-extensions | ✅ |
| QuickTranslate | ✅ |
| smart-recipe-recommender | ✅ |

---

## 二、发布配置

- **publish.json**：`~/Documents/Tony/.obsidian/publish.json`（白名单模式）
- **publish.css**：`~/Documents/Tony/.obsidian/publish.css`（中文友好排版）
- **.obsidianignore**：已有 `资讯` 排除规则

---

## 三、Obsidian Publish 操作步骤

### 首次发布
1. 打开 Obsidian → `设置（⌘,）`
2. 左侧菜单 → **发布（Publish）**
3. 点击 **设置站点（Site settings）**
   - 站点名称：`Tony的知识花园`
   - 开启：显示图谱、文件浏览器、搜索
4. 点击 **更改（Manage site content）**
5. 在文件列表中，逐目录选择发布（已在 publish.json 配置白名单作参考）：
   - ✅ 选中：AI与技术、计算机科学、数学、人物思想、投资商业、学科、Projects、中文教学/金句精选
   - ❌ 不选：其他所有目录
6. 点击 **发布（Publish changes）**

### 金句精选排除文件（不要勾选）
- `💬 04. 金句回响：爱与价值的多维解读.md`
- `04. 金句回响：爱与稀缺的永恒困惑.md`
- `✨ 金句精选_136.md`
- `05. 金句回响：文化归属的多维解读_1.md`
- `💡 05. 金句回响.md`
- `05. 金句回响：自由与囚禁的多维思考.md`
- `05. 金句回响_2.md`
- `💡 05. 金句回响：传统与变革的三重维度.md`
- `05. 金句回响：文化归属的多维解读_2.md`
- `✨ 金句精选_120.md`

### 后续更新
- 每次新增笔记后，在 Publish 面板点击 **发布更改** 即可
- 新增中文教学内容前，先用以下命令快速扫描：
  ```bash
  grep -rn "Jade\|Thomas\|Thomaz\|托马斯\|身份证" ~/Documents/Tony/中文教学/金句精选/
  ```

---

## 四、站点 URL

发布后访问：`https://publish.obsidian.md/YOUR-SITE-ID`

可在 Obsidian Publish 设置中绑定自定义域名（需要 DNS 配置）。
