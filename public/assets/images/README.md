# Image Assets

Place all image files in this folder (flat structure, no subfolders).

## Naming Convention

```
{SessionID}_Q{n}{choice}.jpg
```

Examples:
- `KC-01_Q1a.jpg`  ← correct answer for Q1, session KC-01
- `KC-01_Q1b.jpg`  ← distractor
- `TM-08_Q8d.jpg`  ← distractor for Q8, session TM-08

## Session ID Format

`{DistrictPrefix}-{nn}` where nn is zero-padded (01, 02 … 08)

| District | Prefix | Sessions |
|---|---|---|
| Kowloon City | KC | KC-01 … KC-06 |
| Sham Shui Po | SSP | SSP-01 … SSP-06 |
| Shatin | ST | ST-01 … ST-06 |
| Tuen Mun | TM | TM-01 … TM-08 |
| Yuen Long | YL | YL-01 … YL-06 |

## Rules

- `a` suffix = correct answer (never shown to student in correct position — display order of all 4 is randomised)
- `b`, `c`, `d` = distractors
- Q1–Q6 required for all districts; Q7–Q8 for Tuen Mun only
- Total expected files: (5 districts × 6 sessions × 6 sets × 4 images) + (1 district × 8 sessions × 8 sets × 4 images) = **720 + 256 = 976 files**
