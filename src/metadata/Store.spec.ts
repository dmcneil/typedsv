import { getMetadataStore } from './Store'

describe('Store', () => {
  it('should throw an error if a type is not registered', () => {
    expect(() => getMetadataStore().getParsed(Object)).toThrowError(
      new Error(`Metadata for Object not found. Does it contain any properties decorated with @Parsed?`)
    )
  })
})
