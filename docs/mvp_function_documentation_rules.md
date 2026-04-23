# MVP Feature Documentation Rules

Last Updated: 2026-04-23

## Purpose

This document defines how feature documentation should be written and tiered during TOTM MVP development.
The goal is not to force heavy documentation for every change, but to reduce rework, reduce misunderstanding, and improve delivery stability.

## General Principles

1. Documentation exists to reduce rework, reduce ambiguity, and improve delivery stability.
2. By default, prioritize completeness of project baseline docs and main TODO ID-level docs first, then decide whether sub-features need standalone documents.
3. Only when a feature has both gameplay definition risk and technical implementation risk should it require both a design doc (GDD) and a tech spec.
4. If a one-page feature card can explain it, do not escalate to a heavy document.
5. If an acceptance checklist can explain it, do not open a separate spec document.

## Document Tiers

### L0 - No Standalone Document

Applies to minor fixes, small UI tweaks, small value adjustments, pure bug fixes, or mechanical implementations under existing frozen rules.

Requirements:
- Clarify what changes and what does not change in the thread.
- Clarify acceptance criteria in the thread.
- Keep it short, typically a few lines to a short paragraph.

### L1 - Feature Card

Applies to single sub-features with clear boundaries and low coupling.

Required sections:
- Goal
- Scope
- Interaction or Rules
- Dependencies
- Acceptance Criteria
- Risks

Suggested length: approximately 0.5 to 1 page.

### L2 - Tech Spec Document

Applies to main TODO-level features, cross-module features, or features that need a unified implementation standard.

Required sections:
- Background
- Module Boundaries
- State Flow
- Data Structures or Configuration
- Key Rules
- Edge Cases
- Debug Plan
- Test Points
- Performance Constraints

Suggested length: approximately 2 to 5 pages.

### L3 - Design Doc (GDD) + Tech Spec

Applies to core gameplay, core feel, cross-thread collaboration, or features with high uncertainty and high rework risk.

Design doc (GDD) should cover:
- Player Goals
- Gameplay Rules
- Feedback (Visual / Audio / Haptic)
- Values / Parameters
- Fail and Success Conditions
- Acceptance Criteria

Tech spec should cover:
- Architecture
- Timing and Execution Order
- State Machine
- Module Decomposition
- Data Format
- Edge Cases
- Test Matrix
- Risk Handling and Alternatives

Suggested length: approximately 5 to 12 pages. Use tables and rule matrices where necessary.

## Upgrade Conditions

A feature should be upgraded to a higher documentation tier when any of the following apply:

1. It affects core feel, for example sliding, input buffer, speed, or collision priority.
2. It affects core rule definitions, for example trigger order, death determination, or restart behavior.
3. It involves two or more modules, for example input, runtime, HUD, or level format.
4. It requires multi-thread or multi-worktree collaboration, and work is likely to diverge without clear boundaries.
5. Rules or values are not yet frozen and are likely to change repeatedly.
6. If done wrong, rework cost is high, or it will contaminate many downstream features.

## Downgrade Conditions

A feature can stay at a lighter documentation tier when any of the following apply:

1. It only modifies one module and introduces no new rules.
2. Rules are already frozen in a parent document, and this work is only implementation.
3. Rollback cost is low, and errors will not affect many downstream features.
4. Acceptance criteria can be clearly expressed in 5 to 8 checklist items.

## Thread Collaboration Rules

### Project Progress Management Thread

- Manages milestones, status sync, and the session ID ledger.
- Does not produce heavy documentation for every small feature.

### Task Management Thread

- Determines whether the feature is L1, L2, or L3.
- Maintains the single source-of-truth document for that feature.

### Subtask Thread

- Consumes existing documentation and executes.
- Does not proactively expand central documents by default.
- If a rule change is necessary, pushes the update back to the task document.

## Default Execution Strategy

1. Every main TODO ID defaults to at least L2.
2. Every sub-feature defaults to L1 first; do not automatically escalate to dual heavy documents.
3. Only core gameplay and core feel features default to L3.

## Quick Decision Rules

Use the following path for quick determination:

1. Is this a minor fix or mechanical implementation under frozen rules?
   If yes, use L0.
2. Is this a single sub-feature with clear boundaries and low coupling?
   If yes, use L1.
3. Does this require cross-module alignment or a unified implementation standard?
   If yes, use L2.
4. Does this define gameplay, feel, or high-risk collaboration boundaries?
   If yes, use L3.

## Writing Standards

In this project, the goal of formal documentation is to be detailed enough that another thread can implement or verify the feature with low ambiguity by reading the document alone, without needing to reconstruct intent from scattered chat logs.

If uncertain items exist, they must be explicitly labeled as:
- Verified
- Inferred
- To Be Confirmed

## L1 Feature Card Template

```markdown
## Feature Card: [Feature Name]

**Goal**: One sentence describing what this feature achieves

**Scope**:
- Includes: xxx
- Excludes: xxx

**Interaction / Rules**:
- Rule 1
- Rule 2

**Dependencies**:
- Depends on Module A's xxx interface
- Depends on Data Format B

**Acceptance Criteria**:
- [ ] Acceptance point 1
- [ ] Acceptance point 2

**Risks**:
- Risk 1 + mitigation
```

## L2/L3 Boundary Criteria

The core difference between L2 and L3 is whether a design doc (GDD) is needed. The following criteria help with the decision:

**Signals to upgrade L2 to L3**:
- If there are multiple possible mappings between the feature's player-experience goal and technical implementation, for example "feel should be snappy" could be achieved with different speed curves, buffer windows, or collision priorities, it needs L3.
- If the feature's gameplay definition is already frozen in a parent document but belongs to core feel or core gameplay, it should still be treated as L3. Rewrite the frozen definition as a standalone design doc plus tech spec, with source attribution such as "derived from frozen xxx content in the reverse engineering report".
- If the technical approach is basically decided and only implementation details need clarification, L2 is sufficient.

**Signals to stay at L2**:
- Gameplay definition is already frozen and does not belong to core feel or core gameplay.
- Technical implementation path is essentially unique, with no multiple viable alternatives.
- No need to independently verify player-experience goals.

## Document Freshness and Update Rules

### L3 Documents

- Once frozen, subsequent modifications must go through a change-request process: append a change log at the end of the document recording the reason, content, and impact of the change.
- Change log format: `| Date | Change Type | Change Content | Impact Scope | Approval Status |`
- Direct modifications without the change process are considered violations.

### L2 Documents

- Iteration during implementation is allowed, but each iteration must update the `Last Updated` date in the document header.
- If iteration causes structural changes to module boundaries, state flow, or data structures, a brief change record should be appended at the end of the document.

### L1 Feature Cards

- If rules change, directly modify the feature card content; no need to preserve historical versions.
- Update the date after modification.

### L0

- No document files; thread records are sufficient.
- No freshness requirements.

## Document Acceptance Standards

Different tiers have different qualification standards:

### L1 Qualification Standard

- Another developer, after reading it, can list 5 to 8 acceptance checklist items that are 80% consistent with the original author's list.

### L2 Qualification Standard

- Another developer, after reading it, can draw the module interaction diagram and state flow with 90% consistency with the original author's understanding.

### L3 Qualification Standard

- Another developer, after reading it, can independently implement a prototype with similar feel, and the player-experience goals are met.
- Design doc portion: another designer, after reading it, can accurately restate gameplay rules, fail/success conditions, and value baselines.
- Tech spec portion: another developer, after reading it, can accurately restate architecture, timing, state machine, and data format.

## Document Storage Rules

### L3 Documents

- Directory: `docs/design/`
- Filename format: `<feature_name>_design.md` (design doc and tech spec merged into one file, separated by chapters)
- If both the design doc and tech spec are lengthy, they may be split into `<feature_name>_gdd.md` (design doc) and `<feature_name>_tech.md` (tech spec), but they must cross-reference each other.

### L2 Documents

- Directory: `docs/tech/`
- Filename format: `<feature_name>_tech.md`

### L1 Feature Cards

- Directory: `docs/features/`
- Filename format: `<feature_name>_card.md`
- May also be placed in the corresponding task worktree root directory, depending on project scale.

### L0

- No document files; thread records are sufficient.

## Suggested Mapping for Current Project

### Default L3

- PM-02 technical design document (core runtime, grid format, state flow, input, collision, level format, HUD, debug, deployment)
- ENG-04 core movement feel (four-directional sliding, input buffer, collision handling, speed and pressure curves)

### Default L2

- Level format and level loader
- HUD state flow
- Debug panel
- Restart and completion flow

### Usually L1, upgrade to L2 or L3 when necessary

- Individual mechanism or trap integration
- If rules are already frozen in the master rule table, use L1.
- If rules are not yet frozen, upgrade to L2.
- If it changes gameplay definition or feel, upgrade to L3.

### Default L1

- LVL-01 Story 1 integration
- LVL-02 Story 2 integration
- LVL-03 Story 3 integration

### Default L0 or L1

- Button style adjustments
- Copy updates
- Pure presentation-layer adjustments
- Known bug fixes under frozen rules

## Actual Goal

The goal is not to maximize the number of documents.
The goal is to use the minimum necessary documentation tier to ensure execution stability, unified standards, and a reviewable process.
