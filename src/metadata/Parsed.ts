import { ParsedProperty } from './ParsedProperty'
import { getStore } from './Store'
import { ValidateOptions, ValidateType } from './Validation'

export type TransformFunction = (input: string) => any

export interface ParsedOptions {
  index?: number
  header?: string
  transform?: TransformFunction
  validate?: ValidateType | ValidateType[] | ValidateOptions
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

    getStore().putParsed(object.constructor, new ParsedProperty(propertyName, options))
  }
}
