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
})
