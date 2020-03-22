import { ConstructableType } from '../common/ConstructableType'
import { ParsedProperty } from '../metadata/ParsedProperty'

export class InvalidPropertyTypeError<T> extends Error {
  constructor(type: ConstructableType<T>, property: ParsedProperty, value: any) {
    super()
    this.message = `Cannot set ${type.name}.${property.name} to value '${value}' of type ${value.constructor.name}`
  }
}
