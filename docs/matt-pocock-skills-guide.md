# Matt Pocock Skills: How to Use Them in Cursor

Source: [github.com/mattpocock/skills](https://github.com/mattpocock/skills)

## Install status

All 38 skills are installed globally in `C:\Users\Admin\.agents\skills`, so they work in every project.

They were installed with:

```powershell
npx skills@latest add mattpocock/skills -a cursor -s '*' -g -y
```

## One-time setup per repo

1. Restart Cursor (or open a new chat) so the skills load.
2. In a chat inside the repo, run:

   ```
   /setup-matt-pocock-skills
   ```

3. Answer its three questions:
   - Which issue tracker you use (GitHub, GitLab, local files, or something else)
   - Which labels you use when triaging tickets
   - Where to save the docs it creates

The planning and review skills rely on this setup, so do it before using them.

## When to use skills (and when not to)

Use them at the start of a change and when you get stuck. Small edits like "change this padding" don't need a skill. They pay off when the work is big, unclear, or keeps going wrong.

There are two kinds:

- **Ones you type yourself**, like `/grill-me`. These run a whole process.
- **Ones Cursor uses on its own** when the task fits, like `tdd` and `diagnosing-bugs`. You can also call them by name to force them.

If you can't decide which one fits, type `/ask-matt`, describe your situation, and it will point you to the right one.

## Which skill for which moment

### Before building something non-trivial

| Skill | Use it when |
| --- | --- |
| `/grill-me` | You have a plan or idea and want Cursor to question you until nothing is vague. The most useful habit to build. |
| `/grill-with-docs` | Same as `/grill-me`, but it also keeps a project glossary (`GLOSSARY.md`) and records design decisions. Good when the same concepts keep coming up. |
| `/prototype` | You're unsure which design or approach to pick. It builds quick throwaway versions to compare. |

Example: before building the admin redesign, run `/grill-me` on `docs/admin-uxfolio-redesign-plan.md` to catch gaps early.

### When the plan is big

| Skill | Use it when |
| --- | --- |
| `/to-spec` | You want to turn the current conversation into a written spec. |
| `/to-tickets` | You want a plan broken into small, ordered tasks. |
| `/implement` | You want Cursor to build from a spec or tickets step by step, then review the result. |
| `/wayfinder` | The work is too big for a single chat session. |

### When something is broken

| Skill | Use it when |
| --- | --- |
| `/diagnosing-bugs` | A bug is hard to pin down. It finds the cause step by step instead of guessing (for example, images suddenly failing to load site-wide). |

### While writing code

| Skill | Use it when |
| --- | --- |
| `/tdd` | You want a failing test written first, then the code that makes it pass. Only worth it if the project has a test setup. |

### After a chunk of work

| Skill | Use it when |
| --- | --- |
| `/code-review` | Before committing. Checks your changes against your coding standards and the original plan. |
| `/pr` | You need a clear pull request description. |
| `/improve-codebase-architecture` | Every few days, to find messy parts of the codebase worth cleaning up. |

### Handy any time

| Skill | Use it when |
| --- | --- |
| `/handoff` | A chat is getting long. It summarizes everything so a fresh chat can continue. |
| `/wait-what` | You didn't understand Cursor's last answer and want it explained again in plain words. |

## A simple routine to start with

1. **Before a feature:** `/grill-me`
2. **While building:** let Cursor use `tdd` and `diagnosing-bugs` on its own
3. **Before committing:** `/code-review`
4. **When a chat gets too long:** `/handoff`

## Maintenance

The skills are plain copies and don't update themselves.

```powershell
# Update all globally installed skills
npx skills@latest update -g

# Pick up new skills Matt adds later
npx skills@latest add mattpocock/skills -a cursor -g

# See what's installed
npx skills@latest ls -g

# Remove a skill you don't want
npx skills@latest remove -g <skill-name>
```

## Notes

- The full install also added extra skills that aren't in the README, such as `chief-of-staff`, `writing-beats`, `setup-pre-commit` and `git-guardrails-claude-code`. That last one is meant for Claude Code, so it's probably not useful in Cursor. Remove any you don't want.
- Skills run with full agent permissions. The installer's security scan found no alerts, but rated `improve-codebase-architecture` and `triage` as "medium risk". Skim those two before using them.
