# Stage Tile Editor 技术说明

**状态**：已接入，当前作为本地关卡制作与校对工具使用
**最后更新**：2026-06-10
**文档层级**：L2 轻量技术说明
**覆盖文件**：`tools/stage_tile_editor.html`
**关联文档**：`docs/tech/eng02_stage_format_and_loader_tech.md`

## 1. 目的

Stage Tile Editor 是 TOTM MVP 阶段的本地浏览器关卡编辑工具，用于制作 Story 关卡 tile 布局、导入已有 stage JSON、导出运行时可读取的 stage JSON，并生成人工校对用 Review HTML。

本文档记录当前编辑器的稳定行为，重点覆盖：

- stage 身份字段的 `id` / 顶部 tag / 展示 `name` 规则。
- JSON 导入、JSON 导出与 Review HTML 导出的数据契约。
- 信息面板的辅助校验口径。
- 后续维护时不应破坏的编辑器工作流。

## 2. 模块边界

本文档覆盖：

- `tools/stage_tile_editor.html` 单文件编辑器。
- 浏览器内 canvas 绘制、关卡标签编辑、尺寸调整、导入导出和本地存储行为。
- 与 `stages/story_*.json` 运行时数据格式直接相关的导出字段。
- Review HTML 的命名和页面显示规则。

本文档不覆盖：

- `StageLoader` 运行时加载和校验实现；该部分以 `docs/tech/eng02_stage_format_and_loader_tech.md` 为准。
- Story 关卡本身的玩法设计与验收；单关接入以对应 `docs/features/lvl*_story*_card.md` 为准。
- 最终关卡数据审批流程；当前仍以人工 review 与浏览器验收结果为准。

## 3. 身份字段规则

### 3.1 字段含义

编辑器内部同时处理三个身份相关概念：

| 概念 | 来源 | 用途 |
| --- | --- | --- |
| `id` | `stage.id` 或由顶部 tag 生成 | 权威身份字段；JSON 顶层 `id`、Review HTML 文件名和 Review 页面标题均以它为准 |
| 顶部 tag | 由 `id` 派生，或由用户在 tab 输入框编辑 | 供编辑器顶部 tab 显示和输入；不是最终展示名 |
| 展示 `name` | 由 `id` 派生 | info box、JSON `meta.name`、Review HTML 页面显示名使用 |

当前规则要求：`id` 是权威值。只要 `stage.id` 存在，就先从 `id` 解析身份；不得优先使用旧的 `meta.name` 覆盖 `id`。

### 3.2 `id` 标准化

`normalizeStageId(rawId)` 的规则：

- 转为字符串并去除首尾空白。
- 转小写。
- 将非字母数字字符合并为 `_`。
- 去除首尾 `_`。
- 空值回退为 `story`。

示例：

| 输入 | 标准化结果 |
| --- | --- |
| `Story 003` | `story_003` |
| `story-003` | `story_003` |
| ` story_003 ` | `story_003` |
| 空字符串 | `story` |

### 3.3 顶部 tag 与 `id` 的转换

顶部 tab 输入框显示的是由 `id` 派生的 tag：

- `story_003` 显示为 `story 003`。
- `chapter_1` 显示为 `chapter 1`。

用户编辑顶部 tag 时，编辑器会重新生成 `id`：

| 顶部 tag 输入 | 生成 `id` | 三位编号校验 |
| --- | --- | --- |
| `story03` | `story_03` | 不通过 |
| `Story 003` | `story_003` | 通过 |
| `Story 3` | `story_3` | 不通过 |

### 3.4 展示 `name` 派生

展示名始终由 `id` 派生。对 Story id，展示名会去掉数字前导零：

| `id` | 展示 `name` |
| --- | --- |
| `story_003` | `Story 3` |
| `story_03` | `Story 3` |
| `story03` | `Story 3` |
| `chapter_1` | `chapter 1` |

该展示名用于 info box、JSON `meta.name` 和 Review HTML 页面显示，不应反向作为权威身份来源。

### 3.5 Info Box 辅助校验

Info box 当前提供两个身份校验：

- Story 前缀：`id` 是否以 `story` 开头。
- 三位编号：Story 编号是否正好为三位数字。

这两个校验用于人工提醒，不阻止导出。正式 Story 文件仍应使用三位编号，例如 `story_003`。

## 4. 编辑器工作流

### 4.1 启动与本地状态

编辑器是单文件 HTML 工具，可直接在浏览器中打开。启动时：

1. 先尝试从 `localStorage` 读取 `totm_editor_stages`。
2. 如果读取失败或没有本地数据，则创建一个默认新关卡。
3. 默认新关卡尺寸为 `20x20`，id 按当前关卡数量生成，例如第一个新关卡为 `story_001`。

本地存储只用于编辑器恢复，不等同于正式关卡数据。正式数据必须通过“导出 JSON”生成并保存到 `stages/story_*.json`。

### 4.2 Tile 类型

当前 tile 枚举与 ENG-02 关卡格式保持一致：

| 数值 | 名称 | 编辑器快捷键 | 说明 |
| --- | --- | --- | --- |
| `0` | Empty | `0` | 空地 |
| `1` | Wall | `1` | 墙 |
| `2` | Enter | `2` | 出生点 |
| `3` | Exit | `3` | 出口 |
| `4` | Dot | `4` | 普通收集点 |
| `5` | Coin | `5` | 金币 |
| `6` | Star | `6` | 星星 |
| `7` | Spikes | `7` | 尖刺 |

### 4.3 常用编辑操作

- 左键在 canvas 上绘制当前选中的 tile。
- 右键点击已有 tile 会拾取该 tile 为当前画笔。
- `Ctrl+Z` 撤销，`Ctrl+R` 重做。
- “调整尺寸”会保留仍在新尺寸范围内的旧 tiles，超出部分丢弃，新区域补 `0`。
- “填充边界墙”会将最外圈设置为 `Wall`。
- “清空”会将当前关卡所有 tile 设置为 `Empty`。

### 4.4 底图辅助

底图用于对照截图或草图进行人工描图：

- 底图文件只存在于当前浏览器会话，不会写入 JSON。
- `bgOffX`、`bgOffY`、`bgScale` 会进入 localStorage，便于本地恢复编辑状态。
- 底图透明度和显示开关参与当前渲染，但不属于正式关卡数据。

## 5. JSON 导入契约

“导入 JSON”通过 prompt 接收完整 JSON 字符串。导入流程：

1. 解析 JSON。
2. 如果存在顶层 `data.id`，调用 `setStageId(s, data.id)`，以 `id` 作为权威身份来源。
3. 如果没有顶层 `id`，但存在 `data.meta.name`，则用 `meta.name` 生成 tag 和 id，作为旧数据兼容路径。
4. 设置 `width`、`height` 和 `tiles`。
5. 刷新 tab、canvas、info box，并保存到 localStorage。

注意：

- 当前导入流程主要做 JSON 解析和字段赋值，不替代 ENG-02 的完整关卡校验。
- 导入后应检查 info box 的 Enter、Exit、收集物数量和身份校验。
- 准备提交正式关卡数据前，仍应使用运行时加载校验或等价脚本检查。

## 6. JSON 导出契约

“导出 JSON”会根据当前编辑器状态生成运行时 stage JSON：

```json
{
  "id": "story_003",
  "version": 1,
  "width": 24,
  "height": 17,
  "enter": { "x": 4, "z": 5 },
  "exit": { "x": 19, "z": 1 },
  "tiles": [],
  "meta": {
    "name": "Story 3",
    "stars_total": 3,
    "dots_total": 77,
    "coins_total": 3
  }
}
```

导出规则：

- `id` 来自 `resolveStageIdentity(s).id`。
- `meta.name` 来自 `id` 派生展示名。
- `enter`、`exit` 从 tile `2` 和 tile `3` 的当前位置扫描得到。
- `stars_total`、`dots_total`、`coins_total` 从 tiles 直接统计。
- `tiles` 保持二维数组结构，外层为 `z` 行，内层为 `x` 列。

如果当前关卡缺少 Enter 或 Exit，导出函数本身不会阻断导出，因此提交正式数据前必须查看 info box 或运行 StageLoader 校验。

## 7. Review HTML 导出契约

“保存 Review HTML”用于生成独立校对页面，方便人工检查 tile 布局、坐标和收集物数量。

当前规则：

- 默认文件名为 `${id}_tilemap_review.html`，例如 `story_003_tilemap_review.html`。
- 页面标题和主标题显示 `${id}(${name})`，例如 `story_003(Story 3)`。
- Review 内部 stage data 同时保留 `id` 和 `name`。
- Review HTML 包含图例、横纵坐标标签、grid 渲染和统计信息。

Review HTML 是校对产物，不是运行时数据源；正式运行时数据仍以 `stages/story_*.json` 为准。

## 8. 本地存储契约

localStorage key 固定为：

```text
totm_editor_stages
```

保存字段包括：

- `name`
- `id`
- `w`
- `h`
- `tiles`
- `bgOffX`
- `bgOffY`
- `bgScale`

localStorage 不应被视为可提交成果。需要留存或评审的内容必须通过导出 JSON 或 Review HTML 显式保存。

## 9. 维护规则

后续修改编辑器时，应遵守以下规则：

1. 不得把 `meta.name` 恢复为优先身份来源；顶层 `id` 必须继续优先。
2. 修改 `id`、顶部 tag 或展示 `name` 的转换逻辑时，必须同步更新本文档的示例。
3. 修改 JSON 导出字段时，必须确认 ENG-02 stage JSON 格式是否也需要更新。
4. 修改 Review HTML 文件名或标题显示时，必须保留人工校对能同时看到 `id` 和展示 `name` 的能力。
5. 修改 localStorage 字段时，应考虑旧本地数据的兼容读取；必要时增加迁移逻辑。
6. Info box 校验是人工提示，不应替代正式 StageLoader 校验。

## 10. 验收清单

修改 `tools/stage_tile_editor.html` 后，至少检查：

- [ ] `story03` 生成 `story_03`，展示名为 `Story 3`，三位编号校验不通过。
- [ ] `Story 003` 生成 `story_003`，展示名为 `Story 3`，三位编号校验通过。
- [ ] `Story 3` 生成 `story_3`，展示名为 `Story 3`，三位编号校验不通过。
- [ ] 导入包含顶层 `id` 的 JSON 时，顶部 tag 从 `id` 派生，而不是从 `meta.name` 覆盖。
- [ ] 兼容旧 JSON：没有顶层 `id`、但有 `meta.name` 时，导入后应能从 `meta.name` 推导出可编辑的 `id/tag`。
- [ ] 导出一致性：导出的 JSON 顶层 `id` 必须等于编辑器当前解析出的关卡 `id`。
- [ ] 导出 JSON 时，`meta.name` 为从 `id` 派生的展示名。
- [ ] Review HTML 默认保存文件名使用 `${id}_tilemap_review.html`。
- [ ] Review HTML 页面标题或主标题同时显示 `id(name)`。
- [ ] Info box 同时显示 Story 前缀校验和三位编号校验。
- [ ] 缺少 Enter 或 Exit 时，info box 能提示问题；提交正式 stage JSON 前，还必须通过 StageLoader 或等价脚本校验。

建议基础语法检查：

```powershell
node -e "const fs=require('fs'); const html=fs.readFileSync('tools/stage_tile_editor.html','utf8'); const m=html.match(/<script>([\s\S]*)<\/script>/); if(!m) throw new Error('script block not found'); new Function(m[1]); console.log('script syntax ok');"
```

### 10.1 2026-06-10 手动验收记录

验收来源：用户手动验收
验收结果：以下 11 项均为 PASS

- [x] `story03` 生成 `story_03`，展示名为 `Story 3`，三位编号校验不通过。PASS
- [x] `Story 003` 生成 `story_003`，展示名为 `Story 3`，三位编号校验通过。PASS
- [x] `Story 3` 生成 `story_3`，展示名为 `Story 3`，三位编号校验不通过。PASS
- [x] 导入包含顶层 `id` 的 JSON 时，顶部 tag 从 `id` 派生，而不是从 `meta.name` 覆盖。PASS
- [x] 兼容旧 JSON：没有顶层 `id`、但有 `meta.name` 时，导入后应能从 `meta.name` 推导出可编辑的 `id/tag`。PASS
- [x] 导出一致性：导出的 JSON 顶层 `id` 必须等于编辑器当前解析出的关卡 `id`。PASS
- [x] 导出 JSON 时，`meta.name` 为从 `id` 派生的展示名。PASS
- [x] Review HTML 默认保存文件名使用 `${id}_tilemap_review.html`。PASS
- [x] Review HTML 页面标题或主标题同时显示 `id(name)`。PASS
- [x] Info box 同时显示 Story 前缀校验和三位编号校验。PASS
- [x] 缺少 Enter 或 Exit 时，info box 能提示问题；提交正式 stage JSON 前，还必须通过 StageLoader 或等价脚本校验。PASS

## 11. 已核实与待确认

已核实：

- `tools/stage_tile_editor.html` 当前存在 `normalizeStageId`、`makeStageIdFromTag`、`makeStageNameFromId`、`resolveStageIdentity`、`exportJSON`、`importJSON` 和 `saveReviewHTML`。
- 当前导入流程先读取顶层 `id`，再兼容 `meta.name`。
- 当前导出 JSON 顶层包含 `id`，`meta.name` 从身份派生。
- 当前 Review HTML 默认文件名使用 `id`。
- 当前仓库没有 `docs/tools/` 目录；按现有文档规则，本文档放入 `docs/tech/`。
- 2026-06-10 已实现“打开 editor 或新增关卡 tag/tab 时清空导出数据”行为，并通过 Node DOM stub 行为校验。

待确认：

- 后续是否要新增统一的 `docs/tools/` 目录来收纳开发辅助工具文档。
- 是否要为编辑器行为补充自动化测试脚本，而不仅是手动和 Node 语法检查。

## 12. 已实现功能：导出数据清空规则

### 12.1 背景

当前“导出数据”文本框用于显示最近一次导出的 JSON。如果用户已经导出过某个关卡，再新建关卡 tag/tab，旧 JSON 仍可能留在文本框中，容易被误认为是新关卡的导出结果。

### 12.2 目标行为

打开 editor 或新增关卡 tag/tab 时，应清空“导出数据”文本框。

具体规则：

- 打开 editor 后，`#exportArea` 应为空。
- 点击“+ 新关卡”创建新关卡 tag/tab 后，`#exportArea` 应立即清空。
- 该行为只清空导出显示区，不修改当前 stage 数据。
- 该行为不应影响 `localStorage` 中保存的关卡编辑状态。
- 该行为不应改变 JSON 导入、JSON 导出或 Review HTML 导出规则。

### 12.3 验收标准

- [x] 打开 editor 后，“导出数据”文本框为空。
- [x] 先导出当前关卡 JSON，再点击“+ 新关卡”，新关卡创建完成后“导出数据”文本框为空。
- [x] 新建关卡后，清空行为只影响 `#exportArea`，不修改 stage 数据。
- [x] 再次点击“导出 JSON”时，文本框显示新当前关卡的 JSON。

### 12.4 2026-06-10 校验记录

校验方式：Node DOM stub 执行 `tools/stage_tile_editor.html` 内联脚本。

结果：

- 打开后 `#exportArea` 为空。
- 第一次导出 JSON 的 `id` 为 `story_001`。
- 调用 `addStage()` 后 `#exportArea` 为空。
- 再次导出 JSON 的 `id` 为 `story_002`。

## 13. 变更记录

| 日期 | 变更类型 | 内容 | 影响范围 |
| --- | --- | --- | --- |
| 2026-06-10 | 新增 | 建立 Stage Tile Editor 技术说明，记录 id/tag/name、导入导出、Review HTML 和验收口径。 | `tools/stage_tile_editor.html` 后续维护与关卡制作流程 |
| 2026-06-10 | 更新 | 记录 11 项用户手动验收 PASS，并追加“打开 editor 或新增关卡 tag/tab 时清空导出数据”的待实现需求。 | 编辑器文档验收记录与后续功能实现范围 |
| 2026-06-10 | 实现 | 实现打开 editor 和新增关卡 tag/tab 后清空 `#exportArea`，并记录 Node DOM stub 行为校验结果。 | `tools/stage_tile_editor.html` 导出数据显示区 |
