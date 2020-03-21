export type ValidationFunction = (input: any) => boolean

export type ValidationObject = { f: ValidationFunction; message?: string }
export const isValidationObject = (t: any): t is ValidationObject => {
  return 'f' in t && 'message' in t
}

export type ValidationType = ValidationFunction | ValidationObject
export const isValidationType = (t: any): t is ValidationType => {
  return typeof t === 'function' || isValidationObject(t)
}

export interface ValidationOptions {
  aggregate?: boolean
  functions: ValidationType[]
}
