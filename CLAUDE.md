# EMR-Jotform-Wrapper

Web app that wraps JotForm to support dynamic image-picker questions for the Event-Based Memory Test (Round II), administered across 5 districts in Hong Kong.

## Project Purpose

JotForm lacks native support for per-class dynamic image sets. This wrapper intercepts the interview workflow, looks up the correct image set for each class, and submits responses back to JotForm via API.

## District Coverage

| District | Session sets |
|---|---|
| Kowloon City | 6 |
| Sham Shui Po | 6 |
| Shatin | 6 |
| Tuen Mun | **8** |
| Yuen Long | 6 |

## ID Formats

| Field | Format | Example |
|---|---|---|
| Student ID | `St1xxxx` | `St10001`, `St12345` |
| School ID | `Sxxx` (zero-padded) | `S001`, `S120` |
| Class ID | `C-xxx-yy` (xxx = 3-digit school number, yy = class index) | `C-001-01`, `C-120-03` |
| Session ID | `{district_prefix}-{nn}` (zero-padded, no S) | `KC-01`, `TM-08` |

District prefixes: `KC`, `SSP`, `ST`, `TM`, `YL`

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React 18 + Tailwind CSS v3 |
| Deployment | GitHub Pages (static) |
| Primary storage | JotForm REST API |
| Backup storage | Supabase (JSON blob now → structured columns later) |
| Font | Noto Sans TC (Google Fonts) |

Next.js was considered but rejected — GitHub Pages only serves static files.

## Environment Variables

Prefix all with `VITE_` for Vite. Set as GitHub Secrets for CI/CD. See `.env.example`.

| Variable | Description |
|---|---|
| `VITE_JOTFORM_BASE_URL` | `https://api.jotform.com` |
| `VITE_JOTFORM_FORM_ID` | Numeric form ID |
| `VITE_JOTFORM_API_KEY` | JotForm API key |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

## Colour Scheme (strict)

| Token | Hex | Usage |
|---|---|---|
| `navy` | `#2b3990` | Headers, section titles, primary buttons |
| `orange` | `#f99d33` | CTAs, active states, selected images |
| `pink` | `#f04e69` | Negative emoji, errors |
| `green` | `#8dbe50` | Positive emoji, success |
| `yellow` | `#f4d036` | Neutral emoji, accent |

## JotForm Form

- **Form ID:** `260617738275465`
- **Owner:** `keystepseduhk`
- **Title:** Clone of Kowloon City Hub – Event-based Memory Test Recording Form (Round I)
- **Status:** ENABLED (to be replaced with Round II form)
- **Full schema:** `docs/jotform-schema.json`
- **API reference:** `docs/jotform-api.md`
- **Note:** qid mappings in `src/constants/questions.js` are marked `TODO` — update once the new Round II JotForm is published

## Data Model

```
StudentID → config/students_raw.csv ["Class ID 25/26"] → ClassID
ClassID   → config/classes.csv → SessionID + Q1a…Q8h image filenames
```

- Each class has up to **8 image question sets** (Q1–Q8)
- Each question set has **2 batches** of 4 images = 8 slots total:
  - **Batch 1 — Scene** (`a`–`d`): places/scenes; correct = `a`, distractors = `b`–`d`
  - **Batch 2 — Staff** (`e`–`h`): staff members; correct = `e`, distractors = `f`–`h`
- Each batch is shown as a separate 2×2 image grid in the app
- Display order is **shuffled client-side**; correct answer identity is kept in memory only
- Non-Tuen Mun districts use Q1–Q6 only (6 question sets); Q7 and Q8 columns are left blank

## Config Files

### `config/students_raw.csv`
Source of truth for student–class mapping. 5,549 rows, 59 columns (cleaned: `_EY`, `_External`, `23/24`, `24/25` columns removed).

Key columns used by the app:
- `Student ID` — lookup key
- `Class ID 25/26` — current-year class assignment
- `Full Name`, `School ID`, `School Name`, `District Cleaned` — auto-fill in form

### `config/classes.csv`
One row per class. 66 columns total:
`ClassID`, `SessionID`, `Q1a`…`Q1h`, `Q2a`…`Q2h`, … `Q8a`…`Q8h`

`SchoolID` and `District` are intentionally omitted — they come from `students_raw.csv` and are already in memory before `classes.csv` is consulted.

Each `Q{n}` group is one **question set** containing two **batches**:
- `a`–`d` = scene batch (class-specific, correct = `a`)
- `e`–`h` = staff batch (same people across classes per session, correct = `e`)

Image filenames: `{SessionID}_Q{n}{choice}.jpg` e.g. `KC-01_Q1a.jpg`

## Image Assets

All images in a **single flat folder**: `assets/images/`

### Naming convention
```
{SessionID}_Q{n}{choice}.jpg
e.g. KC-01_Q1a.jpg  ← correct scene image for question set 1, session KC-01
     KC-01_Q1e.jpg  ← correct staff image for question set 1, session KC-01
     TM-08_Q8h.jpg  ← distractor staff image for question set 8, session TM-08
```

### Total expected image files
- 4 non-TM districts × 6 sessions × 6 question sets × 8 images = 1,152
- Tuen Mun × 8 sessions × 8 question sets × 8 images = 512
- **Total: 1,664 files**

### Dynamic loading flow
1. Interviewer enters Student ID
2. App looks up `students_raw.csv` → `Class ID 25/26` → `ClassID`
3. App looks up `classes.csv` by `ClassID` → `SessionID` + all image filenames
4. App renders image-picker UI, loads images from `assets/images/`
5. b/c/d and f/g/h display order shuffled client-side
6. On submit → POST to JotForm API + POST to Supabase (backup)

## App Structure

```
src/
  App.jsx                    ← Two-phase form: admin page (section 1) → scroll survey (sections 2–4)
  components/
    StudentLookup.jsx         ← Two-phase: lookup → info card → confirm; passes schoolClasses
    AdminFields.jsx           ← Interviewer, date, phase; class dropdown filtered by school; touched validation
    EmojiRating.jsx           ← 5-point emoji scale (😭→😃), mobile-optimised touch targets
    FollowUpCheckbox.jsx      ← Follow-up prompt checkboxes
    ObservationBox.jsx        ← Free-text observation textarea
    ImagePicker.jsx           ← 2×2 shuffled image grid; placeholder tiles when images missing
    ImageBlock.jsx            ← One question set: scene batch picker + staff batch picker + follow-up
    ProgressBar.jsx           ← Scroll-driven progress; line through circle centres
  hooks/
    useStudentLookup.js       ← Fetch + parse students_raw.csv; lookup + getSchoolClasses()
    useClassConfig.js         ← Fetch + parse classes.csv; returns { classId, sessionId, blocks }
  lib/
    csvParser.js              ← Lightweight CSV parser (handles quoted fields)
    jotform.js                ← POST to JotForm API
    supabase.js               ← Supabase backup (JSON blob)
  constants/
    questions.js              ← Question text (Cantonese), qid mappings (TODO: update)
                                 SECTION_LABELS = ['基本資料', '感受', '記憶', '圖片', '完成']
```

## Survey Flow

The form has two distinct phases after student lookup:

### Phase 1 — Admin page (section = 1)
- Shown immediately after student confirmed; no other sections are visible
- `AdminFields` receives `touched` prop — when true, empty required fields show a pink ring
- `繼續填寫` button is always clickable:
  - If `interviewerName`, `interviewDate`, or `phase` are empty → sets `adminTouched=true`, shows inline error, does NOT proceed
  - If all required fields are filled → triggers `handleContinue()`

### `handleContinue()` sequence
1. Sets `surveyReady = 'loading'` → shows a loading card with spinning ⏳ and active class ID
2. Re-fetches `classes.csv` config for the active class (handles any dropdown override)
3. Waits a minimum 1 second (intentional UX pause)
4. Sets `surveyReady = true`, `section = 2`
5. Smooth-scrolls to top

### Phase 2 — Scroll survey (sections 2–4)
- Only revealed when `surveyReady === true`
- Scroll listener activates and drives `section` state (2 → 3 → 4) based on element visibility
- `SECTION_IDS = ['section-2', 'section-3', 'section-4']`; scroll handler starts `active = 2`

### Section numbering
| section | Content |
|---|---|
| 0 | Student lookup |
| 1 | Admin fields (isolated page) |
| 2 | Part 1 — Feelings (Q1–Q6) |
| 3 | Part 2 — Memory (Q7–Q8) |
| 4 | Part 3 — Image question sets + closing |
| 5 (DONE) | Success card |

Progress bar maps `progressCurrent = section - 1` onto `SECTION_LABELS` (5 labels, index 0–4).

## UI Behaviour Notes

- **Header:** white, `max-w-3xl` (iPad-friendly), KS logo `h-12`. Subtitle hidden on mobile (`hidden sm:block`). Student pill: name (bold) → classId · sessionId on one line (orange dot separator) → district below. Compact enough for a 3-line pill.
- **Progress bar:** scroll-driven; only attached when `surveyReady === true`; does not overwrite `DONE` state (section 5).
- **Class dropdown:** `AdminFields` receives `schoolClasses` (sorted unique Class ID 25/26 for the student's school) and `onClassChange`. Selecting a new class triggers `getConfig()` to update `config` + `sessionId`. If school has only one class, shown as read-only input.
- **Image placeholders:** coloured tiles shown when an image is missing or 404. `onError` state inside `ImagePicker`.
- **Static assets:** all served from `public/` — CSVs at `public/config/`, images at `public/assets/images/`, logo at `public/assets/logos/KS.png`. All fetch paths use `import.meta.env.BASE_URL`.

## Supabase Table Schema

```sql
create table responses (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  student_id text,
  class_id   text,
  session_id text,
  jotform_id text,     -- JotForm submission ID (null if JotForm failed)
  payload    jsonb not null  -- full form state
);
-- TODO: migrate to structured columns once form schema is finalised
```

## JotForm API Key Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/form/{formId}` | Verify form |
| `GET` | `/form/{formId}/questions` | Get qid mapping |
| `GET` | `/form/{formId}/submissions` | List submissions |
| `POST` | `/form/{formId}/submissions` | Create submission |
| `POST` | `/submission/{submissionId}` | Update submission |
| `DELETE` | `/submission/{submissionId}` | Delete submission |

Authentication: `apiKey` query param or `APIKEY` HTTP header.

## Deployment

- Push to `main` → GitHub Actions builds and deploys to GitHub Pages
- Secrets required: all 5 `VITE_*` env vars set in repo Settings → Secrets
- `vite.config.js` base path: `/EMR-JotForm-Wrapper/` (capital F — matches GitHub repo name exactly)

## Pending Items

- [ ] Publish new Round II JotForm form → update qids in `src/constants/questions.js`
- [ ] Populate `public/config/classes.csv` with real class-to-session mappings (columns: `ClassID`, `SessionID`, `Q1a`…`Q8h`)
- [ ] Add all image files to `public/assets/images/`
- [ ] Create Supabase `responses` table (SQL above)
- [ ] Set GitHub Secrets for all env vars
