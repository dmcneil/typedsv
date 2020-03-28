import { ConstructableType } from '../common/ConstructableType'
import { InputType } from '../common/InputType'
import { ParsedProperty } from '../metadata/ParsedProperty'
import { getStore } from '../metadata/Store'
import { Reader, ReaderOptions } from '../reader/Reader'

type ParserOptions<T> = {
  onObject?: (o: T, index: number) => void
} & ReaderOptions

export class Parser<T> {
  private readonly type: ConstructableType<T>
  private readonly properties: ParsedProperty[]

  constructor(type: ConstructableType<T>) {
    this.type = type
    this.properties = getStore().getParsed(this.type)
  }

  parse = (input: InputType, options: ParserOptions<T> = {}): Promise<T[]> => {
    return new Promise<T[]>(async resolve => {
      const headers: string[] = []
      const objects: T[] = []

      options.onHeader = (header: string[]) => headers.push(...header)
      options.onRow = (row: string[] | object) => {
        const target = new this.type()

        if (row instanceof Array) {
          row.forEach((value: any, index: number) => {
            this.properties
              .filter(args => args.options.index === index)
              .forEach((prop: ParsedProperty) => prop.set(target, value))
          })
        } else if (typeof row === 'object') {
          headers.forEach((value: string, index: number) => {
            this.properties
              .filter(args => args.options.header === value || args.options.index === index)
              .forEach((prop: ParsedProperty) => prop.set(target, row[value]))
          })
        }

        options.onObject?.(target, objects.length)
        objects.push(target)
      }

      const reader = new Reader(options)
      await reader.read(input)

      resolve(objects)
    })
  }
}
