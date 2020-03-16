import { Reader } from './Reader'

describe('Reader', () => {
  it('should allow delimiters in quoted fields', async () => {
    const data = `1,A,123,"B","Fo,o"`

    const reader = new Reader({ quote: '"', delimiter: ',' })
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: null,
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
      headers: null,
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
      headers: null,
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
      headers: null,
      rows: [['1', 'A', '123', 'B', 'Fo,o']]
    })
  })

  it('should allow a literal comma character to be unescaped when using a custom delimiter', async () => {
    const data = `1|A|123|"B"|Fo,o`
    const reader = new Reader({ delimiter: '|' })
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: null,
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
      headers: null,
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
      headers: null,
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
      headers: null,
      rows: [['1', 'A', '123', '"B"', 'Fo,o']]
    })
  })

  it('should allow two or more consecutive quotes within a non-quoted field', async () => {
    const data = `1,A,123,B"""B,"Fo,o"`
    const reader = new Reader()
    const lines = await reader.read(data)

    expect(lines).toEqual({
      headers: null,
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
      headers: null,
      rows: [
        ['1', 'A', '123', 'B', 'Fo"o'],
        ['2', 'B', '321', 'C', 'Foo"bar']
      ]
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
    it('should not throw an error if there are less columns in a row', () => {
      const data = `
1,A,123,"B","Fo,o"
2,B,321
`
      const reader = new Reader({ strict: true, header: false })

      expect(() => reader.read(data)).not.toThrow()
    })

    it('should not throw an error if there are more columns in a row', () => {
      const data = `
1,A,123,"B",""
2,B,321,"C",Foobar,FOO
`
      const reader = new Reader({ strict: true, header: false })

      expect(() => reader.read(data)).not.toThrow()
    })
  })
})