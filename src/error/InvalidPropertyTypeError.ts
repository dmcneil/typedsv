import { ConstructableType } from '../common/ConstructableType'
import { ParsedProperty } from '../metadata/ParsedProperty'

export class InvalidPropertyTypeError<T> extends Error {
  constructor(type: ConstructableType<T>, property: ParsedProperty, value: any) {
    super()
    this.message = `Cannot set ${type.constructor.name}.${property.name}: ${value.constructor.name} is not assignable to ${property.type.name}`
  }
}
