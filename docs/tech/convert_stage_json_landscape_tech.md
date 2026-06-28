# Convert Stage JSON Landscape 技术说明

**状态**：已合并到工具链技术说明，本文档仅保留兼容跳转
**最后更新**：2026-06-28
**原覆盖文件**：`tools/convert_stage_json_landscape.mjs`
**合并后维护入口**：`docs/tech/landscape_stage_json_toolchain_tech.md`

## 1. 兼容说明

本文档曾记录 `tools/convert_stage_json_landscape.mjs` 的 CLI 参数、默认输出 id、输出字段、校验规则、控制台摘要、本地验收记录和维护规则。

为避免 CLI 与 Browser Builder 技术说明重复维护，相关内容已合并到：

```text
docs/tech/landscape_stage_json_toolchain_tech.md
```

旧路径保留用于兼容历史引用，不再作为主要维护入口。

## 2. 新文档章节索引

在新文档中查阅 CLI 相关内容：

- 工具链定位：`docs/tech/landscape_stage_json_toolchain_tech.md` 第 1 节。
- 共享转换规则：第 4 节。
- 共享字段与 metadata：第 5 节。
- 共享校验规则：第 6 节。
- CLI 转译器基本契约、命名策略、控制台摘要和验收记录：第 7 节。
- 与 StageLoader 和正式 `stages_landscape/` 数据集的关系：第 10 节。
- 维护规则：第 12 节。

## 3. 关键边界摘要

- CLI 默认仍用于 review/export derivative，默认 output id 为 `<sourceId>_landscape`。
- 如用于正式 landscape runtime 数据集，应显式传入 `--id story_###`，并把输出保存为 `stages_landscape/story_###.json`。
- CLI 不修改 `StageLoader`，不覆盖 portrait Story JSON，不改变 runtime 加载路径。

## 4. 变更记录

| 日期 | 变更类型 | 内容 | 影响范围 |
| --- | --- | --- | --- |
| 2026-06-28 | 合并 | CLI 技术说明已合并到 `docs/tech/landscape_stage_json_toolchain_tech.md`，本文档缩减为兼容跳转。 | 文档维护入口 |
| 2026-06-25 | 新增 | 建立 portrait-to-landscape stage JSON 转译工具和技术说明，记录 CLI、命名策略、转换规则、校验规则和 Story 1-3 验收结果。 | TOOL-01 支持工具链 |