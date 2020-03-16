import { getMetadataStore } from './Store'

type Transformer = (input: string) => any

export interface ParsedMetadataArgs {
  readonly propertyName: string
  readonly options: ParsedOptions
}

export interface ParsedOptions {
  index?: number
  header?: string
  transform?: Transformer
}

export default function Parsed(options: ParsedOptions | number | string) {
  return (object: Object, propertyName: string) => {
    if (typeof options === 'number') {
      options = { index: options }
    } else if (typeof options === 'string') {
      options = { header: options }
    }

    if (typeof options.index === 'undefined' && typeof options.header === 'undefined') {
      throw new EvalError(`Parsed property '${propertyName}' must have either an index or header option`)
    }

    getMetadataStore().putParsed(object.constructor, { propertyName, options })
  }
}
