import { ConstructableType } from '../common/ConstructableType'
import { ParsedMetadataArgs } from './Parsed'

class Store {
  private readonly parsed: Map<Function, ParsedMetadataArgs[]> = new Map()

  getParsed<T>(type: ConstructableType<T>) {
    const md = this.parsed.get(type)
    if (!md) {
      throw new Error(`Metadata for ${type.name} not found. Does it contain any properties decorated with @Parsed?`)
    }
    return md
  }

  putParsed(target: Function, arg: ParsedMetadataArgs) {
    const o = this.parsed.get(target)
    if (!o) {
      this.parsed.set(target, [arg])
    } else {
      o.push(arg)
    }
  }
}

export function getMetadataStore(): Store {
  const g: any = global

  if (!g.store) {
    g.store = new Store()
  }

  return g.store
}
