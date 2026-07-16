# Story Refinement Pipeline

Lala Studio provides one quality-controlled action for turning a rough idea or
an existing draft into save-ready story Markdown.

```text
draft (high) -> independent critic (x-high) -> final writer (ultra)
-> deterministic gate -> optional single repair (ultra)
```

The stages run as separate Codex invocations. The final writer receives the
critic's evidence, but the critic does not share the draft writer's context.
This reduces first-draft self-approval while keeping the workflow bounded.

## Use In The App

1. Open or create a story.
2. Describe the scene in the co-writer input.
3. Click **Refine to final**.
4. Read the amber critic report and its quality score.
5. Click **Use in editor** only when the quality gate accepts the final story.
6. Save the document.

The pipeline never overwrites the editor automatically. A rejected candidate
remains visible for diagnosis but has no apply button.

## Quality Gate

The final document must contain:

- one Markdown title;
- a `## 故事` section;
- a complete `## 对应词卡` section;
- natural dialogue without known report-like phrases;
- enough named character identity and a visible payoff for the duration;
- a deterministic score of at least 90.

The independent critic also compares the draft with the original request so a
supporting character cannot silently replace the requested protagonist or main
activity. This semantic check is recorded in `Requirement coverage` rather
than reduced to a misleading numeric score.

If the first final document fails, the pipeline runs one focused repair using
the exact gate findings. It never retries without a bound.

## CLI

Start a pipeline job through the Studio API:

```bash
node bin/lala-studio.js ai refine \
  "阿芽酱做寿司，其他朋友各自帮一个忙，故事温暖又好笑。" \
  --story-id STORY_ID \
  --duration 15
```

Inspect it with:

```bash
node bin/lala-studio.js job watch JOB_ID
```

## Visible Browser Tool

Create, refine, apply, and save entirely through the observable web UI:

```bash
node tools/lala-studio-browser.mjs story-pipeline \
  --title "阿芽酱的第一盘寿司" \
  --duration 15 \
  --message "阿芽酱是主厨，啦啦侠、飒飒君和庄子各帮一个具体的忙。只围绕一盘寿司，台词自然，笑点来自做寿司的动作，结尾温暖。"
```

The browser tool fails closed when the pipeline is rejected because no
accepted **Use in editor** control exists.
