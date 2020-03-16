import { Readable } from 'stream'
import { Input } from './Input'

export interface ReaderOptions {
  strict?: boolean
  header?: boolean
  quote?: string
  escape?: string
  delimiter?: string
  newline?: string
  carriageReturn?: string
}

const DefaultReaderOptions: ReaderOptions = Object.freeze({
  strict: false,
  header: false,
  quote: '"',
  escape: '"',
  delimiter: ',',
  newline: '\n',
  carriageReturn: '\r'
})

export interface ReaderResult {
  headers: string[] | null
  rows: string[][] | object[]
}

export class Reader {
  private readonly strict: boolean

  private readonly header: boolean
  private readonly quote: number
  private readonly escape: number
  private readonly delimiter: number
  private readonly newline: number
  private readonly cr: number

  private escaped: boolean
  private quoted: boolean
  private lineNumber: number = 0
  private headers: string[]

  constructor(options?: ReaderOptions) {
    const opts = Object.assign({}, DefaultReaderOptions)
    if (options) {
      Object.entries(options)
        .filter(([_, value]: [string, any]) => value)
        .forEach(([key, value]: [string, any]) => (opts[key] = value))

      // If the quote character is not the default but the escape character is
      // then the escape character is set to the custom quote character.
      if (options.quote && options.quote !== DefaultReaderOptions.quote && !options.escape) {
        opts.escape = opts.quote
      }
    }

    this.strict = opts.strict
    this.header = opts.header
    this.quote = opts.quote.charCodeAt(0)
    this.escape = opts.escape.charCodeAt(0)
    this.delimiter = opts.delimiter.charCodeAt(0)
    this.newline = opts.newline.charCodeAt(0)
    this.cr = opts.carriageReturn.charCodeAt(0)
  }

  reset() {
    this.escaped = false
    this.quoted = false
    this.lineNumber = 0
    this.headers = null
  }

  read(input: Input): Promise<ReaderResult> {
    let p: Promise<ReaderResult>

    if (input instanceof Readable) {
      p = this.readReadable(input)
    } else {
      if (typeof input === 'string') {
        input = Buffer.from(input.trim())
      }
      p = this.readBuffer(input)
    }

    return p.finally(() => this.reset())
  }

  private readBuffer(input: Buffer): Promise<ReaderResult> {
    const result: ReaderResult = { headers: this.headers || null, rows: [] }

    let expectedColumns: number = this.headers ? this.headers.length : -1
    let row: string[] = []
    let cell: number[] = []

    for (let i = 0; i < input.length; i++) {
      const c = input[i]
      const next = i < input.length - 1 ? input[i + 1] : null
      const eof = next === null

      if (c === this.quote) {
        if (!this.quoted && cell.length === 0) {
          this.quoted = true
          continue
        } else if (this.quoted && c === this.escape && next === this.quote && !this.escaped) {
          this.escaped = true
          continue
        } else if (this.quoted && !this.escaped) {
          this.quoted = false
          if (!eof) {
            continue
          }
        }
      }

      if (c === this.escape && this.quoted && next === this.quote && !this.escaped) {
        this.escaped = true
        continue
      }

      const eol = !this.quoted && ((c === this.cr && next === this.newline) || c === this.newline)

      if ((c === this.delimiter && !this.quoted) || eol || eof) {
        // Make sure we get the last non-quote, non-delimiter character.
        if (eof && c !== this.quote && c !== this.delimiter) {
          cell.push(c)
        }

        // Skip trailing delimiters or, if strict, throw an error.
        if (c === this.delimiter && !this.quoted && (eol || next === this.newline)) {
          if (this.strict) {
            throw new Error(`Trailing delimiter found at the end of line ${this.lineNumber + 1}`)
          }
          continue
        }

        row.push(String.fromCharCode(...cell))
        cell = []

        if (eol || eof) {
          this.lineNumber++
          if (this.header) {
            if (this.lineNumber === 1 && !this.headers) {
              this.headers = row
              expectedColumns = this.headers.length
              result.headers = this.headers
            } else {
              if (this.strict && expectedColumns >= 0 && row.length !== expectedColumns) {
                throw new Error(
                  `Line ${this.lineNumber} has ${row.length} columns but ${expectedColumns} were expected`
                )
              }

              const rows = result.rows as object[]
              const o = {}
              this.headers?.forEach((header: string, index: number) => {
                o[header] = row[index]
              })
              rows.push(o)
            }
          } else {
            result.rows.push(row)
          }

          row = []

          if (c === this.cr && next === this.newline) {
            i++
          }
        }
      } else {
        cell.push(c)
      }

      this.escaped = false
    }

    return Promise.resolve(result)
  }

  private readReadable(input: Readable): Promise<ReaderResult> {
    const result: ReaderResult = { headers: null, rows: [] }

    let next: Buffer = null

    return new Promise<ReaderResult>((resolve, reject) => {
      input
        .on('error', err => reject(err))
        .on('data', async (chunk: any) => {
          let b: Buffer = next !== null ? Buffer.concat([next, chunk]) : chunk

          const lastNewline = b.lastIndexOf(this.newline)
          const lastCR = b.lastIndexOf(this.cr)

          if (lastNewline >= 0) {
            if (lastCR >= 0 && lastCR === lastNewline - 1) {
              next = b.slice(lastCR + 2, b.length)
              b = b.slice(0, lastCR)
            } else {
              // TODO(dmcneil) possible issue here with \n in quoted fields
              next = b.slice(lastNewline + 1, b.length)
              b = b.slice(0, lastNewline)
            }
          } else {
            // If the stream buffer is set really low to where a chunk doesn't
            // contain at least a full line then just keep building the local
            // buffer until a new line is found.
            next = b
            return
          }

          const r = await this.readBuffer(b)
          if (r.headers && !result.headers) {
            result.headers = r.headers
          }
          if (result.rows.length === 0) {
            result.rows = r.rows
          } else {
            result.rows = [...result.rows, ...r.rows]
          }
        })
        .on('end', () => resolve(result))
    })
  }
}
