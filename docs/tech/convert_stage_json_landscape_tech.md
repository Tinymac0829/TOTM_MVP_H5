# Convert Stage JSON Landscape 技术说明

**状态**：已接入，当前作为本地 portrait-to-landscape stage JSON 转译工具使用
**最后更新**：2026-06-25
**文档层级**：L2 轻量技术说明
**覆盖文件**：`tools/convert_stage_json_landscape.mjs`
**关联文档**：`docs/features/tool01_landscape_stage_json_translator_card.md`

## 1. 目的

`convert_stage_json_landscape.mjs` 用于把 portrait authoring stage JSON 可复现地转成 landscape derivative JSON。

它服务于 TOOL-01：

- 为 review/export 生成可检查的横版派生 JSON。
- 为未来正式横屏 runtime stage JSON 生产链路预留命名能力。
- 避免手工复制、旋转、改写关卡数据。

该脚本不会修改 StageLoader，也不会改变当前 LAND-01 runtime 旋转实现。

## 1.1 职责边界

本文档是 `tools/convert_stage_json_landscape.mjs` 的 L2 技术说明，负责记录当前 CLI 脚本的具体行为，包括参数、默认输出 id、输出字段、校验规则、控制台摘要、本地验收记录和维护规则。

TOOL-01 的任务级目标、范围边界、命名决策和验收口径以 `docs/features/tool01_landscape_stage_json_translator_card.md` 为准。

浏览器 GUI 工具的输入输出、UI 流程和下载模式以 `docs/tech/landscape_stage_builder_tech.md` 为准。GUI 第一版默认使用用户确认的正式 stage id，例如 `story_004`；这不改变本 CLI 默认 review/export derivative id 为 `<sourceId>_landscape` 的行为。

## 2. 流水线位置

推荐生产链路：

```text
Stage Tile Editor export
  -> stage JSON normalization
  -> portrait-to-landscape translation
  -> official runtime stage JSON
  -> StageLoader load
```

当前规范化工具是 `tools/format_stage_json.mjs`。它后续可以按项目需要重命名为更明确的 normalization 工具，但规范化和横版转译应保持职责分离。

## 3. CLI 基本契约

脚本用法：

```powershell
node tools/convert_stage_json_landscape.mjs <input.json> <output.json> [--id <stageId>]
```

参数规则：

- 第一个参数是输入 portrait stage JSON。
- 第二个参数是输出 landscape stage JSON。
- 缺少参数时输出 usage，并以退出码 `1` 结束。
- `--id <stageId>` 可覆盖输出 JSON 顶层 `id`。
- 输出路径不能与输入路径相同；相同时脚本会在写入前失败。

## 4. 命名策略

### 4.1 Review/export derivative

默认模式用于派生文件 review/export。

示例：

```powershell
node tools/convert_stage_json_landscape.mjs stages/story_001.json tmp/tool01_landscape/story_001_landscape.json
```

输出 id 默认由源 id 加 `_landscape` 后缀：

```text
source id: story_001
output id: story_001_landscape
```

该模式让派生文件身份保持显式，避免与当前已验证的 portrait runtime JSON 混淆。

### 4.2 未来正式横屏 runtime

如果未来 MVP 正式切换为横屏 runtime，推荐使用目录语义区分数据集，而不是把 `_landscape` 后缀放进正式关卡 id。

示例：

```powershell
node tools/convert_stage_json_landscape.mjs stages_source/story_001.json stages_landscape/story_001.json --id story_001
```

此时：

- 文件路径表达横屏数据集：`stages_landscape/story_001.json`
- runtime stage id 仍是：`story_001`

这样可以避免 `_landscape` 泄漏到 `GameState`、HUD、URL、Story 编号和 QA 文档。

## 5. 转换规则

脚本使用 LAND-01 已验收的顺时针 90 度旋转：

```text
newWidth = oldHeight
newHeight = oldWidth
newX = oldHeight - 1 - oldZ
newZ = oldX
```

转换范围：

- `width`
- `height`
- `enter`
- `exit`
- `tiles` 内每个 tile 的坐标位置

tile 数值本身保持不变。

## 6. 输出字段

输出 JSON 基于输入 JSON 深拷贝后更新：

- `id`
- `width`
- `height`
- `enter`
- `exit`
- `tiles`
- `meta.orientation`
- `meta.transform`
- `meta.sourceStageId`

追加的 meta 字段：

```json
{
  "orientation": "landscape",
  "transform": "rotate90_clockwise",
  "sourceStageId": "story_001"
}
```

输入已有 `meta` 字段会保留，并追加或覆盖上述转译元数据。

## 7. 校验规则

脚本会在写出前校验输入和输出。

输入校验：

- `width` 是正整数。
- `height` 是正整数。
- `tiles` 是数组。
- `tiles.length === height`。
- 每行 tile 数等于 `width`。
- tile 值必须是 `0` 到 `7` 的已知类型。
- `enter` 和 `exit` 是范围内整数坐标。
- `enter` 指向 Enter(2)。
- `exit` 指向 Exit(3)。

输出校验：

- 输出尺寸和 `tiles` 结构合法。
- 输出 `enter` 和 `exit` 合法并指向正确 tile。
- Enter、Exit、Dot、Coin、Star、Spikes 计数与输入一致。

任何错误都会阻止写出或导致非零退出码。

## 8. 控制台输出

成功写出后，脚本输出摘要：

- 输出路径
- 输入路径
- source id
- output id
- source size
- output size
- expected output size
- output rows
- output row widths
- source/output enter
- source/output exit
- Enter、Exit、Dot、Coin、Star、Spikes 输入输出计数
- count check 结果

## 9. 验收记录

### 9.1 2026-06-25 TOOL-01 本地验证

语法检查：

- [x] `node --check tools/convert_stage_json_landscape.mjs` 通过。

CLI 行为：

- [x] 缺少参数时输出 usage，并以退出码 `1` 结束。
- [x] 输出路径等于输入路径时，在写入前失败。
- [x] `--id story_001` 可生成 output id 为 `story_001` 的正式命名模式测试文件。

Story 1-3 转译：

| Stage | Output Path | Output ID | Landscape Size | Landscape Enter | Landscape Exit | Count Check |
| --- | --- | --- | --- | --- | --- | --- |
| `story_001` | `tmp/tool01_landscape/story_001_landscape.json` | `story_001_landscape` | `30x17` | `(1, 12)` | `(28, 10)` | PASS |
| `story_002` | `tmp/tool01_landscape/story_002_landscape.json` | `story_002_landscape` | `22x21` | `(17, 11)` | `(1, 1)` | PASS |
| `story_003` | `tmp/tool01_landscape/story_003_landscape.json` | `story_003_landscape` | `17x24` | `(11, 4)` | `(15, 19)` | PASS |

正式命名模式验证：

| Source | Output Path | `--id` | Output ID | Result |
| --- | --- | --- | --- | --- |
| `stages/story_001.json` | `tmp/tool01_landscape_official/story_001.json` | `story_001` | `story_001` | PASS |

所有 Story 1-3 转译结果的 Enter、Exit、Dot、Coin、Star、Spikes 计数均与源文件一致。

## 10. 维护规则

后续修改 `tools/convert_stage_json_landscape.mjs` 时，应遵守：

1. 不得默认覆盖输入 JSON。
2. 修改旋转方向或命名策略前，必须同步更新 TOOL-01 功能卡。
3. 如果 future official runtime 采用 `stages_landscape/`，应同步 StageLoader 技术文档和运行时加载策略。
4. 新增 tile 类型时，必须同步脚本 tile 表、StageLoader 校验和相关关卡格式文档。
5. 继续保持 review/export derivative id 和 official runtime id 两种命名模式边界清晰。

## 11. 变更记录

| 日期 | 变更类型 | 内容 | 影响范围 |
| --- | --- | --- | --- |
| 2026-06-25 | 新增 | 建立 portrait-to-landscape stage JSON 转译工具和技术说明，记录 CLI、命名策略、转换规则、校验规则和 Story 1-3 验收结果。 | TOOL-01 支持工具链 |

