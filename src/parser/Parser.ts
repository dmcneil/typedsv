import { ConstructableType } from '../common/ConstructableType'
import { ParsedMetadataArgs } from '../metadata/Parsed'
import { getMetadataStore } from '../metadata/Store'
import { Input } from './Input'
import { Reader, ReaderOptions } from './Reader'

type ParserOptions = {} | ReaderOptions

export class Parser<T> {
  private readonly type: ConstructableType<T>
  private readonly metadata: ParsedMetadataArgs[]

  constructor(type: ConstructableType<T>) {
    this.type = type
    this.metadata = getMetadataStore().getParsed(this.type)
  }

  parse(input: Input, options?: ParserOptions): Promise<T[]> {
    const objects: T[] = []
    const reader = new Reader(options)

    return new Promise<T[]>(async (resolve, _) => {
      const result = await reader.read(input)

      result.rows.forEach((row: string[] | object) => {
        const target = new this.type()

        if (row instanceof Array) {
          row.forEach((value: any, index: number) => {
            this.metadata
              .filter(args => args.options.index === index)
              .forEach((prop: ParsedMetadataArgs) => {
                Parser.setParsedProperty(target, prop, row[index])
              })
          })
        } else if (typeof row === 'object') {
          result.headers.forEach((value: string, index: number) => {
            this.metadata
              .filter(args => args.options.header === value || args.options.index === index)
              .forEach((prop: ParsedMetadataArgs) => {
                Parser.setParsedProperty(target, prop, row[value])
              })
          })
        }

        objects.push(target)
      })

      resolve(objects)
    })
  }

  private static setParsedProperty(target: any, prop: ParsedMetadataArgs, dv: any): void {
    const { transform } = prop.options
    if (transform && typeof dv === 'string') {
      dv = transform(dv as string)
    }

    const targetType = Reflect.getMetadata('design:type', target, prop.propertyName)

    if (!(dv instanceof targetType || dv.constructor === targetType)) {
      let ok = false

      if (typeof dv === 'string') {
        if (targetType === Number) {
          const num = parseFloat(dv)
          if (!isNaN(num)) {
            dv = num
            ok = true
          }
        } else if (targetType === Boolean) {
          if (isTrue(dv)) {
            dv = true
            ok = true
          } else if (isFalse(dv)) {
            dv = false
            ok = true
          }
        }
      }

      if (!ok) {
        throw new Error(
          `cannot set value ${dv} of type ${dv.constructor.name} to property ${prop.propertyName} of type ${targetType.name}`
        )
      }
    }

    if (!Reflect.set(target, prop.propertyName, dv)) {
      throw new Error(`failed to set property ${prop.propertyName} with value: ${dv}`)
    }
  }
}

const trueBooleanValue = ['TRUE', 'Y', 'YES', 'T', '1']
const isTrue = (s: string): boolean => {
  return trueBooleanValue.includes(s.toUpperCase())
}

const falseBooleanValue = ['FALSE', 'N', 'NO', 'F', '0']
const isFalse = (s: string): boolean => {
  return falseBooleanValue.includes(s.toUpperCase())
}
