import ImagePicker from './ImagePicker'
import FollowUpCheckbox from './FollowUpCheckbox'
import ObservationBox from './ObservationBox'

/**
 * One image memory block — contains 4 batches of 2×2 image pickers:
 *   batch1 (a–d): scene recognition — correct = a
 *   batch2 (e–h): staff recognition — correct = e
 *   batch3 (i–l): recognition set 3 — correct = i
 *   batch4 (m–p): recognition set 4 — correct = m
 * Each batch is shuffled independently on mount.
 *
 * Props:
 *   block    { index, batch1, batch2, batch3, batch4 }  each [{src,isCorrect}×4]
 *   values   { batch1Selected, batch1Correct, batch2Selected, batch2Correct,
 *             batch3Selected, batch3Correct, batch4Selected, batch4Correct,
 *             followUp: [], observation }
 *   onChange (key, value) => void
 */
export default function ImageBlock({ block, values = {}, onChange }) {
  const n = block.index

  return (
    <div className="space-y-6">
      {/* Batch 1 — Scene */}
      <ImagePicker
        images={block.batch1}
        selected={values.batch1Selected ?? null}
        onSelect={(src, isCorrect) => {
          onChange('batch1Selected', src)
          onChange('batch1Correct', isCorrect)
        }}
        question={`Q${n}.1  你記唔記得以下邊個場景係你喺童亮館玩過嘅？`}
      />

      {/* Batch 2 — Staff */}
      <ImagePicker
        images={block.batch2}
        selected={values.batch2Selected ?? null}
        onSelect={(src, isCorrect) => {
          onChange('batch2Selected', src)
          onChange('batch2Correct', isCorrect)
        }}
        question={`Q${n}.2  你記唔記得嗰次同邊個姑娘/老師一齊玩？`}
      />

      {/* Batch 3 */}
      <ImagePicker
        images={block.batch3}
        selected={values.batch3Selected ?? null}
        onSelect={(src, isCorrect) => {
          onChange('batch3Selected', src)
          onChange('batch3Correct', isCorrect)
        }}
        question={`Q${n}.3  你記唔記得以下邊個係你喺童亮館見過嘅？`}
      />

      {/* Batch 4 */}
      <ImagePicker
        images={block.batch4}
        selected={values.batch4Selected ?? null}
        onSelect={(src, isCorrect) => {
          onChange('batch4Selected', src)
          onChange('batch4Correct', isCorrect)
        }}
        question={`Q${n}.4  你記唔記得以下邊個係你喺童亮館有關聯嘅？`}
      />

      {/* Follow-up */}
      <FollowUpCheckbox
        label={`Q${n}.b. 跟進問題`}
        options={['可唔可以講下你喺呢個場景度做過啲咩？', '嗰陣你覺得點呀？']}
        values={values.followUp ?? []}
        onChange={v => onChange('followUp', v)}
      />

      <ObservationBox
        label={`Q${n}.c. 觀察／補充記錄`}
        value={values.observation}
        onChange={v => onChange('observation', v)}
      />
    </div>
  )
}
