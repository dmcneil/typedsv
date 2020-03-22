import { InvalidPropertyTypeError } from '../error/InvalidPropertyTypeError'
import { ParsedOptions } from './Parsed'
import { isValidationObject, ValidationFunction, ValidateOptions, ValidateFunction } from './Validation'

const booleanValues = Object.freeze({
  true: ['TRUE', 'Y', 'YES', 'T', '1'],
  false: ['FALSE', 'N', 'NO', 'F', '0']
})

export class ParsedProperty {
  readonly name: string
  readonly options: ParsedOptions

  constructor(name: string, options?: ParsedOptions) {
    this.name = name
    this.options = options || {}
  }

  set = (target: any, dv: any): void => {
    const { transform, validate } = this.options
    if (transform && typeof dv === 'string') {
      dv = transform(dv as string)
    }

    if (validate) {
      this.validate(dv, validate as ValidateOptions)
    }

    let ok = true

    const targetType = Reflect.getMetadata('design:type', target, this.name)
    if (!(dv instanceof targetType || dv.constructor === targetType)) {
      if (typeof dv === 'string') {
        if (targetType === Number) {
          const num = parseFloat(dv.replace(',', ''))
          if (!isNaN(num)) {
            dv = num
          } else {
            ok = false
          }
        } else if (targetType === Boolean) {
          if (booleanValues.true.includes(dv.toUpperCase())) {
            dv = true
          } else if (booleanValues.false.includes(dv.toUpperCase())) {
            dv = false
          } else {
            ok = false
          }
        }
      }
    }

    if (!ok || !Reflect.set(target, this.name, dv)) {
      throw new InvalidPropertyTypeError(targetType, this, dv)
    }
  }

  private validate = (value: any, options: ValidateOptions): void => {
    const { aggregate, functions } = options
    const errors: Error[] = []

    functions.forEach((v: ValidateFunction, index: number) => {
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
          `Cannot set value '${value}' to property '${this.name}': ${message} (validate.${index})`
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
