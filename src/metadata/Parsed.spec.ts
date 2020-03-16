/* tslint:disable:max-classes-per-file */
import Parsed from './Parsed'
import { getMetadataStore } from './Store'

describe('Parsed', () => {
  it('should accept a number as index', () => {
    class Foo {
      @Parsed(1)
      a: string
    }

    const args = getMetadataStore().getParsed(Foo)
    expect(args).toHaveLength(1)
    expect(args[0].options.index).toEqual(1)
  })

  it('should accept a string as header', () => {
    class Foo {
      @Parsed('foo')
      a: string
    }

    const args = getMetadataStore().getParsed(Foo)
    expect(args).toHaveLength(1)
    expect(args[0].options.header).toEqual('foo')
  })

  describe('options', () => {
    it('should accept just an index', () => {
      class Foo {
        @Parsed({ index: 1 })
        a: string
      }

      const args = getMetadataStore().getParsed(Foo)
      expect(args).toHaveLength(1)
      expect(args[0].options.index).toEqual(1)
    })

    it('should accept just a header', () => {
      class Foo {
        @Parsed({ header: 'foo' })
        a: string
      }

      const args = getMetadataStore().getParsed(Foo)
      expect(args).toHaveLength(1)
      expect(args[0].options.header).toEqual('foo')
    })

    it('should accept both an index and a header', () => {
      class Foo {
        @Parsed({ index: 1, header: 'foo' })
        a: string
      }

      const args = getMetadataStore().getParsed(Foo)
      expect(args).toHaveLength(1)
      expect(args[0].options.index).toEqual(1)
      expect(args[0].options.header).toEqual('foo')
    })

    it('should throw an error if missing both index and header', () => {
      class Foo {
        a: string
      }

      expect(() => {
        Parsed({})(Foo, 'a')
      }).toThrowError(new EvalError("Parsed property 'a' must have either an index or header option"))
    })
  })
})
