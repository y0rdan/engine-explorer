import { ChevronLeft, ChevronRight, Gauge, Layers, Pause, Play, RotateCcw, Undo2, Wrench, Boxes, List } from 'lucide-react'
import { forwardRef, type ReactNode, type Ref } from 'react'
import { RPM_MAX, RPM_MIN } from '../engine/kinematics.ts'
import { activeStepIndex, assemblySteps, stepLabel, type AssemblyDirection } from '../engine/placement.ts'
import { TORQUE_NOTE, type EngineRecord } from '../engine/schema.ts'

export type Segment = 'explode' | 'run' | 'section' | 'assembly'

const SEGMENTS: { id: Segment; label: string; icon: typeof Boxes }[] = [
  { id: 'explode', label: 'Explode', icon: Boxes },
  { id: 'run', label: 'Run', icon: Gauge },
  { id: 'section', label: 'Section', icon: Layers },
  { id: 'assembly', label: 'Assembly', icon: Wrench },
]

export const Toolbar = forwardRef(function Toolbar({
  engine,
  segment,
  rpm,
  partId,
  isolated,
  playing,
  explode,
  assembly,
  direction,
  narrow,
  switcher,
  onSegment,
  onExplode,
  onPlayExplode,
  onAssembly,
  onStep,
  onPlayAssembly,
  onPlayTeardown,
  onTogglePlay,
  onRpm,
  onResetView,
  onOpenParts,
}: {
  engine: EngineRecord
  segment: Segment
  rpm: number
  partId: string | null
  isolated: boolean
  playing: boolean
  explode: number
  assembly: number
  direction: AssemblyDirection
  narrow: boolean
  switcher?: ReactNode
  onSegment: (segment: Segment) => void
  onExplode: (value: number) => void
  onPlayExplode: () => void
  onAssembly: (value: number) => void
  onStep: (direction: -1 | 1) => void
  onPlayAssembly: () => void
  onPlayTeardown: () => void
  onTogglePlay: () => void
  onRpm: (rpm: number) => void
  onResetView: () => void
  onOpenParts: () => void
}, ref: Ref<HTMLDivElement>) {
  const steps = assemblySteps(engine, partId, segment === 'assembly' && isolated)
  const label = segment === 'assembly' ? stepLabel(steps, assembly, direction) : ''
  const shownRpm = playing ? rpm : 0
  const explodeName = partId ? 'Separate layers' : 'Explode amount'
  const activeIndex = activeStepIndex(assembly, steps.length)
  const fastenerStep = steps[activeIndex]?.fastenerId
  return (
    <div ref={ref} className="toolbar" data-segment={segment}>
      <div className="toolbar-row" role="toolbar" aria-label="Engine controls">
        {switcher}
        <div className="segments" role="group" aria-label="Mode">
          {SEGMENTS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className="segment"
                aria-pressed={segment === item.id}
                aria-label={item.label}
                title={item.label}
                onClick={() => onSegment(item.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
        <button type="button" className="icon-button" aria-label="Reset view" title="Reset view" onClick={onResetView}>
          <RotateCcw size={18} aria-hidden="true" />
        </button>
        {narrow && (
          <button type="button" className="icon-button parts-toggle" aria-label="Parts" title="Parts" onClick={onOpenParts}>
            <List size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="toolbar-row context">
        {segment === 'explode' && (
          <>
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
                aria-label={explodeName}
                aria-valuetext={`${Math.round(explode * 100)} percent`}
                onChange={(event) => onExplode(Number(event.target.value) / 100)}
              />
            </label>
            <button type="button" onClick={onPlayExplode}>
              <Play size={16} aria-hidden="true" />
              {explode > 0.98 ? 'Close up' : 'Play'}
            </button>
          </>
        )}
        {segment === 'run' && (
          <>
            <button type="button" aria-pressed={playing} aria-label={playing ? 'Pause' : 'Play'} onClick={onTogglePlay}>
              {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              {playing ? 'Pause' : 'Play'}
            </button>
            <label className="slider">
              <span>
                Speed
                <strong>{shownRpm} rpm</strong>
              </span>
              <input
                type="range"
                min={RPM_MIN}
                max={RPM_MAX}
                step={10}
                value={rpm}
                aria-label="Speed"
                aria-valuetext={`${shownRpm} rpm`}
                onChange={(event) => onRpm(Number(event.target.value))}
              />
            </label>
          </>
        )}
        {segment === 'section' && <p className="step-label">Section view cuts through the block, liners, and pistons.</p>}
        {segment === 'assembly' && (
          <>
            <button type="button" aria-label="Previous step" onClick={() => onStep(-1)} disabled={activeIndex <= 0 && assembly <= 0}>
              <ChevronLeft size={16} aria-hidden="true" />
              Prev
            </button>
            <button
              type="button"
              aria-label="Next step"
              onClick={() => onStep(1)}
              disabled={activeIndex >= steps.length - 1 && assembly >= 1}
            >
              Next
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={onPlayTeardown}>
              <Undo2 size={16} aria-hidden="true" />
              Teardown
            </button>
            <button type="button" onClick={onPlayAssembly}>
              <Play size={16} aria-hidden="true" />
              Play
            </button>
            <label className="slider">
              <span>
                Step
                <strong>
                  {activeIndex + 1}/{steps.length}
                </strong>
              </span>
              <input
                type="range"
                min={0}
                max={1000}
                step={1}
                value={Math.round(assembly * 1000)}
                aria-label="Assembly step"
                aria-valuetext={label || 'Assembly'}
                onChange={(event) => onAssembly(Number(event.target.value) / 1000)}
              />
            </label>
          </>
        )}
      </div>
      {segment === 'assembly' && label && <p className="step-label">{label}</p>}
      {segment === 'assembly' && fastenerStep && <p className="torque-note">{TORQUE_NOTE}</p>}
    </div>
  )
})
