import { ConstructableType } from '../common/ConstructableType'
import { ParsedArgs } from './Parsed'

class Store {
  private readonly parsed: Map<Function, ParsedArgs[]> = new Map()

  getParsed<T>(type: ConstructableType<T>) {
    const md = this.parsed.get(type)
    if (!md) {
      throw new Error(`${type.name} type cannot be parsed. Does it contain any properties decorated with @Parsed?`)
    }
    return md
  }

  putParsed(target: Function, arg: ParsedArgs) {
    const o = this.parsed.get(target)
    if (!o) {
      this.parsed.set(target, [arg])
    } else {
      o.push(arg)
    }
  }
}

export function getStore(): Store {
  const g: any = global

  if (!g.store) {
    g.store = new Store()
  }

  return g.store
}
