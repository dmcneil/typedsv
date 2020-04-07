export type ValidateFunction = (input: any) => boolean

export type ValidateObject = { function: ValidateFunction; message?: string }

export const isValidateObject = (t: any): t is ValidateObject => {
  return 'function' in t && 'message' in t
}

export type ValidateType = ValidateFunction | ValidateObject

export const isValidateType = (t: any): t is ValidateType => {
  return typeof t === 'function' || isValidateObject(t)
}

export interface ValidateOptions {
  aggregate?: boolean
  functions: ValidateType[]
}
