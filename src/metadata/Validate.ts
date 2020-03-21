export type ValidatorFunction = (input: any) => boolean

export type ValidatorObject = { f: ValidatorFunction, message?: string }
export const isValidatorObject = (t: any): t is ValidatorObject => {
  return 'f' in t && 'message' in t
}

export type Validator = ValidatorFunction | ValidatorObject
export const isValidator = (t: any): t is Validator => {
  return t instanceof Function || isValidatorObject(t)
}

export interface ValidateOptions {
  aggregate?: boolean
  functions: Validator[]
}
