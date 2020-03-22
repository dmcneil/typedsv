/* tslint:disable:max-classes-per-file */
import { ValidateError } from '../error/ValidateError'
import Parsed from './Parsed'
import { ParsedProperty } from './ParsedProperty'

describe('ParsedProperty', () => {
  describe('set', () => {
    describe('property types', () => {
      it('should convert number-like values', async () => {
        type test = { input: string; expected: number }

        const tests: test[] = [
          { input: '1', expected: 1 },
          { input: '3.14', expected: 3.14 },
          { input: '3,000.14', expected: 3000.14 }
        ]

        class Data {
          @Parsed(0)
          got: number
        }

        const data = new Data()
        const parsedProperty = new ParsedProperty('got')

        tests.forEach((t: test) => {
          parsedProperty.set(data, t.input)
          expect(data.got).toEqual(t.expected)
        })
      })

      it('should convert boolean-like values', async () => {
        type test = { input: string; expected: boolean }

        const tests: test[] = [
          { input: 'true', expected: true },
          { input: 'TRUE', expected: true },
          { input: 't', expected: true },
          { input: 'T', expected: true },
          { input: '1', expected: true },
          { input: 'y', expected: true },
          { input: 'Y', expected: true },
          { input: 'Y', expected: true },
          { input: 'yes', expected: true },
          { input: 'YES', expected: true },
          { input: 'false', expected: false },
          { input: 'FALSE', expected: false },
          { input: 'f', expected: false },
          { input: 'F', expected: false },
          { input: '0', expected: false },
          { input: 'n', expected: false },
          { input: 'N', expected: false },
          { input: 'no', expected: false },
          { input: 'NO', expected: false }
        ]

        class Data {
          @Parsed(0)
          got: boolean
        }

        const data = new Data()
        const parsedProperty = new ParsedProperty('got')

        tests.forEach((t: test) => {
          parsedProperty.set(data, t.input)
          expect(data.got).toEqual(t.expected)
        })
      })
    })
  })

  describe('validate', () => {
    it('should accept a function', async () => {
      class Data {
        @Parsed({
          index: 0
        })
        got: string
      }

      const data = new Data()
      const parsedProperty = new ParsedProperty('got', { validate: input => input.startsWith('F') })

      expect(() => parsedProperty.set(data, 'foo')).toThrowError(new ValidateError(parsedProperty, 'foo', 'validate.0'))
    })

    it('should throw the first error from an array of functions', async () => {
      class Data {
        @Parsed({
          index: 0
        })
        got: string
      }

      const data = new Data()
      const parsedProperty = new ParsedProperty('got', {
        validate: [
          input => input.length === 3,
          input => input.startsWith('F'),
          { message: 'length must be 1', f: input => input.length === 1 }
        ]
      })

      expect(() => parsedProperty.set(data, 'foo')).toThrowError(new ValidateError(parsedProperty, 'foo', 'validate.1'))
    })

    describe('aggregate', () => {
      it('should throw the first error when false', async () => {
        class Data {
          @Parsed({
            index: 0
          })
          got: string
        }

        const data = new Data()
        const property = new ParsedProperty('got', {
          validate: {
            aggregate: false,
            functions: [
              input => input.length === 3,
              input => input.startsWith('F'),
              { message: 'length must be 1', f: input => input.length === 1 }
            ]
          }
        })

        expect(() => property.set(data, 'foo')).toThrowError(new ValidateError(property, 'foo', 'validate.1'))
      })

      it('should combine errors when true', async () => {
        class Data {
          @Parsed({
            index: 0
          })
          got: string
        }

        const data = new Data()
        const parsedProperty = new ParsedProperty('got', {
          validate: {
            aggregate: true,
            functions: [
              input => input.length === 3,
              input => input.startsWith('F'),
              { message: 'length must be 1', f: input => input.length === 1 }
            ]
          }
        })

        expect(() => parsedProperty.set(data, 'foo')).toThrowError(
          new ValidateError(parsedProperty, 1, 'validate.1', 'length must be 1')
        )
      })
    })
  })
})
