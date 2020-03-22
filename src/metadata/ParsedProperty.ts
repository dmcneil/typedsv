import 'reflect-metadata'
import { InvalidPropertyTypeError } from '../error/InvalidPropertyTypeError'
import { ValidateError } from '../error/ValidateError'
import { ParsedOptions } from './Parsed'
import { isValidateObject, isValidateType, ValidateFunction, ValidateOptions, ValidateType } from './Validation'

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

    let { validate } = this.options
    if (validate) {
      if (validate instanceof Array) {
        validate = { functions: validate }
      } else if (isValidateType(validate)) {
        validate = { functions: [validate] }
      }
      this.options.validate = validate as ValidateOptions
    }
  }

  set = (target: any, dv: any): void => {
    const { transform, validate } = this.options
    if (transform && typeof dv === 'string') {
      dv = transform(dv as string)
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

    if (validate) {
      this.validate(dv, validate as ValidateOptions)
    }

    if (!ok || !Reflect.set(target, this.name, dv)) {
      throw new InvalidPropertyTypeError(targetType, this, dv)
    }
  }

  private validate = (value: any, options: ValidateOptions): void => {
    const { aggregate, functions } = options
    const errors: string[] = []

    functions.forEach((v: ValidateType, index: number) => {
      let f: ValidateFunction
      let message: string

      if (isValidateObject(v)) {
        f = v.f
        message = v.message
      } else {
        f = v
      }

      if (!message) {
        message = `validate.${index}`
      }

      const result = f(value)
      if (!result) {
        if (aggregate) {
          errors.push(message)
        } else {
          throw new ValidateError(this, value, message)
        }
      }
    })

    if (errors.length > 0) {
      throw new ValidateError(this, value, ...errors)
    }
  }
}
