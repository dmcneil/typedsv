import { ConstructableType } from '../common/ConstructableType'
import { NotParsableError } from '../error/NotParsableError'
import { ParsedProperty } from './ParsedProperty'

class Store {
  private readonly parsed: Map<Function, ParsedProperty[]> = new Map()

  getParsed<T>(type: ConstructableType<T>) {
    const md = this.parsed.get(type)
    if (!md) {
      throw new NotParsableError(type)
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
