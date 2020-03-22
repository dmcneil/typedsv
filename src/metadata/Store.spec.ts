import { NotParsableError } from '../error/NotParsableError'
import { getStore } from './Store'

describe('Store', () => {
  it('should throw an error if a type is not registered', () => {
    class Foo {}

    expect(() => getStore().getParsed(Foo)).toThrowError(new NotParsableError(Foo))
  })
})
