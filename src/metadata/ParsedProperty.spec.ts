/* tslint:disable:max-classes-per-file */
import { Parser } from '..'
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
      const data = `foo`

      class Data {
        @Parsed({
          index: 0,
          validate: input => input.startsWith('F')
        })
        a: string
      }

      const parser = new Parser(Data)
      await expect(parser.parse(data)).rejects.toThrowError(
        new Error('Cannot set value \'foo\' to property \'a\': invalid (validate.0)')
      )
    })

    it('should throw the first error from an array of functions', async () => {
      const data = `foo`

      class Data {
        @Parsed({
          index: 0,
          validate: [
            input => input.length === 3,
            input => input.startsWith('F'),
            { message: 'length must be 1', f: input => input.length === 1 }
          ]
        })
        a: string
      }

      const parser = new Parser(Data)
      await expect(parser.parse(data)).rejects.toThrowError(
        new Error('Cannot set value \'foo\' to property \'a\': invalid (validate.1)')
      )
    })

    describe('aggregate', () => {
      it('should throw the first error when false', async () => {
        const data = `foo`

        class Data {
          @Parsed({
            index: 0,
            validate: {
              aggregate: false,
              functions: [
                input => input.length === 3,
                input => input.startsWith('F'),
                { message: 'length must be 1', f: input => input.length === 1 }
              ]
            }
          })
          a: string
        }

        const parser = new Parser(Data)
        await expect(parser.parse(data)).rejects.toThrowError(
          new Error('Cannot set value \'foo\' to property \'a\': invalid (validate.1)')
        )
      })

      it('should combine errors when true', async () => {
        const data = `foo`

        class Data {
          @Parsed({
            index: 0,
            validate: {
              aggregate: true,
              functions: [
                input => input.length === 3,
                input => input.startsWith('F'),
                { message: 'length must be 1', f: input => input.length === 1 }
              ]
            }
          })
          a: string
        }

        const parser = new Parser(Data)
        await expect(parser.parse(data)).rejects.toThrowError(
          new Error(
            'Cannot set value \'foo\' to property \'a\': invalid (validate.1), ' +
            'Cannot set value \'foo\' to property \'a\': length must be 1 (validate.2)'
          )
        )
      })
    })
  })
})
