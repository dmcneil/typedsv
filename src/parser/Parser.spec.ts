/* tslint:disable:max-classes-per-file */
import 'reflect-metadata'
import Parsed from '../metadata/Parsed'
import { Parser } from './Parser'

describe('Parser', () => {
  it('should parse using index if header: false', async () => {
    const data = `
"A",123,"B",Foo
"B",321,"C",Bar
"C",456,"D",Baz
`

    class Data {
      @Parsed(0)
      a: string

      @Parsed(1)
      b: number

      @Parsed({ index: 2 })
      c: string

      @Parsed({ index: 3 })
      d: string
    }

    const parser = new Parser(Data)
    const got = await parser.parse(data.trim())

    expect(got).toHaveLength(3)
    expect(got).toEqual([
      { a: 'A', b: 123, c: 'B', d: 'Foo' },
      { a: 'B', b: 321, c: 'C', d: 'Bar' },
      { a: 'C', b: 456, c: 'D', d: 'Baz' }
    ])
  })

  it('should parse using header if header: true', async () => {
    const data = `
A,B,C,D
"A",123,"B",Foo
"B",321,"C",Bar
"C",456,"D",Baz
`

    class Data {
      @Parsed('A')
      a: string

      @Parsed('B')
      b: number

      @Parsed({ header: 'C' })
      c: string

      @Parsed({ header: 'D' })
      d: string
    }

    const parser = new Parser(Data)
    const got = await parser.parse(data.trim(), { header: true })

    expect(got).toHaveLength(3)
    expect(got).toEqual([
      { a: 'A', b: 123, c: 'B', d: 'Foo' },
      { a: 'B', b: 321, c: 'C', d: 'Bar' },
      { a: 'C', b: 456, c: 'D', d: 'Baz' }
    ])
  })

  it('should parse using either index or header if both are possible', async () => {
    const data = `
A,B
"A",123
"B",321
"C",456
`

    class Data {
      @Parsed('A')
      a: string

      @Parsed('B')
      b: number

      @Parsed({ index: 0 })
      a2: string

      @Parsed({ index: 1 })
      b2: number
    }

    const parser = new Parser(Data)
    const got = await parser.parse(data.trim(), { header: true })

    expect(got).toHaveLength(3)
    expect(got).toEqual([
      { a: 'A', b: 123, a2: 'A', b2: 123 },
      { a: 'B', b: 321, a2: 'B', b2: 321 },
      { a: 'C', b: 456, a2: 'C', b2: 456 }
    ])
  })

  describe('property types', () => {
    it('should accept booleans', async () => {
      const data = `
"true","false"
"TRUE","FALSE"
"t","f"
"T","F"
"1","0"
"y","n"
"Y","N"
"YES","NO"
`

      class Data {
        @Parsed(0)
        a: boolean

        @Parsed(1)
        b: boolean
      }

      const parser = new Parser(Data)
      const got = await parser.parse(data)

      expect(got).toEqual([
        { a: true, b: false },
        { a: true, b: false },
        { a: true, b: false },
        { a: true, b: false },
        { a: true, b: false },
        { a: true, b: false },
        { a: true, b: false },
        { a: true, b: false }
      ])
    })
  })

  describe('validate', () => {
    it('should accept just a function', async () => {
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
        new Error("Cannot set value 'foo' to property 'a': invalid (validate.0)")
      )
    })

    it('should throw the first error if an array of functions', async () => {
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
        new Error("Cannot set value 'foo' to property 'a': invalid (validate.1)")
      )
    })

    describe('aggregate', () => {
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
            "Cannot set value 'foo' to property 'a': invalid (validate.1), " +
              "Cannot set value 'foo' to property 'a': length must be 1 (validate.2)"
          )
        )
      })

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
          new Error("Cannot set value 'foo' to property 'a': invalid (validate.1)")
        )
      })
    })
  })
})
