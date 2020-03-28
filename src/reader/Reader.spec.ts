import { createReadStream } from 'fs'
import { Reader } from './Reader'

describe('Reader', () => {
  it('should skip comment lines', async () => {
    const data = `
# comment
1,A,123,"B","Foo" # inline comment
# another comment
2,B,321,"C","Bar"
`
    const reader = new Reader()
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: [],
      rows: [
        ['1', 'A', '123', 'B', 'Foo'],
        ['2', 'B', '321', 'C', 'Bar']
      ]
    })
  })

  it('should allow delimiters in quoted fields', async () => {
    const data = `1,A,123,"B","Fo,o"`

    const reader = new Reader({ quote: '"', delimiter: ',' })
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: [],
      rows: [['1', 'A', '123', 'B', 'Fo,o']]
    })
  })

  it('should read the first row as headers if header: true', async () => {
    const data = `
A,B,C,D,E
1,A,123,"B","Fo,o"
`
    const reader = new Reader({ header: true })
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: ['A', 'B', 'C', 'D', 'E'],
      rows: [{ A: '1', B: 'A', C: '123', D: 'B', E: 'Fo,o' }]
    })
  })

  it('should allow transforming headers', async () => {
    const data = `
A,B,C,D,E
1,A,123,"B","Fo,o"
`
    const reader = new Reader({
      header: true,
      transformHeaders: (headers: string[]) => headers.map((header: string) => `${header}${header}`)
    })
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: ['AA', 'BB', 'CC', 'DD', 'EE'],
      rows: [{ AA: '1', BB: 'A', CC: '123', DD: 'B', EE: 'Fo,o' }]
    })
  })

  it('should allow a custom quote', async () => {
    const data = `
~A~,~B~,~C~,~D~,~E~
1,A,123,~B~,~Fo,o~
`
    const reader = new Reader({ header: true, quote: '~' })
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: ['A', 'B', 'C', 'D', 'E'],
      rows: [{ A: '1', B: 'A', C: '123', D: 'B', E: 'Fo,o' }]
    })
  })

  it('should allow a literal quote character to be unescaped when using a custom quote', async () => {
    const data = `1,A,123,~B~,~Fo"o~`
    const reader = new Reader({ quote: '~' })
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: [],
      rows: [['1', 'A', '123', 'B', 'Fo"o']]
    })
  })

  it('should set the escape character to the custom quote character if not specified', async () => {
    const data = `
1,A,123,~B~,~"~
1,A,123,~B~,~~~~
`
    const reader = new Reader({ quote: '~' })
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: [],
      rows: [
        ['1', 'A', '123', 'B', '"'],
        ['1', 'A', '123', 'B', '~']
      ]
    })
  })

  it('should allow a custom delimiter', async () => {
    const data = `1|A|123|"B"|"Fo,o"`
    const reader = new Reader({ delimiter: '|' })
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: [],
      rows: [['1', 'A', '123', 'B', 'Fo,o']]
    })
  })

  it('should allow a literal comma character to be unescaped when using a custom delimiter', async () => {
    const data = `1|A|123|"B"|Fo,o`
    const reader = new Reader({ delimiter: '|' })
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: [],
      rows: [['1', 'A', '123', 'B', 'Fo,o']]
    })
  })

  it('should allow \\r and \\n in quoted fields', async () => {
    const data = `
4,"foo
bar",654,E,Foo
5,A,321,"F\r",Foobar
`
    const reader = new Reader()
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: [],
      rows: [
        ['4', 'foo\nbar', '654', 'E', 'Foo'],
        ['5', 'A', '321', 'F\r', 'Foobar']
      ]
    })
  })

  it('should ignore a trailing delimiter at the end of a line', async () => {
    const data = `
1,A,123,"B","Fo,o",
2,B,321,"C","Foo"",bar",
3,"C",456,D,Foobar,
4,"foo
bar",654,E,Foo,
"5""",A,321,"F",Foobar,
`
    const reader = new Reader()
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: [],
      rows: [
        ['1', 'A', '123', 'B', 'Fo,o'],
        ['2', 'B', '321', 'C', 'Foo",bar'],
        ['3', 'C', '456', 'D', 'Foobar'],
        ['4', 'foo\nbar', '654', 'E', 'Foo'],
        ['5"', 'A', '321', 'F', 'Foobar']
      ]
    })
  })

  it('should escape a quote if there are two consecutive quotes within a quoted field', async () => {
    const data = `1,A,123,"""B""","Fo,o"`
    const reader = new Reader()
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: [],
      rows: [['1', 'A', '123', '"B"', 'Fo,o']]
    })
  })

  it('should allow two or more consecutive quotes within a non-quoted field', async () => {
    const data = `1,A,123,B"""B,"Fo,o"`
    const reader = new Reader()
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: [],
      rows: [['1', 'A', '123', 'B"""B', 'Fo,o']]
    })
  })

  it('should allow unescaped quotes in non-quoted fields', async () => {
    const data = `
1,A,123,"B",Fo"o
2,B,321,"C",Foo"bar
`
    const reader = new Reader()
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: [],
      rows: [
        ['1', 'A', '123', 'B', 'Fo"o'],
        ['2', 'B', '321', 'C', 'Foo"bar']
      ]
    })
  })

  it('should allow an escape character that is different from the quote', async () => {
    const data = `1,A,123,"~"B~"","Fo,o"`
    const reader = new Reader({ escape: '~' })
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: [],
      rows: [['1', 'A', '123', '"B"', 'Fo,o']]
    })
  })

  it('should allow empty cells', async () => {
    const data = `
1,A,123,"",Fo"o,""
2,B,321,,,,Foo"bar
`
    const reader = new Reader()
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: [],
      rows: [
        ['1', 'A', '123', '', 'Fo"o', ''],
        ['2', 'B', '321', '', '', '', 'Foo"bar']
      ]
    })
  })

  describe('inputs', () => {
    it('should accept a stream', async () => {
      const stream = createReadStream('./src/parser/fixtures/basic.csv')
      const reader = new Reader({ header: true })
      const lines = await reader.read(stream)

      expect(lines).toEqual({
        headers: ['ID', 'FirstName', 'LastName'],
        rows: [
          { ID: '1', FirstName: 'John', LastName: 'Doe' },
          { ID: '2', FirstName: 'Jane', LastName: 'Doe' },
          { ID: '3', FirstName: 'Matt', LastName: 'Smi\nth' },
          { ID: '4', FirstName: 'Jessica', LastName: 'Jones' }
        ]
      })
    })

    it('should destroy a stream early when using a range with an end line', async () => {
      const stream = createReadStream('./src/parser/fixtures/basic.csv', { highWaterMark: 1 })
      const reader = new Reader({ header: true, range: [1, 4] })
      const lines = await reader.read(stream)

      expect(lines).toEqual({
        headers: ['ID', 'FirstName', 'LastName'],
        rows: [
          { ID: '1', FirstName: 'John', LastName: 'Doe' },
          { ID: '2', FirstName: 'Jane', LastName: 'Doe' }
        ]
      })
    })
  })

  describe('strict', () => {
    it('should throw an error if there is a trailing delimiter', () => {
      const data = `
1,A,123,"B","Fo,o",
2,B,321,"C","Foo"",bar",
`
      const reader = new Reader({ strict: true })

      expect(() => reader.read(data)).toThrowError(new Error('Trailing delimiter found at the end of line 1'))
    })

    describe('header: true', () => {
      it('should throw an error if there are less columns in a row', () => {
        const data = `
A,B,C,D,E
1,A,123,"B","Fo,o"
2,B,321
`
        const reader = new Reader({ strict: true, header: true })

        expect(() => reader.read(data)).toThrowError(new Error('Line 3 has 3 columns but 5 were expected'))
      })

      it('should throw an error if there are more columns in a row', () => {
        const data = `
A,B,C,D,E
1,A,123,"B",""
2,B,321,"C",Foobar,FOO
`
        const reader = new Reader({ strict: true, header: true })

        expect(() => reader.read(data)).toThrowError(new Error('Line 3 has 6 columns but 5 were expected'))
      })
    })
  })

  describe('header: false', () => {
    it('should throw an error if there are less columns in a row', () => {
      const data = `
1,A,123,"B","Fo,o"
2,B,321
`
      const reader = new Reader({ strict: true, header: false })

      expect(() => reader.read(data)).toThrowError(new Error('Line 2 has 3 columns but 5 were expected'))
    })

    it('should throw an error if there are more columns in a row', () => {
      const data = `
1,A,123,"B",""
2,B,321,"C",Foobar,FOO
`
      const reader = new Reader({ strict: true, header: false })

      expect(() => reader.read(data)).toThrowError(new Error('Line 2 has 6 columns but 5 were expected'))
    })
  })

  describe('range', () => {
    describe('object', () => {
      it('should start at { start: n }', async () => {
        const data = `
1,A,123
2,B,456
3,C,789
`
        const reader = new Reader({ range: { start: 2 } })
        const got = await reader.read(data)

        expect(got).toEqual({
          headers: [],
          rows: [
            ['2', 'B', '456'],
            ['3', 'C', '789']
          ]
        })
      })

      it('should end at { end: n }', async () => {
        const data = `
1,A,123
2,B,456
3,C,789
`
        const reader = new Reader({ range: { end: 3 } })
        const got = await reader.read(data)

        expect(got).toEqual({
          headers: [],
          rows: [
            ['1', 'A', '123'],
            ['2', 'B', '456']
          ]
        })
      })

      it('should range between { start: n, end: n }', async () => {
        const data = `
1,A,123
2,B,456
3,C,789
4,D,987
5,E,654
`
        const reader = new Reader({ range: { start: 1, end: 4 } })
        const got = await reader.read(data)

        expect(got).toEqual({
          headers: [],
          rows: [
            ['1', 'A', '123'],
            ['2', 'B', '456'],
            ['3', 'C', '789']
          ]
        })
      })
    })

    describe('array', () => {
      it('should start at [n,]', async () => {
        const data = `
1,A,123
2,B,456
3,C,789
`
        const reader = new Reader({ range: [2] })
        const got = await reader.read(data)

        expect(got).toEqual({
          headers: [],
          rows: [
            ['2', 'B', '456'],
            ['3', 'C', '789']
          ]
        })
      })

      it('should end exclusively at [,n]', async () => {
        const data = `
1,A,123
2,B,456
3,C,789
`
        const reader = new Reader({ range: [, 3] })
        const got = await reader.read(data)

        expect(got).toEqual({
          headers: [],
          rows: [
            ['1', 'A', '123'],
            ['2', 'B', '456']
          ]
        })
      })

      it('should range between [n,n]', async () => {
        const data = `
1,A,123
2,B,456
3,C,789
4,D,987
5,E,654
`
        const reader = new Reader({ range: [1, 4] })
        const got = await reader.read(data)

        expect(got).toEqual({
          headers: [],
          rows: [
            ['1', 'A', '123'],
            ['2', 'B', '456'],
            ['3', 'C', '789']
          ]
        })
      })
    })
  })
})
