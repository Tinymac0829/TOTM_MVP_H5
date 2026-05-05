# OPS-01 Story 相机视距校准技术方案

**文档类型**：L2 技术方案文档  
**隶属任务**：OPS-01 GitHub Pages 部署与 Android smoke 收口  
**创建日期**：2026-05-04  
**最后更新**：2026-05-04  
**状态**：临时工程校准方案  
**覆盖需求**：R-020（GitHub Pages URL 可访问，桌面与移动端 smoke 通过）  
**关联文档**：
- `docs/features/ops01_github_pages_deployment_plan.md`
- `docs/mvp_execution_plan_zh.md`
- `docs/design/eng04_core_movement_design.md`
- `docs/design/pm02_core_runtime_design.md`
- `E:\Reverse\Projects\TombOfTheMask\深度逆向分析.md`

---

## 1. 背景与当前阻断

OPS-01 Android 真机第三轮验收中，上一批 viewport / camera 修复已经解决以下问题：

- 开始按钮视觉区域内点击稳定命中：`PASS`
- 通关后“重复游玩”按钮视觉区域内点击稳定命中：`PASS`
- 手指连续不离屏滑动：`PASS`
- 页面稳定性：不滚动、不缩放、不丢 Canvas 焦点，`PASS`
- 主链路 smoke：开始、游玩、收集或通关、重复游玩，`PASS`

当前剩余阻断集中在相机视距：

- camera / viewport 稳定性可视为 `PASS`，但画面视距与竞品差异明显。
- 当前 H5 初始入口画面可见范围的宽和高大约只有竞品的一半，整体面积大约只有竞品的四分之一。
- 滑动阈值体感暂记为 `BLOCKED`，因为当前视距过近会污染移动距离、屏幕反馈和手势灵敏度判断。

因此 OPS-01 不能收口，下一批应只处理 Story 视距 / Renderer 缩放口径，待视距接近竞品后再复验滑动阈值。

## 2. 验收截图观察

验收截图对比对象：

- H5 当前版本：Android Chrome 打开 GitHub Pages 后，角色位于 `story_001` 入口初始位置，尚未移动。
- 竞品版本：同样是角色进入关卡入口初始位置，尚未移动。

观察结论：

- H5 当前画面中 tile 尺寸明显偏大，可见关卡范围过窄。
- 竞品同一初始状态下，横向和纵向都能看到更多地图结构。
- 该问题不像 HUD hit-test 或移动端 viewport 错位，因为当前按钮命中、页面稳定性和主链路已经通过。
- 更高概率根因是 Renderer 等效 `tileSize` / gameplay scale / orthographic size 口径仍未接近竞品。

本批不处理：

- HUD 按钮命中逻辑。
- TouchInput 连续不离屏滑动逻辑。
- 页面滚动、缩放、Canvas 焦点控制。
- PlayerController 运动速度、碰撞、收集、死亡、通关状态机。

## 3. 逆向已知事实

`E:\Reverse\Projects\TombOfTheMask\深度逆向分析.md` 的 `1.6 相机系统` 已确认 Story/Lava 的相机位置跟随规则：

- `UpdateCameraPositionStory()` 用于 Story 和 Lava。
- 相机目标是玩家位置。
- Lerp 因子是 `Mathf.Clamp01(Time.deltaTime * 10.0f)`。
- 60fps 下每帧移动剩余距离约 `16.7%`。
- 30fps 下每帧移动剩余距离约 `33%`。
- 无地图边界 clamp。
- 无 Arcade/Boss 的 X 轴对齐动画、Y 偏移、Section 添加逻辑或二次曲线。

当前 H5 已经按上述规则完成 Story 相机位置跟随：

- Renderer 相机跟随玩家中心。
- Lerp 因子使用 `clamp(dt * 10, 0, 1)`。
- Story 相机不再使用地图边界 clamp。

同一逆向文档的 `7.1 屏幕与相机常量` 提供了视距相关线索：

| 常量 | 值 | 当前含义判断 |
|------|----|--------------|
| 参考宽高比 | `1.777778f` | 16:9 参考宽高比 |
| 参考游戏尺寸 | `1.6f` | 游戏区域基准缩放，可能与 `_gameStageScale` 或 CameraContainerController 相关 |
| 视口乘数 | `2.84f` | 与 Unity 正交相机 `orthographicSize` 计算相关 |
| 居中偏移 | `0.5f` | 半格 / 中心点偏移 |

这些常量说明竞品视距不是只由相机位置决定，还存在屏幕适配、正交相机尺寸或 stage scale 计算。

## 4. 仍未核实的竞品细节

现有逆向信息尚不足以复原完整竞品视距公式。后续如果继续逆向，优先补齐以下内容：

1. `CameraContainerController.UpdateContentLayout()` 的完整反编译或伪代码。
2. Method#578 相机 / 屏幕初始化方法的完整逻辑。
3. `_camera.orthographicSize` 的最终赋值公式。
4. `_camera.rect` 或 viewport rect 是否受 safe area / banner 影响。
5. `referenceAspectRatio = 1.777778f` 在宽高比分支中的具体用法。
6. `referenceGameplaySize = 1.6f` 是乘数、除数、目标 world size，还是 stage root scale。
7. `2.84f` 是直接 orthographic size，还是参与 `referenceGameplaySize * 2.84` 一类的换算。
8. `_gameStageScale = 1.6` 的实际应用点：stage root、camera container、world-to-screen，还是仅作为布局参数。
9. Story 入口初始状态下竞品准确可见 tile 列数和行数。

这些信息拿到前，本方案只作为工程校准方案，不作为最终竞品复刻结论。

## 5. 本批工程方案

在完整竞品视距公式尚未逆向完成前，本批采用截图校准策略：

- 保留 Story 相机位置跟随逻辑。
- 保留无地图边界 clamp 的 Story 相机边界。
- 不引入 Arcade/Boss 的相机规则。
- 将 Renderer 固定 `tileSize = 60` 改为基于 viewport 计算的 Story 等效 tile size。
- 目标是在 Android 竖屏初始入口状态下，让可见宽度和可见高度接近竞品截图。

建议新增 Story 视距目标常量，避免把截图校准值散落在渲染代码中：

```javascript
const STORY_TARGET_VISIBLE_COLUMNS = 12;
const STORY_TARGET_VISIBLE_ROWS = 24;
```

上述数值不是最终竞品逆向常量，只是根据当前 H5 与竞品截图差异做出的第一版工程校准起点。后续 Android 复验时，应根据截图再小幅调整。

## 6. 候选计算方式

### 6.1 方案 A：按宽度校准

```javascript
tileSize = viewport.width / STORY_TARGET_VISIBLE_COLUMNS;
```

优点：

- 横向视野稳定。
- 对按钮命中和 HUD viewport 影响较小，因为仍使用同一套 viewport。

风险：

- Android 浏览器地址栏、底部手势条和不同屏幕比例会导致纵向可见范围差异较大。
- 可能横向接近竞品，但纵向仍偏窄或偏宽。

### 6.2 方案 B：按高度校准

```javascript
tileSize = viewport.height / STORY_TARGET_VISIBLE_ROWS;
```

优点：

- 更直接控制竖屏 Story 的纵向可见范围。
- 与当前“高度可见范围约只有竞品一半”的问题直接相关。

风险：

- 横向可能仍不能接近竞品。
- 浏览器 UI 收起 / 展开时高度变化会带来 tile size 变化。

### 6.3 方案 C：宽高共同约束

```javascript
tileSize = Math.min(
  viewport.width / STORY_TARGET_VISIBLE_COLUMNS,
  viewport.height / STORY_TARGET_VISIBLE_ROWS,
);
```

优点：

- 同时保证宽高可见范围不比目标更窄。
- 对当前“宽和高都偏窄”的问题最稳妥。
- 移动端 viewport 高度受浏览器 UI 影响时，仍有宽度约束兜底。

风险：

- 可能在某些超窄或超高比例设备上显示范围比竞品略大。
- 需要通过 Android 真机截图复验目标列数 / 行数。

本批倾向采用方案 C。

## 7. 实现边界

首轮视距校准代码修改应严格限制在 Renderer 视距 / 缩放相关逻辑内。

允许修改：

- `src/Renderer.js` 中的 tile size 来源、viewport 下的等效 tile size 计算、相机 offset 计算。
- 必要时增加少量内部常量或私有方法，命名需体现 Story 视距校准用途。

首轮视距校准不允许修改：

- `src/TouchInput.js` 的滑动阈值。
- `src/HUD.js` 的按钮视觉区域和 hit-test 逻辑。
- `src/main.js` 的 HUD touch 接入逻辑，除非复验发现 viewport 传参仍有直接 bug。
- `src/PlayerController.js` 的速度、缓冲、碰撞、收集、死亡或通关逻辑。
- `stages/*.json` 关卡数据。
- OPS-01 之外的 Story 2 / Story 3 验收范围。

### 7.1 第四轮微调边界

`2026-05-04` 第四轮 Android 真机测试确认首轮视距修复有效，主链路和滑动手感基本通过，但仍观察到两个可微调项：

- 竞品纵向可见范围仍比当前 H5 多约 `1 tile`，上下约各多半格。
- 滑动阈值体感仍可略微提高灵敏度，但可能受剩余视距差异影响。

因此第四轮允许做以下最小改动：

- 将 Story 目标可见范围从 `12 x 24` 微调为 `12.5 x 25`，使 tile size 约缩小 `4%`，画面等比例拉远。
- 将 TouchInput 的 DPI 阈值因子整体降低 `10%`，先作为真机体感试调。

第四轮仍不修改：

- HUD 按钮视觉区域和 hit-test 逻辑。
- PlayerController 速度、缓冲、碰撞、收集、死亡或通关逻辑。
- 关卡 JSON。
- Story 2 / Story 3 验收范围。

## 8. 验收标准

本批修复后，OPS-01 Android 真机复验至少覆盖：

| 验收项 | 目标 |
|--------|------|
| 开始按钮命中 | 视觉区域内点击稳定命中，保持 `PASS` |
| 重复游玩按钮命中 | 视觉区域内点击稳定命中，保持 `PASS` |
| camera / viewport 画面比例 | 初始入口视距接近竞品截图，宽高可见范围不再只有竞品约一半 |
| 滑动阈值体感 | 视距修复后重新评估，给出 `PASS` 或下一批调参建议 |
| 连续不离屏滑动 | 保持 `PASS` |
| 页面稳定性 | 不滚动、不缩放、不丢 Canvas 焦点，保持 `PASS` |
| 主链路 smoke | 开始 -> 游玩 -> 收集/HUD 或通关 -> 重复游玩，保持 `PASS` |

OPS-01 只有在上述项目全部达到 `PASS`，且静态资源加载和线上缓存版本确认无阻塞时，才可进入收口文档更新。

## 9. 文档升级与作废规则

本文件是 OPS-01 阶段的临时技术校准方案，不是最终相机 / 视距设计基线。

如果后续拿到完整逆向结果，并正式确认新的 Story 相机视距设计方案，应执行以下处理：

1. 新增或更新一份正式 `design` 文档，记录经确认的竞品相机 / 视距公式和设计基线。
2. 将该正式设计同步到 `docs/design/eng04_core_movement_design.md` 与 `docs/design/pm02_core_runtime_design.md` 中对应章节。
3. 将本 tech 文档标记为废弃或历史参考，不再作为后续实现的权威依据。
4. 若正式 design 与本工程校准值冲突，以新的 design 文档为准。

## 10. 后续逆向目标清单

为后续补齐竞品方案，建议逆向输出尽量包含以下格式：

| 目标 | 期望输出 |
|------|----------|
| `CameraContainerController.UpdateContentLayout()` | 完整伪代码，包含 safe area、banner、camera rect、orthographicSize 分支 |
| Method#578 相机 / 屏幕初始化 | 完整伪代码，包含 `1.777778f`、`1.6f`、`2.84f` 的使用位置 |
| `_camera.orthographicSize` | 最终公式和所有参与字段 |
| `_gameStageScale` | 写入位置、读取位置、是否缩放 stage root 或 camera container |
| Story 初始视野 | 初始入口状态下可见 tile 列数 / 行数，最好含截图与像素测量 |
| safe area / banner | 是否改变 camera viewport 或仅影响 UI / banner 容器 |

---

## 11. 当前结论

OPS-01 当前阻断不是 HUD touch、连续滑动或页面稳定性，而是 Story 视距与竞品不匹配。

在完整逆向公式缺失的情况下，本批可以先用 viewport 约束下的动态 Story tile size 做截图校准，让可见范围接近竞品，再进行 Android 真机复验。滑动阈值体感应在视距修复后重新判断。

## 12. 第四轮微调方案

首轮 Story 视距校准提交后，Android 真机测试确认视距问题已修正成功，滑动手感也基本通过。当前不再视为 P0 阻断，而是收口前的体感微调。

本轮目标：

- 视距再等比例拉远一点，匹配竞品纵向多约 `1 tile` 的观察。
- 滑动阈值先提高约 `10%` 灵敏度，待真机复验确认是否保留。

代码目标：

```javascript
const STORY_TARGET_VISIBLE_COLUMNS = 12.5;
const STORY_TARGET_VISIBLE_ROWS = 25;
```

```javascript
const INVALID_DPI_WIDTH_FACTOR = 0.027;
const NORMAL_DPI_FACTOR = 0.144;
```

复验重点：

- camera / viewport 初始入口视距是否比上一轮更接近竞品。
- 开始按钮与重复游玩按钮命中是否继续 `PASS`。
- 滑动阈值是否更接近竞品，且不引入误触。
- 连续不离屏滑动是否继续 `PASS`。
- 页面不滚动、不缩放、不丢 Canvas 焦点是否继续 `PASS`。
- 主链路 smoke 是否继续 `PASS`。

## 13. 第五轮微调方案

第四轮微调提交后，Android 真机测试确认体验比前一轮更接近竞品。当前继续做收口前小幅体感微调。

本轮目标：

- 视距高度从 `25` 微调到 `25.5`。
- 宽度按当前等比例关系同步，从 `12.5` 微调到 `12.75`。
- 滑动阈值继续降低，验证更灵敏的触发距离是否更接近竞品且不引入误触。

代码目标：

```javascript
const STORY_TARGET_VISIBLE_COLUMNS = 12.75;
const STORY_TARGET_VISIBLE_ROWS = 25.5;
```

```javascript
const INVALID_DPI_WIDTH_FACTOR = 0.024;
const NORMAL_DPI_FACTOR = 0.128;
```

复验重点：

- 初始入口视距是否继续接近竞品，且没有显得过远。
- 滑动阈值是否更灵敏，同时不出现明显误触。
- 开始按钮与重复游玩按钮命中是否继续 `PASS`。
- 连续不离屏滑动是否继续 `PASS`。
- 页面不滚动、不缩放、不丢 Canvas 焦点是否继续 `PASS`。
- 主链路 smoke 是否继续 `PASS`。

## 14. 滑动时间窗口补齐方案

逆向报告 `8.5` 已确认竞品存在滑动最小距离阈值，MVP 当前 `TouchInput` 已有同类机制：初始化时计算一次 `swipeThreshold`，`touchmove` 中比较 `dx / dy` 是否超过阈值，超过后再按主导方向产出输入。

当前第五轮 Android 真机体感调参值如下：

```javascript
const INVALID_DPI_WIDTH_FACTOR = 0.024;
const NORMAL_DPI_FACTOR = 0.128;
```

这两个值低于逆向确认的竞品原始值 `0.03 / 0.16`，属于 H5 浏览器版本在 Android 真机上的体感校准结果。由于 H5 浏览器触摸事件、CSS 像素、设备 DPI 口径与 Unity App 并不完全等价，本轮暂不把距离阈值回调到竞品原始值。

逆向报告 `8.5a` 进一步确认竞品还有滑动判定时间窗口：手指按下后，必须在 `swipeTime = 1.0s` 内完成滑动；如果 `swipeTimeout <= 0`，本次位移不进入距离阈值判定，而是把起点重置为当前触点，并重新开启 `swipeTimeout = swipeTime`。

本轮目标：

- 补齐 `swipeTime = 1.0s` 的时间窗口机制。
- 保留第五轮距离阈值 `0.024 / 0.128`，避免同一轮同时改变距离和时间两个变量。
- Android 真机先单独复验时间窗口对滑动手感的影响，再判断是否需要把距离阈值回调到竞品原始值。

代码目标：

```javascript
const SWIPE_TIME_SECONDS = 1.0;
```

`touchstart` 时重置：

```javascript
swipeTimeout = SWIPE_TIME_SECONDS;
touchBeginPoint = touch.position;
```

`touchmove` 时处理：

```javascript
if (swipeTimeout <= 0) {
  touchBeginPoint = touch.position;
  swipeTimeout = swipeTime;
  return;
}
```

新版完整反编译还确认两个边界：

- 未达距离阈值时，竞品直接返回，不更新起点，也不重置 `swipeTimeout`。
- 竞品没有速度/加速度辅助判定；理论上仍接受“主要快速位移恰好跨越超时帧，重置后剩余位移不足阈值”的极端输入丢失边界。

复验重点：

- Android 真机滑动是否更接近竞品，尤其是慢拖、按住后再滑、普通快速滑动三类场景。
- 当前第五轮距离阈值是否仍然合适。
- 连续不离屏滑动是否继续 `PASS`。
- 页面不滚动、不缩放、不丢 Canvas 焦点是否继续 `PASS`。
- 主链路 smoke 是否继续 `PASS`。
