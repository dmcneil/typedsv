<div align="center" style="margin-top: 0.5em">
	<img src="logo.png" alt="typestarsv">
  <div><i>Parse and map delimiter-separated values (csv, tsv, ...<strong>*</strong>sv) to your objects.</i></div>
</div>

## Install

```
# npm
npm install typestarsv

# yarn
yarn add typestarsv
```

## Basic Usage

Given a delimiter-separated file (`csv`, `tsv`, etc.):

```
# example.csv

"Foo","123","foo"
"Bar","321","bar"
"Baz","456","baz"
```

And a class such as:

```typescript
// Example.ts

import { Parsed } from 'typestarsv'

export default class Example {
  @Parsed(0)
  one: string

  @Parsed(1)
  two: number

  @Parsed(2)
  three: string
}
```

Create a `Parser` for the type and pass the file to the `parse` method:

```typescript
// main.ts

import { createReadStream } from 'fs'
import { Parser } from 'typestarsv'
import Example from './Example'

const parser = new Parser(Example)

parser.parse(createReadStream('./example.csv'))
  .then((examples: Example[]) =>
    examples.forEach(e => console.log(`one=${e.one} two=${e.two} three=${e.three}`))
  })
```

Output:

```
one=Foo two=123 three=foo
one=Bar two=321 three=bar
one=Baz two=456 three=baz
```

## Parser

The `Parser` expects some type of input where each line is considered a single record with the line being separated by a delimiter to represent a column or field value. Most of the examples in this document make use of the common CSV (comma-separated value) format:

```
"1","John","Doe"
"2","Jane","Doe"
"3","Matt","Smith"
"4","Jessica","Jones"
...
```

While the [RFC4180](https://tools.ietf.org/html/rfc4180) standard is followed, the `Parser` is flexible.

Values may or may not be wrapped in quote characters:

```
"1","John","Doe"          # OK
2,Jane,"Doe"              # OK
```

Values that contain a carriage return (default: `\r`), new line (default: `\n`), or the delimiter (default: `,`) must be wrapped in the quote character:

```
# OK
1,John,"Do\re"
2,Jane,"Do\ne"
3,Matt,"Smi,th"

# NOT OK
1,John,Do\re
2,Jane,Do\ne
3,Matt,Smi,th
```

If a quoted value contains the quote character (default: `"`) then it must be escaped by a preceeding quote character:

```
1,John,"said ""Hi!"""     # OK
2,Jane,"said "Hi!""       # NOT OK
```

Non-quoted values can contain the quote character without the escaping:

```
1,John,said "Hi!"         # OK
```

## @Parsed

The `@Parsed` property level decorator dictates how the `Parser` maps values to a class instance.

### By Index

Pass an integer `number` or `{ index: number }` to specify which column to map based on its index:

```typescript
// "foo","bar",...

@Parsed(0)
first: string // 'foo'

@Parsed({ index: 1 })
second: string // 'bar'
```

### By Header

Pass a `string` or `{ header: string }` to specify which column to map based on its header (requires that `{ ..., reader: { header: true }}` is passed to the `Parser#parse` method and the input header is on the first line):

```typescript
// A,B,C
// "foo","bar","baz

@Parsed('A')
first: string // 'foo'

@Parsed({ header: 'B' })
second: string // 'bar'
```

```typescript
const parser = new Parser(...)
parser.parse(..., { reader: { header: true }}
```

### Property Types

While values are first parsed as a `string`, the target property's type is honored so long as the conversion is straightforward. To map something beyond a few primitives, see the [Transform](#transform) option:

- `number`

  ```typescript
  // "123","3.14","ABC",...

  @Parsed(0)
  a: number // OK: 123

  @Parsed(1)
  b: number // OK: 3.14

  @Parsed(2)
  c: number // ERROR: 'ABC' cannot be parsed as a number
  ```

- `boolean`

  ```typescript
  // "true","0","Y","F","NONE",...

  @Parsed(0)
  a: boolean // OK: true

  @Parsed(1)
  b: boolean // OK: false

  @Parsed(2)
  c: boolean // OK: true

  @Parsed(3)
  d: boolean // OK: false

  @Parsed(4)
  e: boolean // ERROR: 'NONE' cannot be parsed as a boolean
  ```

### Additional Options

The below options require that the `{ index: number | header: string }` argument form detailed above is used.

#### Transform

The `transform` option takes a function of the signature `(input: string) => any` which can be used to modify the input value before it is mapped to the property:

```typescript
// "foo","B,A,R",...

@Parsed({ index: 0, transform: (input: string) => input.toUpperCase() })
first: string // -> 'FOO'

@Parsed({ index: 1, transform: (input: string) => input.split(',') })
second: string[] // -> ['B', 'A', 'R']
```

While the return type is `any`, an error will be thrown if the result type is not the same - or cannot be parsed - as the property type as detailed in [Property Types](#property-types):

```typescript
// "foo","B,A,R",...

@Parsed({ index: 0, transform: (input: string) => `${input.length}` })
first: number // OK as '3' will be parsed to 3

@Parsed({ index: 1, transform: (input: string) => input.split(',') })
second: string // ERROR as ['B', 'A', 'R'] is not clearly intentional to be a string.
```
