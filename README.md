<div align="center" style="margin-top: 0.5em">
	<img src="logo.png" alt="typedsv">
  <div><i>Parse and map delimiter-separated values to your objects!</i></div>
</div>

## Table of Contents

- [Installation](#installation)
- [Getting Started](#getting-started)
- [Mapping Properties with @Parsed](#mapping-properties-with-parsed)
  - [Mapping by Index](#mapping-by-index)
  - [Mapping by Header](#mapping-by-header)
  - [Mapping by Index and/or Header](#mapping-by-index-andor-header)
  - [A Note on Property Types](#a-note-on-property-types)
  - [Options](#options)
    - [transform](#transform)
    - [validate](#validate)
- [Parser](#parser)
  - [Comments](#comments)
  - [Options](#options-1)
    - [delimiter](#delimiter)
    - [quote](#quote)
    - [header](#header)
    - [range](#range)

## Installation

> **NOTE** TypeScript **3.2+** is required.

Install the package:

```
npm install typedsv --save
```

You may also need to install the `reflect-metadata` library and import it at high level (typically your main entrypoint):

```
npm install reflect-metadata --save
```

```typescript
import 'reflect-metadata'
```

Enable decorator and metadata support in `tsconfig.json`:

```
{
    "compilerOptions": {
        "lib": [
          "es6",
          ...
        ],
        "target": "es5",
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        ...
    }
}
```

## Getting Started

Given delimiter-separated data (`csv`, `tsv`, etc.):

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

## Mapping Properties with @Parsed

The `@Parsed` decorator dictates how the `Parser` should maps values to properties within a class.

### Mapping by Index

Pass an integer `number` or `{ index: number }` to specify which column to map based on its index:

```
"foo","bar"
```

```typescript
class ExampleWithIndex {
  @Parsed(0)
  first: string

  @Parsed({ index: 1 })
  second: string
}

const parser = new Parser(ExampleWithIndex)
parser.parse(...)
```

```
ExampleWithIndex[
  ExampleWithIndex{first: 'foo', second: 'bar'}
]
```

### Mapping by Header

Pass a `string` or `{ header: string }` to specify which column to map based on its header.

> **NOTE** It is required that `{ header: true }` is used when calling `Parser#parse` and the header is on the first line of the input:

```
"A","B"
"foo","bar"
```

```typescript
class ExampleWithHeader {
  @Parsed('A')
  first: string

  @Parsed({ header: 'B' })
  second: string
}

const parser = new Parser(ExampleWithHeader)
parser.parse(input { header: true })
```

```
ExampleWithHeader[
  ExampleWithHeader{first: 'foo', second: 'bar'}
]
```

### Mapping by Index and/or Header

Finally, both the `{ index: number }` and `{ header: string }` options can be used together. The `Parser` will first try to map a property using the declared header then fallback to the index.

```
"A","B","C"
"foo","bar","baz"
```

```typescript
class ExampleWithHeaderAndIndex {
  @Parsed('A')
  first: string

  @Parsed({ header: 'C', index: 1 })
  second: string

  @Parsed(2)
  third: string
}

const parser = new Parser(ExampleWithHeaderAndIndex)
parser.parse(input, { header: true })
```

```
ExampleWithHeaderAndIndex[
  ExampleWithHeaderAndIndex{first: 'foo', second: 'bar', third: 'baz'}
]
```

### A Note on Property Types

While values are first parsed as a `string`, the target property's type is honored so long as the conversion is straightforward. To map something beyond a few primitive types, see the [Transform](#transform) option:

- `number`

  ```
  "123","3.14","ABC"
  ```

  ```typescript
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

  ```
  "true","0","y","F","NONE"
  ```

  ```typescript
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

### Options

> **NOTE** The below options require that the `{ index: number | header: string }` argument form detailed above is used.

#### transform

Type: `(input: string) => any`

Modify the input value before it is mapped to the property:

```
"foo","F,O,O",1
"bar","B,A,R",2
"baz","B,A,Z",3
```

```typescript
class ExampleWithTransform {
  @Parsed({
    index: 0,
    transform: (input: string) => input.toUpperCase()
  })
  first: string

  @Parsed({
    index: 1,
    transform: (input: string) => input.split(',')
  })
  second: string[]

  @Parsed({
    index: 2,
    transform: (input: string) => {
      const n = parseInt(input)
      return n * n
    }
  })
  third: number
}

const parser = new Parser(ExampleWithTransform)
parser.parse(...)
```

```
ExampleWithTransform[
  ExampleWithTransform{first: 'FOO', second: ['F', 'O', 'O'], third: 1},
  ExampleWithTransform{first: 'BAR', second: ['B', 'A', 'R'], third: 4},
  ExampleWithTransform{first: 'BAZ', second: ['B', 'A', 'Z'], third: 9}
]
```

While the function return type is `any`, an error will be thrown if the type is not the same - or cannot be parsed - as the property type as detailed in [A Note on Property Types](#a-note-on-property-types):

```
"foo","B,A,R"
```

```typescript
class ExampleWithBadTransform {
  @Parsed({
    index: 0,
    transform: (input: string) => `${input.length}`
  })
  first: number

  @Parsed({
    index: 1,
    transform: (input: string) => input.split(',')
  })
  second: string
}
```

```
ERROR Cannot set ExampleWithBadTransform.second: Array is not assignable to String
```

#### validate

Type: `(input: any) => boolean | { function: (input: any) => boolean; message?: string } | [...]`

Validation to be performed before the property is set.

The option accepts a few different value types but the main idea is that the function(s) take the form `(input: any) => bool` where a return value of `true` means the value is valid.

> **NOTE** The `validate` functions are called _after_ the optional `transform` function.

```
0,"John","Doe"
```

```typescript
class ExampleWithValidation {
  @Parsed({
    index: 0,
    validate: (id: number) => id > 0
  })
  id: number
}
```

```
ERROR Validation failed for property id: ['validate.0']
```

The default error message just takes the form of `validate.${index}` where `index` is the position of the validation function that failed. To provide a custom message use the `object` form with the `message` option:

```
0,"John","Doe"
```

```typescript
class ExampleWithValidationMessage {
  @Parsed({
    index: 0,
    validate: {
      message: 'id must be > 0',
      function: (id: number) => id > 0
    }
  })
  id: number
}
```

```
ERROR Validation failed for property id: ['id must be > 0']
```

Multiple objects/functions can also be passed as in an array. They are executed in order until either all pass or there is an error:

```
1,"John","Doe"
```

```typescript
class ExampleWithMultipleValidations {
  @Parsed({
    index: 0,
    validate: [
      (id: number) => id > 0,
      (id: number) => id > 50,
      { message: 'id cannot be 1', function: (id: number) => id !== 1 } // will not run
    ]
  })
  id: number
}
```

```
ERROR Validation failed for property id: ['validate.1']
```

In case you want to collect all validation errors, use the `object` form with the `aggregate` and `functions` options:

```
1,"John","Doe"
```

```typescript
class ExampleWithAggregatedValidationErrors {
  @Parsed({
    index: 0,
    validate: {
      aggregate: true,
      functions: [
        (id: number) => id > 50,
        { message: 'id must be > 100', function: (id: number) => id > 100 },
        (id: number) => id !== 0 // will still run even though the validation has failed
      ]
    }
  })
  id: number
}
```

```
ERROR Validation failed for property id: ['validate.0', 'id must be > 100']
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
  Typically something like a `ReadStream`.
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

### Options

While TypeDSV implements [RFC4180](https://tools.ietf.org/html/rfc4180), `Parser#parse` accepts a variety of options to accomodate data that may not follow that of a typical CSV.

#### delimiter

Type: `string`  
Default: `,` (comma)

The character that separates values in a row.

```
# default
"1","John","Doe"

# delimiter: |
"1"|"John"|"Doe"

# delimiter: \t
"1" "John"  "Doe"
```

#### quote

Type: `string`  
Default: `"` (double quote)

```
# default
"1","John","Doe"

# quote: ~
~1~,~John~,~Doe~
```

Values do not have to be wrapped in quote characters although there are some exceptions as listed below:

```
"1","John","Doe"          # OK
2,Jane,Doe                # OK
3,"Matt",Smith            # OK
```

Values that contain a carriage return (default: `\r`), new line (default: `\n`), the delimiter (default: `,`), or comment (default: `#`) must be wrapped in the quote character:

```
# OK
1,John,"Do\re"
2,Jane,"Do\ne"
3,Matt,"Smi,th"
4,Megan,"Smi#th"

# NOT OK
1,John,Do\re
2,Jane,Do\ne
3,Matt,Smi,th
4,Megan,Smi#th
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

#### header

Type: `boolean`  
Default: `false`

If the first line of the input declares the value/field names:

```
"ID","FirstName","LastName"
"1","John","Doe"
```

This option also enables the ability to map properties by the headers instead of by index as described in [Mapping by Header](#mapping-by-header).

#### range

Type: `[number?, number?] | { start?: number, end?: number }`  
Default: `{ start: 1 }`

Given the following input:

```
1,"John","Doe"
2,"Jane","Doe"
3,"Matt","Smith"
4,"Megan","Smith"
```

Setting the start line:

```typescript
parser.parse(input, { range: [2] }) // array form
parser.parse(input, { range: { start: 2 } }) // object form
```

```
[
  ['2', 'Jane', 'Doe'],
  ['3', 'Matt', 'Smith'],
  ['4', 'Megan', 'Smith']
]
```

Setting the ending line:

> **NOTE** The ending line argument is _exclusive_.

```typescript
parser.parse(input, { range: [, 3] }) // array form, remember to include the comma!
parser.parse(input, { range: { end: 3 } }) // object form
```

```
[
  ['1', 'John', 'Doe'],
  ['2', 'Jane', 'Doe']
]
```

Parse a range of lines:

```typescript
parser.parse(input, { range: [2, 4] }) // array form
parser.parse(input, { range: { start: 2, end: 4 } }) // object form
```

```
[
  ['2', 'Jane', 'Doe'],
  ['3', 'Matt', 'Smith']
]
```
