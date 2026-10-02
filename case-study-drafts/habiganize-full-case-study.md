# Habiganize — Full Case Study Draft (PD / UX / PO)

> **Purpose of this document:** A complete source draft for Product Designer, UX Designer, and Product Owner portfolio narratives. It is intentionally long and detailed so another AI (or you) can compress, rewrite voice, add visuals, and fill gaps.  
> **Status:** Based on the shipped codebase, research docs, and live product. Items marked `[FILL]` or `[VERIFY]` need your input or confirmation.  
> **Live product:** [https://habitganizer.tech](https://habitganizer.tech)  
> **API:** [https://habiganize-api.onrender.com](https://habiganize-api.onrender.com)  
> **Portfolio slug (current short version):** `/work/habiganize`  
> **Do not treat the current short portfolio page as the final case study** — this draft is the fuller version.

---



## 0. How to use this with another AI

Paste this whole file and ask for one of:

1. **Portfolio web case study** — 8–12 sections, scannable, visual-led, hiring-manager friendly
2. **Interview deep-dive** — STAR stories + decision tradeoffs
3. **Product Owner case study** — problem → goals → roadmap → metrics → risks
4. **UX process case study** — research → insights → flows → UI → validation

Ask the AI to keep claims honest: where metrics/user research are missing, keep them as goals/hypotheses, not results.

---



## 1. Project snapshot (elevator)


| Field            | Content                                                                                                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product name** | **Habiganize** (primary public brand). Also appears as HabitPup (mobile/store/bundle), Habitganizer (domain), HabitFlow (legacy research/extension branding). `[FILL: pick one canonical name for hiring managers]`  |
| **One-liner**    | A cross-platform habit tracker that turns daily check-ins into a pet-care economy — habits earn coins; coins adopt and care for virtual companions — so consistency feels emotionally rewarding instead of punitive. |
| **Role**         | Solo Product Designer & Full-Stack Developer (end-to-end: research synthesis → Figma → system design → build → deploy). `[FILL: refine title for target role]`                                                       |
| **Timeline**     | Jan 2026 — Present (ongoing) `[VERIFY exact start]`                                                                                                                                                                  |
| **Platforms**    | Web (React/Vite), iOS/Android (Expo), Chrome MV3 extension, Express API + Postgres                                                                                                                                   |
| **Live demo**    | [https://habitganizer.tech](https://habitganizer.tech)                                                                                                                                                               |
| **Team**         | Solo                                                                                                                                                                                                                 |
| **Stage**        | Working product / pre–App Store & Play Store public release                                                                                                                                                          |


---



## 2. My role & ownership (PD / UX / PO lens)



### Product Designer

- Defined product vision: retention via attachment (pets) rather than guilt (streaks alone)
- Designed core loop: **habit completion → currency → shop → pet care → re-engagement**
- Built neo-brutalist visual system in Figma and implemented it in production UI
- Designed onboarding, Today, habits, pets/shop, friends/ranks, premium, health surfaces
- Themed auth (Clerk) to match product language so signup doesn’t feel bolted on



### UX Designer

- Synthesized retention research (Atomic Habits, BJ Fogg, Duolingo/Habitica patterns)
- Mapped primary journeys: first-run, daily check-in, pet care, social accountability
- Designed interaction patterns for one-tap completion, mood capture, care cooldowns
- Considered friction points: auth wall vs anonymous-first (research recommended anon; product shipped Clerk-gated — document tradeoff)
- Cross-platform UX: same account + similar IA across web/mobile; extension = minimal “quick tick”



### Product Owner

- Prioritized MVP scope: habits + economy + pets first; social/health/premium as expansion
- Owned monetization model: free tier limits, Pro/Premium/Ultimate, coin packs, donations, ads
- Managed platform strategy: one API, multiple clients; freemium hosting with cold-start tradeoff
- Backlog tension: research recommended streak freezes & anonymous-first — not yet shipped
- Store readiness: EAS/mobile packaging in progress; public store listing not live

`[FILL: % time design vs build; any collaborators; any stakeholder feedback]`

---



## 3. Context & business / product opportunity



### Market problem

Habit / Health & Fitness apps face a brutal retention cliff. Industry research compiled for this project notes approximate benchmarks:

- D1 retention ~20–27%
- D7 ~7%
- D30 ~3% (elite apps ~12%)

Users download with intention, check boxes for a few days, then abandon. The reward loop is often too abstract: a checked box or a fragile streak doesn’t create lasting attachment. Breaking a streak frequently causes total drop-off.

### Opportunity

Design a habit product where **quitting has a visible, emotional cost** — not shame, but care. Virtual companions that need food/water/attention create:

1. **Loss aversion** (I don’t want my pet to decline)
2. **Collection drive** (I want more pets / complete the set)
3. **Daily reason to return** (care timers + check-ins)



### Positioning

- Tagline: “Build habits that stick”
- Differentiator: pet economy + neo-brutalist brand vs generic minimalist trackers
- Surfaces: desk (web/extension) + phone (mobile), one account

`[FILL: competitive set you personally compared — Habitica, Streaks, Loop, Duolingo, Finch, etc.]`

---



## 4. Goals & success criteria



### Product goals

1. Make daily habit completion feel rewarding within seconds (immediate feedback + rewards)
2. Create a retention loop stronger than streak guilt alone
3. Ship a coherent multi-platform experience from one design system
4. Support light social accountability (friends + leaderboards)
5. Enable sustainable monetization without destroying the free experience



### UX goals

- One-tap “done” for today’s habits
- Clear mental model: habits fund pets
- High-contrast, chunky UI that’s recognizable and tappable
- Auth and onboarding that still feel on-brand



### Success metrics (intended — mostly not instrumented yet)


| Metric                | Target / note             | Status                                            |
| --------------------- | ------------------------- | ------------------------------------------------- |
| D30 retention         | Research target 8–12%     | `[FILL / UNKNOWN — not instrumented]`             |
| Day-1 completion rate | High % finish first habit | `[UNKNOWN]`                                       |
| Pets adopted / user   | Engagement proxy          | `[UNKNOWN]`                                       |
| Weekly return rate    | Care loop health          | `[UNKNOWN]`                                       |
| Premium conversion    | Funnel                    | `[UNKNOWN]`                                       |
| Feedback volume       | Qualitative signal        | In-app feedback exists (logged; not stored in DB) |


**Honesty note for portfolio:** Do not invent metrics. Frame shipped work as design + product execution; list measurement as next step.

---



## 5. Research & discovery



### What was done

- Desk research / architecture research report: `research/habit-app-architecture.md` (May 2026; earlier product name HabitFlow)
- Competitive / pattern review: Habitica-style gamification, Duolingo streak psychology, Atomic Habits / BJ Fogg (`B = M·A·P`)
- Synthesis of retention levers: anonymous-first onboarding, streak freezes, social accountability, notifications, soft “habit strength”



### Key insights that shaped the product

1. **Motivation fades; systems stick** — reduce friction to logging (one-tap Today list)
2. **Immediate feedback matters** — coins/food/water on completion = instant payoff
3. **Loss aversion > abstract gains** — a declining pet is more salient than a missed checkbox
4. **Collection creates soft re-engagement** — unowned pets / visitors pull users back
5. **Streaks alone are brittle** — research ranked streak freezes highly; product still uses chain streaks without freezes (conscious backlog / tradeoff)



### What was NOT done (be transparent)

- No formal user interviews / usability test reports found in repo
- No named personas document
- No analytics dashboard / retention cohort data in product

`[FILL: any interviews, friends/family tests, Figma critique sessions, class feedback]`

### Implied user (working persona — label as assumed)

**“Restart Riley”** — 20s–30s, has tried 2–3 habit apps, abandons after a week, responds better to playful care than productivity guilt, uses phone + laptop, may want light social comparison with friends.

---



## 6. Problem statement

**For people who want better routines but abandon trackers quickly,**  
Habiganize is a habit companion that converts check-ins into caring for virtual pets,  
**unlike checkbox or streak-only apps,**  
because emotional attachment and daily care needs create a reason to return that outlasts willpower.

---



## 7. Design principles (decision filters)

1. **Attachment over anxiety** — motivate with care, not punishment
2. **Immediate payoff** — every completion yields visible rewards
3. **One job per screen** — Today = check off; Pups = care; Shop = spend
4. **Brand as memory** — neo-brutalist look so the product is recognizable
5. **One account, many doors** — web / mobile / extension share identity and data
6. **Ship the loop first** — economy must work before polishing secondary features

---



## 8. Information architecture



### Web primary nav

Today · Habits · Stats · History · Health · Pups · Friends · Ranks · Premium (+ Settings/profile)

### Mobile tabs

Today · Habits · Stats · Health · Pups  
(History / Friends / Leaderboard reachable via Settings — **parity gap**)

### Extension

Configure API → quick habit check-off only (no pets/social)

### Mental model

```
Habits (behavior)
   ↓ completion
Wallet (coins, food, water)
   ↓ spend / consume
Pets (care, level, collection)
   ↓ social proof
Friends / Leaderboards
```

---



## 9. Core product loop (system design)



### Loop diagram (describe in portfolio as a figure)

1. User opens **Today**
2. Completes habit (optional mood + note)
3. Earns **10 coins + 1 food + 1 water**
4. Visits **Pups / Shop**
5. Buys pet (50–320 coins) or food/toys
6. Cares for pet (feed/water/walk/bath/play/train)
7. Pet state decays over time → reason to return tomorrow
8. Optional: playdate visitor, friends, leaderboard, ads for coins



### Economy rules (important specificity for PO/PD interviews)

**Rewards**

- Habit completion: +10 coins, +1 food, +1 water

**Pets**

- ~24 catalog companions (dogs, cats, otter, beaver, etc.)
- Prices roughly 50–320 coins
- Hunger/thirst decay ~10 points/day
- Level range 1–10; starvation / well-fed level rules (~24h thresholds)
- Train: 5 coins, 30 min cooldown; 5 tricks → level

**Care activities**

- Walk: 4h decay reset, 1h cooldown
- Bath: 2-day reset, 12h cooldown
- Play: 3h reset, 30 min cooldown

**Shop foods (examples)**

- Kibble: 8 coins / ~25 hunger
- Treat: 20 / ~50
- Premium: 45 / ~90 + level bump

**Playdate visitor**

- ~6h cooldown; +15 coins on play; rewarded ad can shorten wait

**Ads**

- Rewarded +10 coins (~3h cooldown); web GAM / mobile AdMob



### Why this design

- Separates **earning** (habits) from **spending** (pets) so habits stay the engine
- Decay creates urgency without needing toxic streak panic
- Collection + visitor system creates soft FOMO without pay-to-win pressure on the core loop

`[FILL: Figma frames for economy board / state diagram]`

---



## 10. Key user journeys



### Journey A — First-time user

1. Landing / welcome (“Build habits that stick”)
2. Get Started → Clerk sign-up / login
3. Optional product tour (Today / Habits / Stats / Pups)
4. Optional profile (preferred name, birthday, phone, bio)
5. Land on Today / Habits → create first habit → complete → see rewards
6. Discover Pups shop with first coins

**UX critique / known tension:** Research recommended anonymous-first to reduce signup drop-off (45–86% friction cited). Product requires Clerk auth for sync across devices. Tradeoff: higher first-run friction for stronger multi-device identity.

### Journey B — Daily return

1. Open Today (web or mobile; or extension quick tick)
2. Complete due habits
3. Optional mood logging
4. Spend a minute on pet care
5. Leave with “pets okay until tomorrow”



### Journey C — Pet care deep session

1. Open Pups collection
2. Feed/water low meters
3. Walk/bath/play/train based on cooldowns
4. Dress-up / nickname
5. Interact with visitor pet if available



### Journey D — Social accountability

1. Share friend code
2. Accept requests
3. Compare on leaderboard (coins or completions; friends or global)



### Journey E — Monetization

1. Hit free limits (habits/pets) or want ad-free / exclusives
2. View Free / Pro / Premium / Ultimate
3. Or buy coin packs / donate
4. Stripe / Clerk Billing paths

`[FILL: add screenshots per step]`

---



## 11. Visual design system (Figma → code)



### Direction

Neo-brutalism: thick borders, hard offset shadows, chunky radius, bold type, warm playful palette — stands out in a sea of gray/purple productivity apps.

### Web tokens (production)

- Background cream ≈ `#faf6f0`
- Ink / borders cocoa ≈ `#3a2f26`
- Primary strawberry ≈ `#e85d8f`
- Accent golden ≈ `hsl(48 92% 56%)`
- Destructive terracotta
- Type: **Lexend** (production); earlier notes also mention Outfit — `[VERIFY canonical font in Figma vs code]`
- Radius ~1.5rem
- Utilities: `shadow-brutal`, `border-brutal`, `.brutal-card` hover lift
- Clerk theme: neobrutalism base + custom variables matching product



### Mobile tokens (related, not identical — call this out)

- Cream `#f8f0dc`, ink `#141414`
- Primary **blue** `#4258d6` (parity gap vs web pink primary)
- Pink/yellow accents; Inter Bold on tabs; radius ~18



### Design artifacts to attach

- `[FILL: Figma file URL]`
- Cover / welcome screen
- Today checklist
- Pet care screen
- Shop
- Design tokens page
- Before/after or exploration if any
- Pet avatar guideline art (exists in product assets)



### Design → engineering handoff

- Tokens → CSS variables / Tailwind
- Screens → React + React Native
- OpenAPI contract so UI and API stay aligned while iterating

---



## 12. Interaction design details worth showing

- One-tap complete + undo
- Mood chips on completion (`great|good|okay|meh|bad`) + short note
- Brutal cards with press/hover affordance
- Cooldown-aware care actions (disabled / waiting states)
- Empty / free-day / all-done Today states
- Not-enough-coins → CTA back to habits (closes economy loop in UX copy)
- Cold-start wake screen with “fun facts” while Render API boots (honest infrastructure UX)
- Soft feedback prompt + Settings feedback

---



## 13. Feature inventory (complete enough for PO interviews)



### Habits

- Create/edit/archive; color; icon; target weekdays or daily
- Completions by local calendar date (timezone-aware)
- Streaks (chain model)
- Reminders (HH:MM)
- History / stats



### Pets & economy

- Wallet (coins, food, water)
- Catalog pets + ownership
- Care meters, levels, train, toys, dress-up, nicknames
- Shop (pets, foods, toys)
- Playdate visitor + ad speedups



### Social

- Friend codes, requests, friendships
- Leaderboards: coins or completions; friends or global



### Health

- Steps, calories, sleep, stand-ups, heart rate
- Goals + manual logging
- Android Health Connect sync (WIP)



### Monetization

- Free: limited habits/pets (seed: 5 habits / 3 pets)
- Pro ~$4.99: higher limits, ad-free
- Premium ~$9.99: unlimited + exclusives + analytics stub + priority
- Ultimate ~$14.99: early pups
- Coin packs ~$0.99–$19.99
- Donations (Stripe)
- Subscriptions (Clerk Billing webhooks)



### Platform extras

- EN / VI i18n (web)
- Chrome extension quick check-off
- Grocery list on Today (wallet-scoped)
- Achievements tables exist

---



## 14. Cross-platform strategy & parity gaps (PO gold)


| Surface   | Role             | Gaps / notes                                                           |
| --------- | ---------------- | ---------------------------------------------------------------------- |
| Web       | Full product     | Primary feature-complete client                                        |
| Mobile    | Daily companion  | Friends/ranks not on tab bar; visual tokens differ; Health Connect WIP |
| Extension | Desk micro-habit | HabitFlow branding leftover; check-off only                            |
| API       | Source of truth  | Shared OpenAPI; wallet isolation via Clerk user                        |


**Product decision:** Prefer one backend + generated clients over three separate products. Accept temporary UI parity debt.

---



## 15. Technical architecture (keep light for design roles; enough for PO)

- pnpm monorepo: web, mobile, API, shared DB + OpenAPI libs
- Auth: Clerk across surfaces; API scopes by user/wallet
- DB: Neon Postgres (habits, wallet, pets, social, health, billing)
- Deploy: Netlify/static web → proxy `/api` to Render; free tier cold starts
- Billing: Stripe one-time + Clerk subscriptions
- Ads: web rewarded GAM; mobile AdMob

**Why it matters in a design case study:** Architecture choices constrained UX (auth required, cold-start wake UI, extension minimalism).

---



## 16. Decisions & tradeoffs (interview-ready)


| Decision                  | Alternative                | Why chosen                           | Cost                                 |
| ------------------------- | -------------------------- | ------------------------------------ | ------------------------------------ |
| Pet economy as retention  | Streak-only / points       | Emotional attachment                 | Complexity of care rules             |
| Clerk-required auth       | Anonymous-first (research) | Cross-device sync, billing, identity | Higher signup friction               |
| Chain streaks, no freezes | Duolingo-style freezes     | Faster MVP                           | Missed research #1 retention lever   |
| Neo-brutalist brand       | Minimal soft UI            | Differentiation + tap targets        | Harder to look “enterprise”          |
| In-house friends          | Third-party social         | Ownership, no vendor fee             | Moderation / abuse later             |
| Free Render hosting       | Always-on paid host        | $0 for demo stage                    | Cold starts                          |
| Full web first            | Mobile-only                | Faster design iteration in browser   | Mobile parity lag                    |
| Ads + Premium + donations | Single monetization        | Multiple support paths               | Mixed “non-profit” messaging tension |


---



## 17. Validation & feedback



### What exists

- In-app feedback (rating + message) from Settings / soft prompt
- Server logs feedback events (not a research database)
- Store rating prompt path on mobile



### What to add for a stronger case study

- 5 moderated usability tests on Today + Pets flows
- Preference test: streak guilt vs pet care framing
- Metrics: D1/D7 completion, pets adopted, return next day after adopting first pet
- Diary study: 7-day care loop with 5 users

`[FILL: any informal testing anecdotes]`

---



## 18. Outcomes / impact (honest framing)



### Shipped outcomes (safe to claim)

- End-to-end product designed and built solo: research synthesis → Figma system → production web + mobile + API + extension
- Live web product at habitganizer.tech with shared auth and pet economy
- Coherent neo-brutalist design language applied through auth
- Multi-surface architecture enabling continued iteration
- EN/VI localization on web
- Social + health + monetization scaffolding beyond MVP loop



### Not yet outcomes

- Public App Store / Play Store listing
- Proven retention lift vs baseline habit apps
- Instrumented analytics proving D30 target
- Formal usability study results



### Learning

Retention design is a systems problem. Visual polish without a behavioral loop won’t fix abandonment; a behavioral loop without measurement can’t prove itself. Next iteration should close the loop on **streak forgiveness** and **anonymous trial**, then measure.

---



## 19. Reflection (design maturity signal)



### What worked

- Clear north-star loop (habits fund pets)
- Strong brand memory
- Shipping across surfaces forced prioritization



### What I’d do differently

1. Anonymous trial → soft account upgrade (align with research)
2. Instrument retention before expanding premium tiers
3. Unify web/mobile design tokens earlier
4. Usability-test pet decay anxiety (too much pressure?)
5. Implement streak freezes before more shop content
6. Resolve brand naming (Habiganize vs HabitPup vs HabitFlow) for trust



### Career narrative hooks

- **PD:** systems thinking + visual craft + shipping
- **UX:** behavioral design, friction tradeoffs, cross-platform IA
- **PO:** scope control, monetization model, platform strategy, backlog vs research debt

---



## 20. Suggested portfolio structure (for the other AI to produce)

Recommended final case study outline (~not too short, not a novel):

1. Hero — title, role, timeline, platforms, live link
2. Overview — 3 bullets of impact
3. Problem — retention cliff + opportunity
4. Role & process
5. Research insights (with sources/benchmarks)
6. Product principles
7. Core loop diagram + economy
8. Key flows (3 journeys with screens)
9. Visual system (Figma → UI)
10. Decisions / tradeoffs
11. Cross-platform strategy
12. Outcomes + next steps
13. Reflection

Visual plan: 1 cover, 1 IA or loop diagram, 4–6 product screens, 1 tokens/board, 1 pet art.

---



## 21. Asset checklist `[FILL]`

- [ ] Figma file link (public or prototype)
- [ ] Welcome / auth screens
- [ ] Today before/after completion
- [ ] Pets care UI
- [ ] Shop
- [ ] Friends / leaderboard
- [ ] Mobile screenshots
- [ ] Extension popup
- [ ] Tokens / components board
- [ ] Economy / loop diagram (FigJam or Figma)
- [ ] Optional: research one-pager screenshot

Existing local portfolio assets:

- `/case-studies/habiganize/web-cover.png`
- `/case-studies/habiganize/pet-system.png`
- `/case-studies/habiganize/shiba.png` (+ corgi, golden)

---



## 22. Open questions for you / the other AI to resolve

1. Canonical brand name for the case study title?
2. Exact personal process in Figma (wireframes → hi-fi? component library?)
3. Any real users beyond yourself?
4. Class / bootcamp / personal project context?
5. Want tone more “UX research rigor” or more “product builder who ships”?
6. Include monetization detail or keep focus on retention UX?
7. Mention full-stack build heavily (for PD roles maybe shorten; for PO keep)?

---



## 23. Source map (for fact-checking)

- Live web: habitganizer.tech  
- Research: `H:\habiganize-source\research\habit-app-architecture.md`  
- Store notes: `STORE_SUBMISSION.md`  
- Extension: `extension/README.md`  
- Design tokens: web `index.css`, mobile `constants/colors.ts`, `clerk-appearance.ts`  
- Product framing: Instructions / replit docs / i18n copy  
- Current short portfolio entry: Lennaipdate `src/data/projects.json` → slug `habiganize`

---



## 24. One-paragraph thesis (reuse anywhere)

Habiganize is an end-to-end product design and build project that rethinks habit retention through a virtual pet economy. Grounded in retention research (habit automaticity, loss aversion, collection motivation), I designed a neo-brutalist system in Figma and shipped it across web, mobile, and a browser extension on a shared API. The core UX converts daily check-ins into coins and care actions, making consistency feel like nurturing rather than self-surveillance. The product is live on the web; store release, instrumentation, and research-backed features like streak freezes remain the next iteration.

---

*End of draft. Hand this file to another AI with your Figma link, screenshots, and answers to Section 22.*