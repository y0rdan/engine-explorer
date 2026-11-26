import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import parts from './parts.json'
import { parseParts } from './parts.ts'

function gltfNames(glb: Uint8Array): { nodes: string[]; meshes: string[] } {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength)
  const jsonLength = view.getUint32(12, true)
  const jsonType = view.getUint32(16, true)
  if (jsonType !== 0x4e4f534a) throw new Error('engine.glb is missing a JSON chunk')
  const gltf = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLength))) as {
    nodes?: { name?: string }[]
    meshes?: { name?: string }[]
  }
  const names = (items: { name?: string }[] | undefined) =>
    (items ?? []).flatMap((item) => (typeof item.name === 'string' ? [item.name] : []))
  return { nodes: names(gltf.nodes), meshes: names(gltf.meshes) }
}

describe('parts.json', () => {
  it('matches the starter part schema', () => {
    const parsed = parseParts(parts)
    expect(parsed.length).toBeGreaterThan(0)
    expect(parsed.map((part) => part.id)).toContain('engine')
    expect(parsed.every((part) => part.displayName.length > 0)).toBe(true)
    expect(parsed.every((part) => part.meshNames.length > 0)).toBe(true)
  })

  it('only names meshes and nodes that exist on the engine model', () => {
    const parsed = parseParts(parts)
    const glb = readFileSync('reference/engine.glb')
    const { nodes, meshes } = gltfNames(glb)
    const known = new Set([...nodes, ...meshes])

    for (const part of parsed) {
      for (const name of part.meshNames) {
        expect(known.has(name), `${name} is not a mesh or node in engine.glb`).toBe(true)
      }
    }
  })

  it('rejects a part that is missing its mesh list', () => {
    expect(() => parseParts([{ id: 'battery', displayName: 'Battery' }])).toThrow(/meshNames/)
  })

  it('rejects duplicate ids and unknown fields', () => {
    expect(() =>
      parseParts([
        { id: 'engine', displayName: 'Engine', meshNames: ['a'] },
        { id: 'engine', displayName: 'Again', meshNames: ['b'] },
      ]),
    ).toThrow(/duplicate part id/)

    expect(() =>
      parseParts([{ id: 'engine', displayName: 'Engine', meshNames: ['a'], summary: 'later' }]),
    ).toThrow(/unknown field/)
  })
})
