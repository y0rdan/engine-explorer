import { RPM_MAX, RPM_MIN } from '../engine/kinematics.ts'
import { activeStepIndex, assemblySteps, stepLabel } from '../engine/placement.ts'
import type { EngineRecord } from '../engine/schema.ts'

export function ControlBar({
  engine,
  rpm,
  partId,
  isolated,
  assemblyMode,
  cutaway,
  playing,
  explode,
  assembly,
  onExplode,
  onPlayExplode,
  onAssemblyMode,
  onAssembly,
  onStep,
  onPlayAssembly,
  onPlayTeardown,
  onTogglePlay,
  onRpm,
  onCutaway,
  onResetView,
  onOpenParts,
}: {
  engine: EngineRecord
  rpm: number
  partId: string | null
  isolated: boolean
  assemblyMode: boolean
  cutaway: boolean
  playing: boolean
  explode: number
  assembly: number
  onExplode: (value: number) => void
  onPlayExplode: () => void
  onAssemblyMode: (on: boolean) => void
  onAssembly: (value: number) => void
  onStep: (direction: -1 | 1) => void
  onPlayAssembly: () => void
  onPlayTeardown: () => void
  onTogglePlay: () => void
  onRpm: (rpm: number) => void
  onCutaway: (on: boolean) => void
  onResetView: () => void
  onOpenParts: () => void
}) {
  const steps = assemblySteps(engine, partId, assemblyMode && isolated)
  const label = assemblyMode ? stepLabel(steps, assembly) : ''
  const explodeName = partId ? 'Separate layers' : 'Explode'
  return (
    <div className="control-bar">
      <div className="control-row">
        <label className="slider">
          <span>
            {explodeName}
            <strong>{Math.round(explode * 100)}%</strong>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(explode * 100)}
            aria-valuetext={`${Math.round(explode * 100)} percent`}
            disabled={assemblyMode}
            onChange={(event) => onExplode(Number(event.target.value) / 100)}
          />
        </label>
        <button type="button" onClick={onPlayExplode} disabled={assemblyMode}>
          {explode > 0.98 ? 'Close up' : 'Play explode'}
        </button>
        <button type="button" aria-pressed={playing} onClick={onTogglePlay}>
          {playing ? 'Pause' : 'Run'}
        </button>
        <label className="slider speed">
          <span>
            Speed
            <strong>{playing ? rpm : 0} rpm</strong>
          </span>
          <input
            type="range"
            min={RPM_MIN}
            max={RPM_MAX}
            step={10}
            value={rpm}
            aria-valuetext={`${rpm} rpm`}
            onChange={(event) => onRpm(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="control-row">
        <button type="button" aria-pressed={assemblyMode} onClick={() => onAssemblyMode(!assemblyMode)}>
          Assembly
        </button>
        <button type="button" onClick={() => onStep(-1)} disabled={!assemblyMode}>
          Previous
        </button>
        <button type="button" onClick={() => onStep(1)} disabled={!assemblyMode}>
          Next
        </button>
        <label className="slider">
          <span>
            Step
            <strong>{assemblyMode ? `${activeStepIndex(assembly, steps.length) + 1}/${steps.length}` : '—'}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={1000}
            step={1}
            value={Math.round(assembly * 1000)}
            disabled={!assemblyMode}
            aria-valuetext={label || 'Assembly off'}
            onChange={(event) => onAssembly(Number(event.target.value) / 1000)}
          />
        </label>
        <button type="button" onClick={onPlayAssembly} disabled={!assemblyMode}>
          Play assembly
        </button>
        <button type="button" onClick={onPlayTeardown} disabled={!assemblyMode}>
          Teardown
        </button>
        <button type="button" aria-pressed={cutaway} onClick={() => onCutaway(!cutaway)}>
          Section
        </button>
        <button type="button" onClick={onResetView}>
          Reset view
        </button>
        <button type="button" className="parts-toggle" onClick={onOpenParts}>
          Parts
        </button>
      </div>
      {assemblyMode && <p className="step-label">{label}</p>}
    </div>
  )
}
