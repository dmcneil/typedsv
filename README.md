<div align="center" style="margin-top: 0.5em">
	<img src="logo.png" alt="typedsv">
  <div><i>Parse and map delimiter-separated values to your objects!</i></div>
</div>

## Table of Contents

- [Installation](#installation)
- [Getting Started](#getting-started)
- [Parser](#parser)
  - [Reading Data](#reading-data)
    - [Delimiter](#delimiter)
    - [Quotes](#quotes)
    - [Headers](#headers)
- [@Parsed](#parsed)
  - [Mapping by Index](#mapping-by-index)
  - [Mapping by Header](#mapping-by-header)
  - [Notes on Property Types](#notes-on-property-types)
  - [Additional Options](#additional-options)
    - [Transform](#transform)
    - [Validate](#validate)

## Installation

```
# npm
npm install typedsv

# yarn
yarn add typedsv
```

## Getting Started

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

import { Parsed } from 'typedsv'

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
import { Parser } from 'typedsv'
import Example from './Example'

const parser = new Parser(Example)

parser.parse(createReadStream('./example.csv')).then((examples: Example[]) => console.log(examples))
```

Output:

```
Example[
  Example{one: 'Foo', two: 123, three: 'foo'},
  Example{one: 'Bar', two: 321, three: 'bar'},
  Example{one: 'Baz', two: 456, three: 'baz'}
]
```

## Parser

The `Parser` constructor expects a type/class that has at least one property with a valid `@Parsed` decorator.

```typescript
export default class Example {
  @Parsed(0)
  one: string
}

const parser = new Parser(Example)
```

An error will be thrown when attempting to create a `Parser` with a type that does not have any decorated properties.

### Reading Data

The first argument of `Parser#parse` expects one of the following:

- `string`  
  A complete, delimited input.
  ```typescript
  const input = `
  "1","John","Doe"
  "2","Jane","Doe"
  "3","Matt","Smith"
  `
  ```
- `Buffer`
  ```typescript
  const input = Buffer.from(`
  "1","John","Doe"
  "2","Jane","Doe"
  "3","Matt","Smith"
  `)
  ```
- `Readable`  
  Typically, something like a `ReadStream`.
  ```typescript
  const input = createReadStream('/tmp/data.csv')
  ```

The input is assumed to be formatted where each line is considered a single record. A line is then separated by a delimiter to represent a column/field value. Most of the examples in this document make use of the common CSV (comma-separated value) format:

```
"1","John","Doe"
"2","Jane","Doe"
"3","Matt","Smith"
...
```

While TypeDSV implements [RFC4180](https://tools.ietf.org/html/rfc4180) , the `Parser` accepts a variety of options to accomodate data that may not follow that of a typical CSV.

#### Delimiter

The default delimiter/separator is `,` (comma):

```
"1","John","Doe"
```

This can be changed using the `{ delimiter: string }` option:

```typescript
const input = '"1"|"John"|"Doe"'
parser.parse(input, { delimiter: '|' })
```

#### Quotes

The default quote character is `"` (double quote):

```
"1","John","Doe"
```

This can be changed using the `{ quote: string }` option:

```typescript
const input = '~1~,~John~,~Doe~'
parser.parse(input, { quote: '~' })
```

Values do not have to be wrapped in quote characters although there are some exceptions as listed below:

```
"1","John","Doe"          # OK
2,Jane,Doe                # OK
3,"Matt",Smith            # OK
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

#### Headers

If the first line of the input declares the value/field names then use the `{ header: true }` option.

```
"ID","FirstName","LastName"
"1","John","Doe"
```

```typescript
parser.parse(input, { header: true })
```

This option also enables the ability to map properties by the headers instead of by index as described in [Header-based Mapping](#header-based-mapping).

#### Comments

Lines that begin with the comment character (default: `#`) are skipped:

```
"ID","FirstName","LastName"
"1","John","Doe"
# this comment will be skipped
"2","Jane","Doe"
"3","Matt","Smith"
```

If a line ends with an inline comment, the line is parsed up until the comment:

```
"ID","FirstName","LastName"
"1","John","Doe"
"2","Jane","Doe" # this line is parsed up to this comment
"3","Matt","Smith"
```

#### Line Range

The `{ range: [number?, number?] }` option can be used to set the start line:

```
1,"John","Doe"
2,"Jane","Doe"
3,"Matt","Smith"
4,"Megan","Smith"
```

```typescript
parser.parse(input, { range: [2] })
```

```
[
  ['2', 'Jane', 'Doe'],
  ['3', 'Matt', 'Smith'],
  ['4', 'Megan', 'Smith']
]
```

Set the end line:

> **NOTE** the ending line is _exclusive_!

```
1,"John","Doe"
2,"Jane","Doe"
3,"Matt","Smith"
4,"Megan","Smith"
```

```typescript
parser.parse(input, { range: [, 3] }) // remember to include the comma!
```

```
[
  ['1', 'John', 'Doe'],
  ['2', 'Jane', 'Doe']
]
```

Or parse a range of lines:

```
1,"John","Doe"
2,"Jane","Doe"
3,"Matt","Smith"
4,"Megan","Smith"
```

```typescript
parser.parse(input, { range: [2, 4] })
```

```
[
  ['2', 'Jane', 'Doe'],
  ['3', 'Matt', 'Smith']
]
```

## @Parsed

The `@Parsed` decorator dictates how the `Parser` should maps values to properties within a class.

### Mapping by Index

Pass an integer `number` or `{ index: number }` to specify which column to map based on its index:

```typescript
// "foo","bar",...

@Parsed(0)
first: string // 'foo'

@Parsed({ index: 1 })
second: string // 'bar'
```

### Mapping by Header

Pass a `string` or `{ header: string }` to specify which column to map based on its header. It is required that `{ header: true }` is used when calling `Parser#parse` and the header is on the first line of the input:

```typescript
// A,B,C
// "foo","bar","baz

@Parsed('A')
first: string // 'foo'

@Parsed({ header: 'B' })
second: string // 'bar'

// ...

parser.parse(..., { header: true } // REQUIRED!
```

### Notes on Property Types

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
  Valid `true` values: `['TRUE', 'Y', 'YES', 'T', '1']`  
  Valid `false` values: `['FALSE', 'N', 'NO', 'F', '0']`

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

#### Validate

Value validation can be performed before the property is set by using the `validate` option.

The option accepts a few different value types but the main idea is that the function(s) take the form `(input) => bool` where a return value of `true` means the value is valid.

> **NOTE** the `validate` functions are called _after_ the optional `transform` function.

```typescript
// 0,"John","Doe"

@Parsed({
  index: 0,
  validate: (id: number) => id > 0
})
id: number

// Validation failed for property id: ['validate.0']
```

The default error message just takes the form of `validate.${index}` where `index` is the position of the validation function that failed. To provide a custom message use the `object` form with the `message` option:

```typescript
// 0,"John","Doe"

@Parsed({
  index: 0,
  validate: { message: 'id must be > 0', function: (id: number) => id > 0 }
})
id: number;

// Validation failed for property id: ['id must be > 0']
```

Multiple objects/functions can also be passed as in an array. They are executed in order until either all pass or there is an error:

```typescript
// 1,"John","Doe"

@Parsed({
  index: 0,
  validate: [
    (id: number) => id > 0,
    (id: number) => id > 50,
    { message: 'id cannot be 1', function: (id: number) => id !== 1 } // will not run
  ]
})
id: number;

// Validation failed for property id: ['validate.1']
```

In case you want to collect all validation errors, use the `object` form with the `aggregate` and `functions` options:

```typescript
// 1,"John","Doe"

@Parsed({
  index: 0,
  validate: {
    aggregate: true,
    functions: [
      (id: number) => id > 50,
      { message: 'id must be > 100', function: (id: number) => id > 100 },
      (id: number) => id !== 0  // will still run even though the validation has failed
    ]
  }
})
id: number;

// Validation failed for property id: ['validate.0', 'id must be > 100']
```
