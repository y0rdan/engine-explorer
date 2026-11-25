export type EnginePart = {
  id: string
  displayName: string
  meshNames: string[]
}

const partFields = new Set(['id', 'displayName', 'meshNames'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(message: string): never {
  throw new Error(message)
}

export function parseParts(value: unknown): EnginePart[] {
  if (!Array.isArray(value)) fail('parts must be an array')

  const ids = new Set<string>()
  const meshNames = new Set<string>()
  const parts: EnginePart[] = []

  value.forEach((entry, index) => {
    if (!isRecord(entry)) fail(`parts[${index}] must be an object`)
    for (const key of Object.keys(entry)) {
      if (!partFields.has(key)) fail(`parts[${index}] has unknown field ${key}`)
    }

    const { id, displayName, meshNames: names } = entry
    if (typeof id !== 'string' || id.trim() === '') {
      fail(`parts[${index}].id must be a non-empty string`)
    }
    if (ids.has(id)) fail(`duplicate part id ${id}`)
    ids.add(id)

    if (typeof displayName !== 'string' || displayName.trim() === '') {
      fail(`parts[${index}].displayName must be a non-empty string`)
    }
    if (!Array.isArray(names) || names.length === 0) {
      fail(`parts[${index}].meshNames must list at least one mesh or node`)
    }

    const partMeshes: string[] = []
    names.forEach((name, nameIndex) => {
      if (typeof name !== 'string' || name.trim() === '') {
        fail(`parts[${index}].meshNames[${nameIndex}] must be a non-empty string`)
      }
      if (meshNames.has(name)) fail(`duplicate mesh name ${name}`)
      meshNames.add(name)
      partMeshes.push(name)
    })

    parts.push({ id, displayName, meshNames: partMeshes })
  })

  return parts
}
