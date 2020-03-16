# Type*SV
## Install
npm
```
npm install typestarsv
```
yarn
```
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
  .then((examples: Example[]) => {
    examples.forEach(e => {
      console.log(`one=${e.one} two=${e.two} three=${e.three}`)   
    })
  })
```
Output:
```
$ ts-node ./main.ts
one=Foo two=123 three=foo
one=Bar two=321 three=bar
one=Baz two=456 three=baz
```
