import { ParsedProperty } from './ParsedProperty'
import { getStore } from './Store'
import { isValidationType, ValidateOptions, ValidateFunction } from './Validation'

export type TransformFunction = (input: string) => any

export interface ParsedOptions {
  index?: number
  header?: string
  transform?: TransformFunction
  validate?: ValidateFunction | ValidateFunction[] | ValidateOptions
}

export default function Parsed(options: ParsedOptions | number | string) {
  return (object: Object, propertyName: string) => {
    if (typeof options === 'number') {
      if (options % 1 !== 0) {
        throw new Error(`@Parsed property '${propertyName}' has a non-integer index value: ${options}`)
      }
      options = { index: options }
    } else if (typeof options === 'string') {
      options = { header: options }
    }

    if (typeof options.index === 'undefined' && typeof options.header === 'undefined') {
      throw new Error(`@Parsed property '${propertyName}' must have either an index or header option`)
    }

    let { validate } = options
    if (validate) {
      if (validate instanceof Array) {
        validate = { functions: validate }
      } else if (isValidationType(validate)) {
        validate = { functions: [validate] }
      }
      options.validate = validate as ValidateOptions
    }

    getStore().putParsed(object.constructor, new ParsedProperty(propertyName, options))
  }
}
