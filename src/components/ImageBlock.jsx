import ImagePicker from './ImagePicker'
import FollowUpCheckbox from './FollowUpCheckbox'
import ObservationBox from './ObservationBox'
import { IMAGE_BATCH_FOLLOWUP_OPTIONS } from '../constants/questions'

/**
 * One image memory block — 4 batches of 2×2 image pickers, each with its own
 * follow-up checkbox (batch1+batch2) and observation textarea (all 4 batches).
 *
 *   batch1 (a–d): scene     — correct=a | follow-up Q{n}.1b | obs Q{n}.1c
 *   batch2 (e–h): staff     — correct=e | follow-up Q{n}.2b | obs Q{n}.2c
 *   batch3 (i–l): set 3     — correct=i |                   | obs Q{n}.3b
 *   batch4 (m–p): set 4     — correct=m |                   | obs Q{n}.4b
 *
 * Props:
 *   block    { index, batch1, batch2, batch3, batch4 }  each [{src,isCorrect}×4]
 *   values   {
 *     batch1Selected, batch1Correct,
 *     batch2Selected, batch2Correct,
 *     batch3Selected, batch3Correct,
 *     batch4Selected, batch4Correct,
 *     b1FollowUp: [], b1Obs,
 *     b2FollowUp: [], b2Obs,
 *     b3Obs, b4Obs,
 *   }
 *   onChange (key, value) => void
 */
export default function ImageBlock({ block, values = {}, onChange, showBatch4 = true }) {
  const n = block.index

  return (
    <div className="space-y-6">

      {/* ── Batch 1 — Scene ─────────────────────────────────────────────── */}
      <ImagePicker
        images={block.batch1}
        selected={values.batch1Selected ?? null}
        onSelect={(src, isCorrect) => {
          onChange('batch1Selected', src)
          onChange('batch1Correct', isCorrect)
        }}
        question={`Q${n}.1  你記唔記得以下邊個場景係你喺童亮館玩過嘅？`}
      />
      <FollowUpCheckbox
        label={`Q${n}.1b. 跟進問題`}
        options={IMAGE_BATCH_FOLLOWUP_OPTIONS.batch1}
        values={values.b1FollowUp ?? []}
        onChange={v => onChange('b1FollowUp', v)}
      />
      <ObservationBox
        label={`Q${n}.1c. 觀察／補充記錄`}
        value={values.b1Obs}
        onChange={v => onChange('b1Obs', v)}
      />

      {/* ── Batch 2 — Staff ─────────────────────────────────────────────── */}
      <ImagePicker
        images={block.batch2}
        selected={values.batch2Selected ?? null}
        onSelect={(src, isCorrect) => {
          onChange('batch2Selected', src)
          onChange('batch2Correct', isCorrect)
        }}
        question={`Q${n}.2  你記唔記得嗰次同邊個姑娘/老師一齊玩？`}
      />
      <FollowUpCheckbox
        label={`Q${n}.2b. 跟進問題（請按次序提問以下兩條問題）`}
        options={IMAGE_BATCH_FOLLOWUP_OPTIONS.batch2}
        values={values.b2FollowUp ?? []}
        onChange={v => onChange('b2FollowUp', v)}
      />
      <ObservationBox
        label={`Q${n}.2c. 觀察／補充記錄`}
        value={values.b2Obs}
        onChange={v => onChange('b2Obs', v)}
      />

      {/* ── Batch 3 ─────────────────────────────────────────────────────── */}
      <ImagePicker
        images={block.batch3}
        selected={values.batch3Selected ?? null}
        onSelect={(src, isCorrect) => {
          onChange('batch3Selected', src)
          onChange('batch3Correct', isCorrect)
        }}
        question={`Q${n}.3  你記唔記得以下邊個係你喺童亮館見過嘅？`}
      />
      <ObservationBox
        label={`Q${n}.3b. 觀察／補充記錄`}
        value={values.b3Obs}
        onChange={v => onChange('b3Obs', v)}
      />

      {/* ── Batch 4 — Tuen Mun only ──────────────────────────────────────── */}
      {showBatch4 && (
        <>
          <ImagePicker
            images={block.batch4}
            selected={values.batch4Selected ?? null}
            onSelect={(src, isCorrect) => {
              onChange('batch4Selected', src)
              onChange('batch4Correct', isCorrect)
            }}
            question={`Q${n}.4  你記唔記得以下邊個係你喺童亮館有關聯嘅？`}
          />
          <ObservationBox
            label={`Q${n}.4b. 觀察／補充記錄`}
            value={values.b4Obs}
            onChange={v => onChange('b4Obs', v)}
          />
        </>
      )}

    </div>
  )
}

