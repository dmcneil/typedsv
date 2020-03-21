import { ConstructableType } from '../common/ConstructableType'
import { ParsedProperty } from './Parsed'

class Store {
  private readonly parsed: Map<Function, ParsedProperty[]> = new Map()

  getParsed<T>(type: ConstructableType<T>) {
    const md = this.parsed.get(type)
    if (!md) {
      throw new Error(`${type.name} type cannot be parsed. Does it contain any properties decorated with @Parsed?`)
    }
    return md
  }

  putParsed(target: Function, arg: ParsedProperty) {
    const o = this.parsed.get(target)
    if (!o) {
      this.parsed.set(target, [arg])
    } else {
      o.push(arg)
    }
  }
}

let store: Store

export function getStore(): Store {
  if (!store) {
    store = new Store()
  }

  return store
}
