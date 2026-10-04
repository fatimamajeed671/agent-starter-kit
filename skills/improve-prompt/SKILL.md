---
name: improve-prompt
description: Review a prompt for missing target, goal, success check, constraints or output format, and ask targeted clarifying questions before acting. Use when the user runs /improve-prompt or asks to sanity-check, tighten or clarify a prompt. Skip for prompts that are already clear.
---

Review the prompt in the args (or the user's last prompt if none given). Be terse.

1. **Evaluate.** Check for: target (file/function/page), goal, success check, constraints, and for writing tasks length/format/audience. Anything already stated in this conversation counts as present.
2. **If clear:** say "Clear. Send it as is." and stop. No questions.
3. **If gaps:** do at most 3 targeted searches or reads to fill them from the codebase or files (never read whole files). Don't ask what the code can answer.
4. **Ask once:** one round of at most 3 questions (in Claude Code, a single `AskUserQuestion` call), each with 2-4 concrete options built from what you found; put your recommended default first. Only ask about gaps that change the work.
5. **Output the improved prompt:** one quoted block, ready to paste, max ~8 lines, built from the original plus the answers. Then stop. Do not start the task or write a plan; wait for the user to say go.

Never ask more than 3 questions, never ask twice.
