import { useEffect, useLayoutEffect, useMemo } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Mesh, type Object3D } from 'three'
import type { EngineRecord } from '../../engine/schema.ts'
import { useEngineView } from '../inline4/engineView.ts'
import { disposeObject, fastenerHit, type FastenerRecord } from '../inline4/createInline4.ts'
import { emphasisForMesh, sharedMaterial, type MaterialKind } from '../inline4/materials.ts'
import { disposeGeneratedTextures } from '../inline4/textures.ts'
import { createVeeShowroom } from './createVee.ts'

export type FastenerTip = FastenerRecord & { x: number; y: number }

export function VeeEngine({
  engine,
  onFastener,
}: {
  engine: EngineRecord
  onFastener: (tip: FastenerTip | null) => void
}) {
  const root = useMemo(() => createVeeShowroom(engine), [engine])

  useEffect(() => {
    return () => {
      disposeObject(root)
      disposeGeneratedTextures()
    }
  }, [root])

  return <Showroom root={root} onFastener={onFastener} />
}

function Showroom({
  root,
  onFastener,
}: {
  root: Object3D
  onFastener: (tip: FastenerTip | null) => void
}) {
  const view = useEngineView()
  const invalidate = useThree((state) => state.invalidate)
  useLayoutEffect(() => {
    root.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh || mesh.userData.fixedMaterial || mesh.userData.glow !== undefined || mesh.userData.belt !== undefined) {
        return
      }
      const kind = mesh.userData.kind as MaterialKind | undefined
      if (!kind) return
      const ids = idsFrom(mesh)
      const emphasis = ids.partId ? emphasisForMesh(ids.partId, ids.layerId, view) : 'idle'
      mesh.material = sharedMaterial(kind, emphasis, Boolean(mesh.userData.clip), view.cutaway, view.clipPlane, false)
    })
    root.traverse((object) => {
      if (!object.name.startsWith('part:')) return
      object.visible = emphasisForMesh(object.name.slice(5), null, view) !== 'hidden'
    })
    invalidate()
  }, [root, view, invalidate])

  return (
    <primitive
      object={root}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        const hit = fastenerHit(event.object, event.instanceId)
        if (hit) {
          event.stopPropagation()
          onFastener({ ...hit, x: event.nativeEvent.clientX, y: event.nativeEvent.clientY })
          return
        }
        onFastener(null)
        const ids = idsFrom(event.object)
        if (!ids.partId) return
        event.stopPropagation()
        if (ids.layerId) view.selectLayer(ids.partId, ids.layerId)
        else view.selectPart(ids.partId)
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        if (event.pointerType !== 'mouse') return
        const ids = idsFrom(event.object)
        if (!ids.partId) return
        event.stopPropagation()
        view.hoverPart(ids.partId)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(event: ThreeEvent<PointerEvent>) => {
        if (event.pointerType !== 'mouse') return
        view.hoverPart(null)
        document.body.style.cursor = ''
      }}
    />
  )
}

function idsFrom(object: Object3D): { partId: string | null; layerId: string | null } {
  let partId: string | null = null
  let layerId: string | null = null
  let current: Object3D | null = object
  while (current) {
    if (current.name.startsWith('layer:')) {
      const parts = current.name.split(':')
      partId = parts[1] ?? partId
      layerId = parts[2] ?? layerId
    } else if (current.name.startsWith('part:') && partId === null) {
      partId = current.name.slice(5)
    }
    current = current.parent
  }
  return { partId, layerId }
}
