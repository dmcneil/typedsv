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
  comment?: string
}

const DefaultReaderOptions: ReaderOptions = Object.freeze({
  strict: false,
  header: false,
  quote: '"',
  escape: '"',
  delimiter: ',',
  newline: '\n',
  carriageReturn: '\r',
  comment: '#'
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
  private readonly comment: number

  private escaped: boolean
  private quoted: boolean
  private commented: boolean
  private lineNumber: number

  private expectedColumnCount: number
  private result: ReaderResult

  private readonly space: number = ' '.charCodeAt(0)

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
    this.comment = opts.comment.charCodeAt(0)
  }

  reset() {
    this.escaped = false
    this.quoted = false
    this.commented = false
    this.lineNumber = 0
    this.expectedColumnCount = 0
    this.result = { headers: [], rows: [] }
  }

  read(input: Input): Promise<ReaderResult> {
    this.reset()

    if (input instanceof Readable) {
      return this.readReadable(input)
    } else if (typeof input === 'string') {
      input = Buffer.from(input.trim())
    }

    return this.readBuffer(input)
  }

  private readBuffer(input: Buffer): Promise<ReaderResult> {
    if (input[input.length - 1] !== this.newline) {
      input = Buffer.concat([input, Buffer.alloc(1, '\n')])
    }

    this.readLines(input, this.rowCallback)

    return Promise.resolve(this.result).finally(() => this.reset())
  }

  private readReadable(input: Readable): Promise<ReaderResult> {
    let buffer: Buffer = null

    return new Promise<ReaderResult>((resolve, reject) => {
      input
        .on('error', err => reject(err))
        .on('data', async (chunk: Buffer) => {
          buffer = buffer === null ? chunk : Buffer.concat([buffer, chunk], buffer.length + chunk.length)
          buffer = this.readLines(buffer, this.rowCallback)
        })
        .on('end', () => resolve(this.result))
    })
  }

  private readLines(input: Buffer, cb?: (row: string[]) => void): Buffer {
    let row: string[] = []
    let cell: number[] = []

    this.escaped = false
    this.quoted = false
    this.commented = false

    let read: number = 0

    for (let i = 0; i < input.length; i++) {
      const c: number = input[i]
      const prev: number | null = i > 0 ? input[i - 1] : null
      const next: number | null = i < input.length - 1 ? input[i + 1] : null
      const eol: boolean = (c === this.cr && next === this.newline) || c === this.newline
      const isNextEol: boolean = next === this.newline || (next === this.cr && input[i + 2] === this.newline)

      if (c === this.comment && !this.commented && !this.quoted) {
        this.commented = true
        continue
      }

      if (this.commented) {
        if (eol) {
          this.commented = false
        } else {
          continue
        }
      }

      if (c === this.quote) {
        if (!this.quoted && cell.length === 0) {
          this.quoted = true
          continue
        }

        // Escape the next iteration if currently quoted and the escape character is the same
        // as the quote character.
        if (this.quoted && c === this.escape && next === this.quote && !this.escaped) {
          this.escaped = true
          continue
        }

        if (this.quoted && !this.escaped) {
          this.quoted = false

          // Properly quoted but empty at EOL is OK.
          if ((eol || isNextEol) && cell.length === 0) {
            row.push('')
          }

          continue
        }
      }

      if (c === this.space && !this.quoted && (prev === this.quote || next === this.quote)) {
        continue
      }

      if (c === this.escape && this.quoted && next === this.quote && !this.escaped) {
        this.escaped = true
        continue
      }

      if (!this.quoted) {
        if (c === this.delimiter) {
          if (this.strict && (next === this.cr || next === this.newline)) {
            throw new Error(`Trailing delimiter found at the end of line ${this.lineNumber + 1}`)
          }

          row.push(String.fromCharCode(...cell))
          cell = []
          continue
        }

        if (eol) {
          if (row.length === 0) {
            if (cell.length === 0) {
              continue
            }
          }

          this.lineNumber++

          if (cell.length > 0) {
            row.push(String.fromCharCode(...cell))
            cell = []
          }

          if (cb) {
            cb(row)
          }
          row = []

          read = read + ((c === this.cr ? i + 2 : i + 1) - read)

          continue
        }
      }

      cell.push(c)

      this.escaped = false
    }

    return input.slice(read, input.length)
  }

  private rowCallback = (row: string[]): void => {
    if (this.lineNumber === 1) {
      this.expectedColumnCount = row.length
    } else if (this.strict && row.length !== this.expectedColumnCount) {
      throw new Error(`Line ${this.lineNumber} has ${row.length} columns but ${this.expectedColumnCount} were expected`)
    }

    if (this.header) {
      if (this.lineNumber === 1) {
        this.result.headers = row
      } else {
        const rows = this.result.rows as object[]
        const objectRow = {}
        this.result.headers.forEach((header: string, index: number) => {
          objectRow[header] = row[index]
        })
        rows.push(objectRow)
      }
    } else {
      this.result.rows.push(row)
    }
  }
}
