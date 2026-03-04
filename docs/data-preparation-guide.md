# Data Preparation Guide

This guide explains how to prepare the two data files and image assets required before the app can be used in the field.

---

## 1. `public/config/classes.csv` — Class-to-Session Mapping

### Purpose
Maps each class (`ClassID`) to its assigned session (`SessionID`) and lists the exact image filenames for every image question set.

### Key concept: question sets and batches

Each **question set** (Q1–Q8) contains **four batches** of images:

| Batch | Letters | Subject | Correct answer |
|---|---|---|---|
| Batch 1 — Scene | `a`, `b`, `c`, `d` | Places / scenes the child visited | `a` (correct), `b`–`d` (distractors) |
| Batch 2 — Staff | `e`, `f`, `g`, `h` | Staff members the child met | `e` (correct), `f`–`h` (distractors) |
| Batch 3 | `i`, `j`, `k`, `l` | Recognition set 3 (scenes / objects) | `i` (correct), `j`–`l` (distractors) |
| Batch 4 | `m`, `n`, `o`, `p` | Recognition set 4 (scenes / objects) | `m` (correct), `n`–`p` (distractors) |

So **1 question set = 4 batches = 16 image files** (`Q{n}a` through `Q{n}p`).

> The app shows each batch as a separate 2×2 image grid. The child picks one image per batch. The display order is shuffled within each batch — the correct answer is never visually marked.

### Column structure

| Position | Column | Example | Notes |
|---|---|---|---|
| 1 | `ClassID` | `C-001-01` | Must match `Class ID 25/26` in `students_raw.csv` exactly |
| 2 | `SessionID` | `KC-01` | Drives image filename prefix; shown in the app header |
| 3–18 | `Q1a`–`Q1p` | `KC-01_Q1a.jpg` | Question set 1 — `a`–`d` = scene, `e`–`h` = staff, `i`–`l` = batch 3, `m`–`p` = batch 4 |
| 19–34 | `Q2a`–`Q2p` | `KC-01_Q2a.jpg` | Question set 2 |
| … | … | … | Repeat for Q3–Q6 for non-TM districts |
| 99–114 | `Q7a`–`Q7p` | `TM-01_Q7a.jpg` | Tuen Mun only — leave blank for other districts |
| 115–130 | `Q8a`–`Q8p` | `TM-01_Q8a.jpg` | Tuen Mun only — leave blank for other districts |

**Total columns: 130** (`ClassID` + `SessionID` + 8 question sets × 16 images)

### Number of question sets per district

| District | Question sets used | Q7–Q8 columns |
|---|---|---|
| Kowloon City | Q1–Q6 (6 sets) | Leave blank (`,,,,,,,,,,,,,,,,`) |
| Sham Shui Po | Q1–Q6 (6 sets) | Leave blank |
| Shatin | Q1–Q6 (6 sets) | Leave blank |
| Tuen Mun | Q1–Q8 (8 sets) | Fill in |
| Yuen Long | Q1–Q6 (6 sets) | Leave blank |

### How to fill it in

1. Open `public/config/classes.csv` directly in Excel (or Google Sheets → File → Import).
   - The first row is the header — **do not change it**.
   - Each subsequent row is one class. The placeholder rows for `C-001-01`, `C-001-02`, etc. show the expected format — replace or add rows as needed.
2. For each class row:
   - Set `ClassID` to match the value in `students_raw.csv` column `Class ID 25/26` exactly (e.g. `C-001-01`)
   - Set `SessionID` to the assigned session code (e.g. `KC-01`)
   - For each question set `n` (1–6 for non-TM, 1–8 for TM), fill in 16 cells following the pattern `{SessionID}_Q{n}{letter}.jpg` for letters `a`–`p`
   - Leave Q7 and Q8 cells **blank** for non-TM classes (32 empty cells)
3. When done, save as **CSV UTF-8** (in Excel: File → Save As → CSV UTF-8 (comma delimited)).
4. Make sure the filename remains `classes.csv` and the file is saved back to `public/config/`.

> **Do not add or remove columns.** The header row and column order must stay exactly as-is.

### What it looks like in Excel (example — non-TM class)

| ClassID | SessionID | Q1a | Q1b | Q1c | Q1d | Q1e | Q1f | Q1g | Q1h | Q1i | Q1j | Q1k | Q1l | Q1m | Q1n | Q1o | Q1p | … | Q6p | Q7a | … | Q8p |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C-001-01 | KC-01 | KC-01_Q1a.jpg | … | KC-01_Q1d.jpg | KC-01_Q1e.jpg | … | KC-01_Q1h.jpg | KC-01_Q1i.jpg | … | KC-01_Q1l.jpg | KC-01_Q1m.jpg | … | KC-01_Q1p.jpg | … | KC-01_Q6p.jpg | *(empty)* | … | *(empty)* |

### What it looks like in Excel (example — Tuen Mun class)

| ClassID | SessionID | Q1a | … | Q1p | Q2a | … | Q6p | Q7a | … | Q7p | Q8a | … | Q8p |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C-120-01 | TM-01 | TM-01_Q1a.jpg | … | TM-01_Q1p.jpg | TM-01_Q2a.jpg | … | TM-01_Q6p.jpg | TM-01_Q7a.jpg | … | TM-01_Q7p.jpg | TM-01_Q8a.jpg | … | TM-01_Q8p.jpg |

---

## 2. `public/assets/images/` — Image Files

### Naming convention

```
{SessionID}_Q{n}{choice}.jpg
```

| Part | Meaning | Example values |
|---|---|---|
| `{SessionID}` | Session prefix from `classes.csv` | `KC-01`, `TM-08`, `SSP-03` |
| `Q{n}` | Question set number | `Q1`–`Q6` (non-TM), `Q1`–`Q8` (TM) |
| `{choice}` | Image slot within the set | `a`–`d` (batch 1/scene), `e`–`h` (batch 2/staff), `i`–`l` (batch 3), `m`–`p` (batch 4) |

### Examples

Question set 1, session KC-01:

| Filename | Batch | Role |
|---|---|---|
| `KC-01_Q1a.jpg` | Batch 1 — Scene | ✅ Correct scene |
| `KC-01_Q1b.jpg` | Batch 1 — Scene | Distractor |
| `KC-01_Q1c.jpg` | Batch 1 — Scene | Distractor |
| `KC-01_Q1d.jpg` | Batch 1 — Scene | Distractor |
| `KC-01_Q1e.jpg` | Batch 2 — Staff | ✅ Correct staff |
| `KC-01_Q1f.jpg` | Batch 2 — Staff | Distractor |
| `KC-01_Q1g.jpg` | Batch 2 — Staff | Distractor |
| `KC-01_Q1h.jpg` | Batch 2 — Staff | Distractor |
| `KC-01_Q1i.jpg` | Batch 3 | ✅ Correct |
| `KC-01_Q1j.jpg` | Batch 3 | Distractor |
| `KC-01_Q1k.jpg` | Batch 3 | Distractor |
| `KC-01_Q1l.jpg` | Batch 3 | Distractor |
| `KC-01_Q1m.jpg` | Batch 4 | ✅ Correct |
| `KC-01_Q1n.jpg` | Batch 4 | Distractor |
| `KC-01_Q1o.jpg` | Batch 4 | Distractor |
| `KC-01_Q1p.jpg` | Batch 4 | Distractor |

The same pattern repeats for every question set and every session (e.g. `TM-08_Q8a.jpg` through `TM-08_Q8h.jpg` for Tuen Mun session 8, question set 8).

### Total expected files

| Group | Calculation | Count |
|---|---|---|
| Non-TM (KC, SSP, ST, YL) | 4 districts × 6 sessions × 6 question sets × 16 images | 2,304 |
| Tuen Mun | 1 district × 8 sessions × 8 question sets × 16 images | 1,024 |
| **Total** | | **3,328** |

### How to prepare the images

1. Rename all image files to match the naming convention above exactly (case-sensitive).
2. Place all files in a **single flat folder** — no subfolders.
3. Copy the folder contents to `public/assets/images/`.
4. Scene images (`a`–`d`) are class-specific — different sessions may have different scenes.
5. Staff images (`e`–`h`) are typically the same people across all sessions for a given question set number, but the filename prefix still varies by session (e.g., `KC-01_Q1e.jpg` and `KC-02_Q1e.jpg` may show the same person but are separate files).

> **Tip:** If an image file is missing, the app will show a coloured placeholder tile with the filename — this is intentional and allows interviewers to see what is expected without crashing.

---

## 3. JotForm Form Structure

The form is named **"Event-based Memory Test Recording Form (Round II)"**. Below is the complete question list with the field type expected in JotForm, and the internal key used by the app.

> **Note:** `qid` values for admin fields and Q1–Q8 are from the Round I form clone. These must be updated in `src/constants/questions.js` once the Round II form is published.

### Admin / Hidden Fields

| Internal key | Question / Field label | JotForm field type | Round I qid |
|---|---|---|---|
| `interviewerName` | 訪問老師姓名 | Short text | `204` |
| `phase` | 計劃階段 | Dropdown (Trial / Pilot / Round I / Round II) | `212` |
| `interviewDate` | 訪問日期 | Date | `207` |
| `studentId` | 學生編號 | Short text (hidden / auto-fill) | `100` |
| `studentName` | 學生姓名 | Short text | `58` |
| `schoolName` | 學校名稱 | Short text (hidden / auto-fill) | `186` |
| `studentClass` | 班別編號 | Short text (hidden / auto-fill) | `201` |
| `district` | 所屬地區 | Dropdown (九龍城 / 沙田 / 深水埗 / 元朗 / 屯門) | `213` |

### Part 1 — Feelings (Q1–Q6)

Each question has three sub-fields: **(a)** rating or checkbox, **(b)** follow-up checkboxes, **(c)** observation text.

| Q | Cantonese question text | Field type (a) | Follow-up options (b) | Round I qids (a / b / c) |
|---|---|---|---|---|
| Q1a | 你嚟到童亮館嗰陣覺得點呀？ | 5-point emoji scale (😭→😃) | 係乜嘢令到你開心/唔開心？（根據幼兒上一題的回答提問）| `16` / `144` / `105` |
| Q2a | 你鍾唔鍾意喺童亮館同同學仔一齊玩？ | 5-point emoji scale | 同朋友喺呢度玩嘅時候，邊樣嘢最好玩？；你仲想喺呢度同朋友玩啲咩新遊戲？ | `24` / `148` / `106` |
| Q3a | 你鍾唔鍾意童亮館入面啲玩具同設施？ | 5-point emoji scale | 點解你鐘意/唔鐘意玩嗰個玩具/設施？；你希望童亮館有啲咩玩？ | `25` / `149` / `112` |
| Q4a | 你鍾唔鍾意參加童亮館嘅活動？ | 5-point emoji scale | 點解你鐘意/唔鐘意嗰啲活動？；你覺得最好玩嘅活動係咩？ | `26` / `150` / `116` |
| Q5a | 童亮館令你覺得安全嗎？ | Checkbox (安全 / 不安全) | （若幼兒回答不安全）點解令你覺得唔安全？；（若幼兒回答安全）有冇啲乜嘢令你感到安全？ | `211` / `151` / `120` |
| Q6a | 童亮館嘅姑娘/老師有冇喺你需要幫手嘅時候幫你？ | Checkbox (有 / 沒有) | （若幼兒回答係否定）係發生乜嘢事？/你嗰陣需要乜嘢幫助？；（若幼兒回答係肯定）佢哋係點樣幫助你架？ | `209` / `152` / `124` |

> Observation fields (c) are free-text boxes for the interviewer to note child behaviour. They are always shown but optional.

### Part 2 — Memory (Q7–Q8)

| Q | Cantonese question text | Field type | Round I qid |
|---|---|---|---|
| Q7 | 你記唔記得自己K2嚟過童亮館幾多次？ | Short text | `187` |
| Q8 | 你記得自己喺度做過啲咩？ | Long text (textarea) | `127` |

### Part 3 — Image Question Sets (Q9 onwards)

The wrapper app owns the image-picker UI entirely. JotForm stores only the **result** of each pick as a plain short text (`A` = correct, `B` = wrong, `9999` = N/A / skipped).

Each question set maps to **10 JotForm fields**: 4 image result textboxes + 2 follow-up checkboxes + 4 observation textareas.

#### Image result fields (one per batch)

| Batch | Set 1 (Q9) qid | Set 2 (Q10) qid | Stored value |
|---|---|---|---|
| Batch 1 — Scene | `226` | `229` | `a`–`d` or `9999` |
| Batch 2 — Staff | `225` | `230` | `e`–`h` or `9999` |
| Batch 3 | `227` | `231` | `i`–`l` or `9999` |
| Batch 4 | `228` | `232` | `m`–`p` or `9999` |

#### Per-batch follow-up + observation fields

| Sub-field | Set 1 qid | Set 2 qid | JotForm type |
|---|---|---|---|
| Q9.1b / Q10.1b — batch1 follow-up | `153` | `202` | checkbox |
| Q9.1c / Q10.1c — batch1 observation | `157` | `163` | textarea |
| Q9.2b / Q10.2b — batch2 follow-up | `155` | `165` | checkbox |
| Q9.2c / Q10.2c — batch2 observation | `158` | `166` | textarea |
| Q9.3b / Q10.3b — batch3 observation | `159` | `169` | textarea |
| Q9.4b / Q10.4b — batch4 observation | `218` | `221` | textarea |

**Follow-up checkbox option text** (must match JotForm options exactly):
- Batch 1: `可唔可以講下你喺呢個場景度做過啲咩？`
- Batch 2: `你記得你哋一起做咗啲咩嗎？` and `嗰陣你覺得點呀？`

> Sets 3–8 qids are `null` in `IMAGE_BLOCK_QIDS` and `IMAGE_BLOCK_BATCH_QIDS` — those entries are skipped at submission time. They will be filled in once Tuen Mun sessions are confirmed.

### Part 4 — Closing Questions (final section)

These are prompted verbally by the interviewer. The app records which questions were asked (checkboxes) plus a free-text observation.

| # | Question text |
|---|---|
| 1 | 你仲想唔想再嚟童亮館？ |
| 2 | 點解你想／唔想再嚟？ |
| 3 | 下次嚟想做啲咩？ |
| 4 | 如果可以改一樣童亮館入面嘅嘢，你會改邊樣？ |
| 5 | 仲有冇啲乜嘢想同我哋分享？ |

> These closing questions do not map to individual JotForm qids in the current schema — the app records them as a JSON array in the Supabase `payload` column.

---

## 4. Updating qid Mappings After Form Changes

If the JotForm schema changes (e.g. new questions added for sets 3–8):

1. Fetch the live schema:
   ```
   curl "https://api.jotform.com/form/{FORM_ID}/questions?apiKey={YOUR_KEY}" | node -e \
     "const d=[];process.stdin.on('data',c=>d.push(c));process.stdin.on('end',()=>{
       const j=JSON.parse(d.join(''));
       Object.entries(j.content).sort((a,b)=>+a[0]-+b[0]).forEach(([qid,q])=>console.log(qid,q.type?.padEnd(22),q.text?.slice(0,60)));
     });"
   ```
2. Update `src/constants/questions.js`:
   - `ADMIN_QIDS` — verify the 8 admin field qids
   - `FEELINGS_QUESTIONS` — `qid`, `followUpQid`, `observationQid` for Q1–Q6
   - `MEMORY_QUESTIONS` — `q7.qid`, `q8.qid`
   - `IMAGE_BLOCK_QIDS` — `batch1`/`batch2`/`batch3`/`batch4` keyed by set index (1–8)
   - `IMAGE_BLOCK_BATCH_QIDS` — `b1FollowUp`, `b1Obs`, `b2FollowUp`, `b2Obs`, `b3Obs`, `b4Obs` per set
   - `IMAGE_BATCH_FOLLOWUP_OPTIONS` — update if any checkbox option text changes
   - `DISTRICT_MAP` — update if dropdown options change
3. Run `node docs/test_submission.cjs --submit` to validate, then delete the test submission.
4. Also update `VITE_JOTFORM_FORM_ID` in `.env` and GitHub Secrets if the form ID changes.
