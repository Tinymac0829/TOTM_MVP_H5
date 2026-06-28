# Landscape Touch Axis Intent Note

**状态**：观察记录，暂不进入实现
**最后更新**：2026-06-28
**文档层级**：L2 技术备忘
**关联文件**：`src/TouchInput.js`、`docs/tech/eng03_input_foundation_tech.md`

## 1. 背景

横屏双手握持时，玩家常用左右拇指从屏幕底部两角发力。这个姿势下，拇指滑动轨迹天然更容易呈斜线，而不是严格水平或垂直。

典型风险区间大约在 30° 到 60°：

- 玩家主观意图可能是上滑或下滑。
- 实际触摸轨迹中 `absDx` 与 `absDy` 很接近。
- 若 `absDx` 略大于 `absDy`，当前主轴判定可能把意图竖滑识别成左滑或右滑。

该问题主要影响横屏移动端手感，不代表当前输入系统存在确定 bug；它是横屏握持姿势带来的意图判定风险。

## 2. 当前实现

当前 `TouchInput` 在 `touchmove` 阶段即时识别方向：

```text
if absDx <= swipeThreshold and absDy <= swipeThreshold:
  return

if shouldUseHorizontalAxis(absDx, absDy):
  direction = dx > 0 ? right : left
else:
  direction = dy > 0 ? down : up
```

当前 landscape 模式的轴优先级只影响完全相等的情况：

```text
portrait:  horizontal if absDx > absDy
landscape: horizontal if absDx >= absDy
```

因此，绝大多数斜向输入仍由 `absDx` 与 `absDy` 的大小直接决定。

## 3. 风险

若直接加入硬 deadzone，例如要求主轴必须明显大于副轴才触发，可能产生新的手感问题：

- 原本会被识别为某个方向的斜滑变成不响应。
- 45° 附近的常见拇指轨迹可能频繁卡在“未判定”状态。
- 玩家可能感知为输入延迟或漏输入，而不是误判减少。

因此，这个问题不宜只用简单的“轴差不足就丢弃”处理。

## 4. 可选方案

### 4.1 取消 landscape 水平 tie-break

把 landscape 的完全相等判定从 `absDx >= absDy` 改回 `absDx > absDy`。

优点：

- 风险最低。
- 只影响完全相等的 45° 输入。

缺点：

- 对真实斜向误判帮助很有限，因为真实触摸很少精确相等。

### 4.2 主轴 dominance ratio

要求主轴相对副轴有一定优势，例如：

```text
major >= minor * 1.15
```

优点：

- 可以减少 45° 附近误判。
- 实现相对简单。

缺点：

- 斜向动作可能不触发，尤其横屏拇指自然轨迹落在 30° 到 60° 时。
- 参数需要真机验证，不能只靠桌面模拟决定。

### 4.3 主轴最小差值

在比例之外增加像素差值条件，例如：

```text
major - minor >= shortSide * 0.01
```

优点：

- 避免小幅抖动造成轴选择。
- 可与当前短边 fallback 口径保持一致。

缺点：

- 不同设备尺寸、DPI、拇指速度下体感可能不同。
- 单独使用仍可能造成不响应。

### 4.4 意图窗口 / 延迟判定

超过基础 `swipeThreshold` 后，如果 `absDx` 与 `absDy` 仍很接近，不立即判定方向，而是继续等待一个很短的窗口，例如 30 到 60ms，或等待额外位移。

优点：

- 不把模糊输入立即丢弃。
- 有机会用后续轨迹确认玩家真实意图。

缺点：

- 增加实现复杂度。
- 可能增加输入响应延迟。
- 需要明确超时后如何处理仍然模糊的输入。

### 4.5 方向引导区或手区策略

根据触点起始位置在屏幕左下、右下等区域调整方向判定偏好。

优点：

- 更贴近横屏双手握持场景。

缺点：

- 设计复杂度高。
- 容易引入隐式规则，玩家换手或单手操作时可能不一致。
- 当前 MVP 阶段不建议优先采用。

## 5. 当前决策

本次只记录问题，不修改 `TouchInput.js` 行为。

原因：

- 这是输入意图判定问题，需要真机横屏握持验证。
- 简单 hard deadzone 可能把误判变成不响应。
- 当前已有阈值、时间窗口、active touch 绑定和横屏 tie-break 基线，继续改动应作为独立输入手感任务处理。

若后续进入实现，建议优先评估“主轴 dominance ratio + 短 intent window”的组合，而不是单独使用硬 deadzone。

## 6. 后续验证建议

若后续调整，应至少覆盖：

- 横屏手机双手握持，左右拇指分别执行上、下、左、右滑。
- 30°、45°、60° 斜滑样本。
- 快滑与慢滑。
- 连续不离屏滑动。
- 多指干扰场景。
- `debugInput=1` 日志中的 `absDx`、`absDy`、`swipeThreshold`、最终 direction。

建议在正式改动前先用日志采样确认真实设备上的 `absDx / absDy` 分布，再决定 dominance ratio、像素差值或 intent window 参数。