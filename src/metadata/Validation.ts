export type ValidationFunction = (input: any) => boolean

export type ValidationObject = { f: ValidationFunction; message?: string }
export const isValidationObject = (t: any): t is ValidationObject => {
  return 'f' in t && 'message' in t
}

export type ValidateFunction = ValidationFunction | ValidationObject
export const isValidationType = (t: any): t is ValidateFunction => {
  return typeof t === 'function' || isValidationObject(t)
}

export interface ValidateOptions {
  aggregate?: boolean
  functions: ValidateFunction[]
}
