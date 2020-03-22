import { ConstructableType } from '../common/ConstructableType'

export class InvalidTypeError<T> extends Error {
  constructor(type: ConstructableType<T>) {
    super()
    this.message = `Type ${type.name} cannot be parsed. Does it contain any properties decorated with @Parsed?`
  }
}
