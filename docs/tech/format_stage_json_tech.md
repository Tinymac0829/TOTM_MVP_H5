# Format Stage JSON 技术说明

**状态**：已接入，当前作为本地 stage JSON 格式化与快速检查工具使用
**最后更新**：2026-06-10
**文档层级**：L2 轻量技术说明
**覆盖文件**：`tools/format_stage_json.mjs`
**关联文档**：`docs/tech/eng02_stage_format_and_loader_tech.md`

## 1. 目的

`format_stage_json.mjs` 是 TOTM MVP 阶段的 Node CLI 工具，用于把已有 stage JSON 格式化为项目可读格式，并在写出后输出基础统计和结构 warning。

本文档记录当前脚本的稳定行为，重点覆盖：

- CLI 参数和输入输出路径规则。
- JSON 格式化规则。
- tile 统计输出。
- `tiles` 结构 warning 规则。
- 后续维护时不应误解的边界。

## 2. 模块边界

本文档覆盖：

- `tools/format_stage_json.mjs` 单文件 Node CLI 工具。
- 输入 JSON 读取、格式化、输出目录创建和文件写出行为。
- 写出后的控制台摘要、tile 计数和 warning 行为。

本文档不覆盖：

- `StageLoader` 运行时加载和拒绝非法关卡的完整校验逻辑；该部分以 `docs/tech/eng02_stage_format_and_loader_tech.md` 为准。
- Stage Tile Editor 的浏览器编辑、导入导出和 Review HTML 行为；该部分以 `docs/tech/stage_tile_editor_tech.md` 为准。
- 关卡玩法验收和浏览器实际通关验收。

## 3. CLI 基本契约

脚本用法：

```powershell
node tools/format_stage_json.mjs <input.json> <output.json>
```

参数规则：

- 第一个参数是输入 JSON 文件路径。
- 第二个参数是输出 JSON 文件路径。
- 缺少任一参数时，脚本输出 usage 并以退出码 `1` 结束。

示例：

```powershell
node tools/format_stage_json.mjs tmp/story_003_raw.json stages/story_003.json
```

## 4. 输入输出行为

输入：

- 通过 `fs.readFileSync(inputPath, "utf8")` 读取。
- 通过 `JSON.parse(input)` 解析。
- 输入必须是合法 JSON；非法 JSON 会让脚本抛出解析错误。

输出：

- 通过 `stringifyStage(stageData)` 生成格式化文本。
- 如果输出目录不存在，脚本会用 `fs.mkdirSync(outputDir, { recursive: true })` 创建。
- 通过 `fs.writeFileSync(outputPath, output, "utf8")` 写出。
- 输出文件末尾保留一个换行。

注意：脚本会写入 `outputPath`。运行前必须确认输出路径正确，避免覆盖已有正式 stage JSON。

## 5. JSON 格式化规则

### 5.1 顶层对象

`stringifyStage(stageData)` 会按 `Object.entries(stageData)` 的顺序输出顶层字段：

- 顶层以 `{` 开始、`}` 结束。
- 每个顶层字段缩进两个空格。
- key 使用 `JSON.stringify(key)` 输出，因此字段名带双引号。
- 输出文件末尾追加一个换行。

脚本不会主动重排字段顺序；字段顺序来自输入 JSON 解析后的对象枚举顺序。

### 5.2 标量值

字符串、数字、布尔值和 `null` 使用 `JSON.stringify(value)` 输出。

### 5.3 简单数组

如果数组元素都不是数组，也不是普通对象，则单行输出：

```json
[1, 2, 3]
```

这使 tile row 可以保持一行一个 row 的可读格式。

### 5.4 嵌套数组或对象数组

如果数组中包含数组或普通对象，则分多行输出，并按层级缩进。

典型用途是 `tiles`：

```json
"tiles": [
  [1, 1, 1],
  [1, 0, 1],
  [1, 1, 1]
]
```

### 5.5 `{x,z}` 坐标对象

当普通对象满足以下条件时，脚本会内联输出：

- key 数量正好为 2。
- 包含 `x` 和 `z`。
- 两个值都是整数。

示例：

```json
"enter": { "x": 4, "z": 5 }
```

该规则用于保持 `enter` 和 `exit` 坐标紧凑可读。

### 5.6 其他普通对象

不满足 `{x,z}` 内联规则的普通对象会分多行输出。例如 `meta` 会保持对象结构展开。

## 6. Tile 统计输出

脚本内置的 tile 名称表：

| 数值 | 名称 |
| --- | --- |
| `0` | Empty |
| `1` | Wall |
| `2` | Enter |
| `3` | Exit |
| `4` | Dot |
| `5` | Coin |
| `6` | Star |
| `7` | Spikes |

`countTiles(stageData)` 的行为：

- 对 `0` 到 `7` 的已知 tile 初始化计数为 `0`。
- 仅当 `stageData.tiles` 是数组时才遍历。
- 非数组 row 会被跳过。
- 遍历数组 row 内的 tile 值并计数。
- 控制台只打印已知 tile `0` 到 `7` 的计数。

注意：脚本当前不会把未知 tile 值作为 warning 输出；未知 tile 值不在最终控制台计数表中单独展示。

## 7. Warning 规则

`validateShape(stageData)` 只做轻量结构 warning，不阻止写出文件。

当前 warning 条件：

| 条件 | warning |
| --- | --- |
| `tiles` 不是数组 | `tiles is not an array` |
| `tiles.length !== height` | `tiles row count (...) != height (...)` |
| 某一行不是数组 | `tiles[index] is not an array` |
| 某一行长度不等于 `width` | `tiles[index] width (...) != width (...)` |

重要边界：

- warning 在文件写出后打印。
- warning 不会让脚本退出失败。
- warning 不等同于 StageLoader 的完整校验。
- 脚本不会校验 `id` 是否存在、`enter` / `exit` 是否存在、tile 值是否合法、收集物数量是否与 `meta` 一致。

## 8. 控制台输出

成功写出后，脚本依次输出：

1. `Wrote <outputPath>`
2. `id`
3. `size`
4. `rows`
5. `row widths`
6. `enter`
7. `exit`
8. `Empty(0)` 到 `Spikes(7)` 的计数
9. 如果存在 warning，则输出 `warnings:` 和逐条 warning

示例摘要：

```text
Wrote stages/story_003.json
id: story_003
size: 24x17
rows: 17
row widths: 24
enter: { "x": 4, "z": 5 }
exit: { "x": 19, "z": 1 }
Dot(4): 77
warnings:
- tiles[0] width (23) != width (24)
```

## 9. 维护规则

后续修改 `tools/format_stage_json.mjs` 时，应遵守以下规则：

1. 修改格式化输出样式时，必须同步更新本文档的格式化示例。
2. 新增 tile 类型时，必须同步更新脚本中的 `TILE_NAMES`、本文档和 ENG-02 关卡格式文档。
3. 如果 warning 改为阻止写出或导致非零退出码，必须明确记录 warning 与 error 的边界变化。
4. 如果新增 StageLoader 等价校验，必须说明哪些校验是轻量 warning，哪些是正式拒绝条件。
5. 保持 CLI 参数简单，避免让格式化脚本承担关卡设计审批职责。
6. 运行脚本前必须确认 `outputPath`，因为脚本会直接写出并覆盖目标文件。

## 10. 验收清单

修改 `tools/format_stage_json.mjs` 后，至少检查：

- [ ] `node --check tools/format_stage_json.mjs` 通过。
- [ ] 缺少参数时输出 usage，并以退出码 `1` 结束。
- [ ] 合法输入 JSON 能写出到指定 `outputPath`。
- [ ] 输出目录不存在时能自动创建。
- [ ] `enter` / `exit` 这类 `{x,z}` 整数对象保持单行内联。
- [ ] `tiles` 保持一行一个 row 的可读格式。
- [ ] 控制台输出 `id`、`size`、`rows`、`row widths`、`enter`、`exit`。
- [ ] 控制台输出 `Empty(0)` 到 `Spikes(7)` 的计数。
- [ ] `tiles.length !== height` 时输出 warning。
- [ ] row 宽度不等于 `width` 时输出 warning。
- [ ] warning 不会阻止文件写出，除非后续需求明确改变该行为。

### 10.1 2026-06-11 验收记录

验收产物：

- `tmp/format_stage_json_acceptance/bad_shape_input.json`
- `tmp/format_stage_json_acceptance/valid/story_003_formatted.json`
- `tmp/format_stage_json_acceptance/warnings/bad_shape_output.json`

验收结果：

- [x] `node --check tools/format_stage_json.mjs` 通过。
- [x] 缺少参数时输出 usage，并以退出码 `1` 结束。
- [x] 合法输入 `stages/story_003.json` 能写出到指定 `outputPath`。
- [x] 输出目录不存在时能自动创建。
- [x] `enter` / `exit` 这类 `{x,z}` 整数对象保持单行内联。
- [x] `tiles` 保持一行一个 row 的可读格式。
- [x] 控制台输出 `id`、`size`、`rows`、`row widths`、`enter`、`exit`。
- [x] 控制台输出 `Empty(0)` 到 `Spikes(7)` 的计数；Story 3 验收输出包含 Dot `77`、Coin `3`、Star `3`、Spikes `5`。
- [x] `tiles.length !== height` 时输出 warning：`tiles row count (2) != height (3)`。
- [x] row 宽度不等于 `width` 时输出 warning：`tiles[1] width (2) != width (3)`。
- [x] warning 不阻止文件写出；warning fixture 输出文件写出成功，命令退出码为 `0`。

## 11. 已核实与待确认

已核实：

- `tools/format_stage_json.mjs` 是 Node ESM 脚本。
- 当前 CLI 参数为 `<input.json> <output.json>`。
- 当前脚本会直接写入 `outputPath`。
- 当前格式化器会把 `{x,z}` 整数坐标对象内联输出。
- 当前脚本会统计并打印 tile `0` 到 `7` 的数量。
- 当前 warning 只覆盖 `tiles` 数组形状、行数和行宽。
- 当前 warning 不阻止写出，也不设置非零退出码。
- 2026-06-11 已完成本文档验收清单，结果全部 PASS。

待确认：

- 是否需要对未知 tile 值增加 warning。
- 是否需要把部分 warning 升级为失败退出。
- 是否需要新增统一的 `docs/tools/` 目录来收纳开发辅助工具文档。

## 12. 变更记录

| 日期 | 变更类型 | 内容 | 影响范围 |
| --- | --- | --- | --- |
| 2026-06-10 | 新增 | 建立 Format Stage JSON 技术说明，记录 CLI 用法、格式化规则、统计输出、warning 规则和验收口径。 | `tools/format_stage_json.mjs` 后续维护与关卡 JSON 格式化流程 |
| 2026-06-11 | 验收 | 完成 `format_stage_json.mjs` 文档验收清单，记录合法格式化、缺参、warning 和输出格式结果。 | 文档验收记录与 formatter 后续维护基线 |
