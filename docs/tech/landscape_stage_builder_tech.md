# Landscape Stage Builder 技术说明

**状态**：已合并到工具链技术说明，本文档仅保留兼容跳转
**最后更新**：2026-06-28
**原覆盖文件**：`tools/landscape_stage_builder.html`
**合并后维护入口**：`docs/tech/landscape_stage_json_toolchain_tech.md`

## 1. 兼容说明

本文档曾记录 `tools/landscape_stage_builder.html` 的浏览器 GUI 输入输出、UI 流程、下载模式、默认正式 id 策略、校验摘要和 custom pipeline 设计。

为避免 CLI 与 Browser Builder 技术说明重复维护，相关内容已合并到：

```text
docs/tech/landscape_stage_json_toolchain_tech.md
```

旧路径保留用于兼容历史引用，不再作为主要维护入口。

## 2. 新文档章节索引

在新文档中查阅 Browser Builder 相关内容：

- 工具链定位：`docs/tech/landscape_stage_json_toolchain_tech.md` 第 1 节。
- 共享转换规则：第 4 节。
- 共享字段与 metadata：第 5 节。
- 共享校验规则：第 6 节。
- Browser Builder 输入、输出、UI 流程、下载模式和验收项：第 8 节。
- custom pipeline / variant transform：第 9 节。
- 与 Stage Tile Editor、formatter 和 StageLoader 的关系：第 10 节。
- 维护规则：第 12 节。

## 3. 关键边界摘要

- Browser Builder 默认仍生成正式 id，例如 `story_004`，不默认生成 `story_004_landscape`。
- 默认“生成 landscape JSON”仍固定执行顺时针 90 度转换，输出 `${stageId}.json`。
- custom/variant 输出仍使用 `transform: "custom_pipeline"` 和 `transforms`，默认下载 `${stageId}_custom_transform.json`。
- Browser Builder 第一版只做下载，不直接写入仓库，不修改 `StageLoader`，不覆盖 portrait Story JSON。

## 4. 变更记录

| 日期 | 变更类型 | 内容 | 影响范围 |
| --- | --- | --- | --- |
| 2026-06-28 | 合并 | Browser Builder 技术说明已合并到 `docs/tech/landscape_stage_json_toolchain_tech.md`，本文档缩减为兼容跳转。 | 文档维护入口 |
| 2026-06-28 | 扩展 | 确认 Landscape Stage Builder custom transform pipeline 设计，补充多步变换、metadata、UI 队列、下载命名、正式化规则和验收项。 | `tools/landscape_stage_builder.html` |
| 2026-06-25 | 新增 | 建立 Landscape Stage Builder GUI 工具实现前技术说明，明确下载模式、正式 id 默认策略、转换校验规则、UI 流程和与现有工具边界。 | TOOL-01 支持工具链 |