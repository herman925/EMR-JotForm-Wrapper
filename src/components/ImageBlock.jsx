import ImagePicker from './ImagePicker'
import FollowUpCheckbox from './FollowUpCheckbox'
import ObservationBox from './ObservationBox'

/**
 * One image memory block — contains:
 *   - Q{n}.1 scene recognition (class-specific images)
 *   - Q{n}.2 staff recognition (shared images)
 *   - Optional follow-up checkbox + observation
 *
 * Props:
 *   block        { index, scene: [{src,isCorrect}×4], staff: [{src,isCorrect}×4] }
 *   values       { sceneSelected, staffSelected, followUp: [], observation }
 *   onChange     (key, value) => void
 */
export default function ImageBlock({ block, values = {}, onChange }) {
  const n = block.index

  return (
    <div className="space-y-6">
      {/* Scene question */}
      <ImagePicker
        images={block.scene}
        selected={values.sceneSelected ?? null}
        onSelect={(src, isCorrect) => {
          onChange('sceneSelected', src)
          onChange('sceneCorrect', isCorrect)
        }}
        question={`Q${n}.1  你記唔記得以下邊個場景係你喺童亮館玩過嘅？`}
      />

      {/* Staff question */}
      <ImagePicker
        images={block.staff}
        selected={values.staffSelected ?? null}
        onSelect={(src, isCorrect) => {
          onChange('staffSelected', src)
          onChange('staffCorrect', isCorrect)
        }}
        question={`Q${n}.2  你記唔記得嗰次同邊個姑娘/老師一齊玩？`}
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
