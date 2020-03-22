import { ParsedProperty } from '../metadata/ParsedProperty'

export class ValidateError extends Error {
  constructor(property: ParsedProperty, value: any, ...messages: string[]) {
    super()
    this.message = `Validation failed for property ${property.name}: [${messages.join(', ')}]`
  }
}
