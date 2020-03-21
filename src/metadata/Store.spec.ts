import { getStore } from './Store'

describe('Store', () => {
  it('should throw an error if a type is not registered', () => {
    class Foo {}

    expect(() => getStore().getParsed(Foo)).toThrowError(
      new Error(`Foo type cannot be parsed. Does it contain any properties decorated with @Parsed?`)
    )
  })
})
