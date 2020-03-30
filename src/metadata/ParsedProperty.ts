import 'reflect-metadata'
import { PropertyTypeError } from '../error/PropertyTypeError'
import { ValidationError } from '../error/ValidationError'
import { ParsedOptions } from './Parsed'
import { isValidateObject, isValidateType, ValidateFunction, ValidateOptions, ValidateType } from './Validation'

const booleanValues = Object.freeze({
  true: ['TRUE', 'Y', 'YES', 'T', '1'],
  false: ['FALSE', 'N', 'NO', 'F', '0']
})

export class ParsedProperty {
  type: any
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

  set = (target: any, value: any): void => {
    const { map, validate } = this.options
    if (map && typeof value === 'string') {
      value = map(value as string)
    }

    let ok = true

    if (!this.type) {
      this.type = Reflect.getMetadata('design:type', target, this.name)
    }

    if (!(value instanceof this.type || value.constructor === this.type)) {
      if (typeof value === 'string') {
        if (this.type === Number) {
          const num = parseFloat(value.replace(',', ''))
          if (!isNaN(num)) {
            value = num
          } else {
            ok = false
          }
        } else if (this.type === Boolean) {
          if (booleanValues.true.includes(value.toUpperCase())) {
            value = true
          } else if (booleanValues.false.includes(value.toUpperCase())) {
            value = false
          } else {
            ok = false
          }
        }
      } else {
        ok = false
      }
    }

    if (validate) {
      this.validate(value, validate as ValidateOptions)
    }

    if (!ok || !Reflect.set(target, this.name, value)) {
      throw new PropertyTypeError(target, this, value)
    }
  }

  private validate = (value: any, options: ValidateOptions): void => {
    const { aggregate, functions } = options
    const errors: string[] = []

    functions.forEach((v: ValidateType, index: number) => {
      let f: ValidateFunction
      let message: string

      if (isValidateObject(v)) {
        f = v.function
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
          throw new ValidationError(this, value, message)
        }
      }
    })

    if (errors.length > 0) {
      throw new ValidationError(this, value, ...errors)
    }
  }
}
