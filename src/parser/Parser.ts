import { ConstructableType } from '../common/ConstructableType'
import { ParsedArgs } from '../metadata/Parsed'
import { getStore } from '../metadata/Store'
import { isValidationObject, ValidationFunction, ValidationOptions, ValidationType } from '../metadata/Validation'
import { Input } from './Input'
import { Reader, ReaderOptions } from './Reader'

const trueBooleanValue = ['TRUE', 'Y', 'YES', 'T', '1']
const falseBooleanValue = ['FALSE', 'N', 'NO', 'F', '0']

type ParserOptions = {} & ReaderOptions

export class Parser<T> {
  private readonly type: ConstructableType<T>
  private readonly parsedArgs: ParsedArgs[]

  constructor(type: ConstructableType<T>) {
    this.type = type
    this.parsedArgs = getStore().getParsed(this.type)
  }

  parse = (input: Input, options?: ParserOptions): Promise<T[]> => {
    const objects: T[] = []
    const reader = new Reader(options)

    return new Promise<T[]>(async (resolve, reject) => {
      const result = await reader.read(input)

      result.rows.forEach((row: string[] | object) => {
        const target = new this.type()

        if (row instanceof Array) {
          row.forEach((value: any, index: number) => {
            this.parsedArgs
              .filter(args => args.options.index === index)
              .forEach((prop: ParsedArgs) => {
                try {
                  Parser.setParsedProperty(target, prop, row[index])
                } catch (e) {
                  reject(e)
                }
              })
          })
        } else if (typeof row === 'object') {
          result.headers.forEach((value: string, index: number) => {
            this.parsedArgs
              .filter(args => args.options.header === value || args.options.index === index)
              .forEach((prop: ParsedArgs) => {
                try {
                  Parser.setParsedProperty(target, prop, row[value])
                } catch (e) {
                  reject(e)
                }
              })
          })
        }

        objects.push(target)
      })

      resolve(objects)
    })
  }

  private static setParsedProperty(target: any, prop: ParsedArgs, dv: any): void {
    const { transform, validate } = prop.options
    if (transform && typeof dv === 'string') {
      dv = transform(dv as string)
    }

    if (validate) {
      this.validateProperty(prop, dv, validate as ValidationOptions)
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
          if (trueBooleanValue.includes(dv.toUpperCase())) {
            dv = true
            ok = true
          } else if (falseBooleanValue.includes(dv.toUpperCase())) {
            dv = false
            ok = true
          }
        }
      }

      if (!ok) {
        throw new Error(
          `Cannot set value '${dv}' of type ${dv.constructor.name} to property '${prop.propertyName}' of type ${targetType.name}`
        )
      }
    }

    if (!Reflect.set(target, prop.propertyName, dv)) {
      throw new Error(`Failed to set property '${prop.propertyName}' to value '${dv}'`)
    }
  }

  private static validateProperty(prop: ParsedArgs, value: any, options: ValidationOptions): void {
    const { aggregate, functions } = options
    const errors: Error[] = []

    functions.forEach((v: ValidationType, index: number) => {
      let f: ValidationFunction
      let message: string

      if (isValidationObject(v)) {
        f = v.f
        message = v.message
      } else {
        f = v
      }

      const result = f(value)
      if (!result) {
        if (!message) {
          message = 'invalid'
        }
        const error = new Error(
          `Cannot set value '${value}' to property '${prop.propertyName}': ${message} (validate.${index})`
        )
        if (aggregate) {
          errors.push(error)
        } else {
          throw error
        }
      }
    })

    if (errors.length > 0) {
      throw new Error(errors.map(e => e.message).join(', '))
    }
  }
}
