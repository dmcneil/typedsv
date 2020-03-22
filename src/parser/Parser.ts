import { ConstructableType } from '../common/ConstructableType'
import { ParsedProperty } from '../metadata/ParsedProperty'
import { getStore } from '../metadata/Store'
import { Input } from './Input'
import { Reader, ReaderOptions } from './Reader'

type ParserOptions = {} & ReaderOptions

export class Parser<T> {
  private readonly type: ConstructableType<T>
  private readonly properties: ParsedProperty[]

  constructor(type: ConstructableType<T>) {
    this.type = type
    this.properties = getStore().getParsed(this.type)
  }

  parse = (input: Input, options?: ParserOptions): Promise<T[]> => {
    const objects: T[] = []
    const reader = new Reader(options)

    return new Promise<T[]>(async (resolve, reject) => {
      const result = await reader.read(input)

      result.rows.forEach((row: string[] | object) => {
        const target = new this.type()

        try {
          if (row instanceof Array) {
            row.forEach((value: any, index: number) => {
              this.properties
                .filter(args => args.options.index === index)
                .forEach((prop: ParsedProperty) => prop.set(target, value))
            })
          } else if (typeof row === 'object') {
            result.headers.forEach((value: string, index: number) => {
              this.properties
                .filter(args => args.options.header === value || args.options.index === index)
                .forEach((prop: ParsedProperty) => prop.set(target, row[value]))
            })
          }
        } catch (e) {
          reject(e)
        }

        objects.push(target)
      })

      resolve(objects)
    })
  }
}
