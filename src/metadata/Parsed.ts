import { getStore } from './Store'
import { isValidationType, ValidationOptions, ValidationType } from './Validation'

export type Transformer = (input: string) => any

export interface ParsedArgs {
  readonly propertyName: string
  readonly options: ParsedOptions
}

export interface ParsedOptions {
  index?: number
  header?: string
  transform?: Transformer
  validate?: ValidationType | ValidationType[] | ValidationOptions
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
      options.validate = validate as ValidationOptions
    }

    getStore().putParsed(object.constructor, { propertyName, options })
  }
}
