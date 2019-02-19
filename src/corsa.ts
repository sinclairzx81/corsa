/*--------------------------------------------------------------------------

MIT License

Copyright (c) corsa 2019 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---------------------------------------------------------------------------*/

export interface IReadable<T = any> {
  [Symbol.iterator]()
  [Symbol.asyncIterator]()
  read(): Promise<T | undefined>
}

export class ReadableIterator<T = any> implements Iterator<Promise<T>> {
  constructor(private readonly readable: IReadable<T>) { }
  public next(): IteratorResult<Promise<T>> {
    const value = this.readable.read()
    const done  = false
    return { value, done }
  }
}

export class ReadableAsyncIterator<T = any> implements AsyncIterator<T> {
  constructor(private readonly readable: IReadable<T>) { }
  public async next(): Promise<IteratorResult<T>> {
    const next = await this.readable.read()
    if (next === undefined) {
      const done  = true
      const value = null
      return { done, value }
    }
    const done  = false
    const value = next
    return { done, value }
  }
}

export class Readable<T = any> implements IReadable<T> {
  [Symbol.iterator]()      { return new ReadableIterator(this) }
  [Symbol.asyncIterator]() { return new ReadableAsyncIterator(this) }
  constructor(private readonly reader: IReadable<T>) { }
  /** Reads the next value from this channel or `undefined` if eof. */
  public read(): Promise<T | undefined> {
    return this.reader.read()
  }
}



export interface IWritable<T=any> {
  /** Writes data to the channel. */
  write(data: T): Promise<void>

  /** Ends this channel. */
  end(): Promise<void>
}

export class Writable<T = any> implements IWritable<T> {
  constructor(private writer: IWritable<T>) {
  }
  /** Writes data to the channel. */
  public write(data: T): Promise<void> {
    return this.writer.write(data)
  }
  
  /** Ends this channel. */
  public end(): Promise<void> {
    return this.writer.end()
  }
}



interface Defer<T = any> {
  resolve: (value: T)     => void
  reject:  (error: Error) => void
}

/**
 * Stream<T>
 * 
 * An in-memory asynchronous stream of values. Implements both
 * IReadable<T> and IWritable<T> interfaces and is used as a back
 * plane for in memory channels.
 */
export class Stream<T = any> implements IReadable<T>, IWritable<T> {
  [Symbol.iterator]()      { return new ReadableIterator(this) }
  [Symbol.asyncIterator]() { return new ReadableAsyncIterator(this) }

  private writers: Array<Defer>     = []
  private sinks:   Array<Defer<T>>  = []
  private queue:   T[]              = []

  constructor(private bounds: number = 1) {}
  
  /** Writes data to the channel. */
  public async write (value: T): Promise<void> {
    if (this.queue.length >= this.bounds) {
      await this.writePause()
      this.readResume(value)
      return
    }
    this.readResume(value)
  }

  /** Ends this stream. */
  public async end (): Promise<void> {
    if (this.queue.length >= this.bounds) {
      await this.writePause()
      this.readResume(void 0)
    } else {
      this.readResume(void 0)
    }
  }

  /** Reads the next value from this channel or `undefined` if eof. */
  public read (): Promise<T> {
    this.writeResume()
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift()!)
    } else {
      return this.readPause()
    }
  }

  private writePause() {
    return new Promise((resolve, reject) =>
      this.writers.push({ resolve, reject })
    )
  }

  private writeResume() {
    if (this.writers.length > 0) {
      const writer = this.writers.shift()!
      writer.resolve(void 0)
    }    
  }

  private readPause() {
    return new Promise<T>((resolve, reject) => {
      this.sinks.push({ resolve, reject })
    })
  }

  private readResume (value: T) {
    if (this.sinks.length > 0) {
      const sink = this.sinks.shift()!
      return sink.resolve(value)
    }
    this.queue.push(value)
  }
}


/**
 * Selects from the given IReadable<T> types and produces a
 * new multiplexed IReadable<T> merging elements for each.
 */
export function select<T1, T2, T3, T4, T5, T6, T7, T8>(
  r1: IReadable<T1>,
  r2: IReadable<T2>,
  r3: IReadable<T3>,
  r4: IReadable<T4>,
  r5: IReadable<T5>,
  r6: IReadable<T6>,
  r7: IReadable<T7>,
  r8: IReadable<T8>
): IReadable<T1 | T2 | T3 | T4 | T5 | T6 | T7>

/**
 * Selects from the given IReadable<T> types and produces a
 * new multiplexed IReadable<T> merging elements for each.
 */
export function select<T1, T2, T3, T4, T5, T6, T7>(
  r1: IReadable<T1>,
  r2: IReadable<T2>,
  r3: IReadable<T3>,
  r4: IReadable<T4>,
  r5: IReadable<T5>,
  r6: IReadable<T6>,
  r7: IReadable<T7>
): IReadable<T1 | T2 | T3 | T4 | T5 | T6 | T7>

/**
 * Selects from the given IReadable<T> types and produces a
 * new multiplexed IReadable<T> merging elements for each.
 */
export function select<T1, T2, T3, T4, T5, T6>(
  r1: IReadable<T1>,
  r2: IReadable<T2>,
  r3: IReadable<T3>,
  r4: IReadable<T4>,
  r5: IReadable<T5>,
  r6: IReadable<T6>
): IReadable<T1 | T2 | T3 | T4 | T5 | T6>

/**
 * Selects from the given IReadable<T> types and produces a
 * new multiplexed IReadable<T> merging elements for each.
 */
export function select<T1, T2, T3, T4, T5>(
  r1: IReadable<T1>,
  r2: IReadable<T2>,
  r3: IReadable<T3>,
  r4: IReadable<T4>,
  r5: IReadable<T5>
): IReadable<T1 | T2 | T3 | T4 | T5>

/**
 * Selects from the given IReadable<T> types and produces a
 * new multiplexed IReadable<T> merging elements for each.
 */
export function select<T1, T2, T3, T4>(
  r1: IReadable<T1>,
  r2: IReadable<T2>,
  r3: IReadable<T3>,
  r4: IReadable<T4>
): IReadable<T1 | T2 | T3 | T4>

/**
 * Selects from the given IReadable<T> types and produces a
 * new multiplexed IReadable<T> merging elements for each.
 */
export function select<T1, T2, T3>(
  r1: IReadable<T1>,
  r2: IReadable<T2>,
  r3: IReadable<T3>
): IReadable<T1 | T2 | T3>

/**
 * Selects from the given IReadable<T> types and produces a multiplexed
 * IReadable<T> combining elements for each.
 */
export function select<T1, T2>(
  r1: IReadable<T1>,
  r2: IReadable<T2>
): IReadable<T1 | T2>

/**
 * Selects from the given IReadable<T> types and produces a
 * new multiplexed IReadable<T> merging elements for each.
 */
export function select<T1>(r1: IReadable<T1>): IReadable<T1>

/**
 * Selects from the given IReadable<T> types and produces a
 * new multiplexed IReadable<T> merging elements for each.
 */
export function select(...readers: Array<IReadable<any>>): IReadable<any> {
  const { writable: writableHost, readable: readableHost } = channel<any>(1)
  let completed = 0
  readers.forEach(async reader => {
    for await (const value of reader as any) {
      await writableHost.write(value)
    }
    completed += 1
    if(completed === readers.length) {
      await writableHost.end()
    }
  })
  return readableHost
}


export interface IChannel<T = any> {
  readable: IReadable<T>
  writable: IWritable<T>
}
/** Creates a channel with optional buffering bounds. (default is Number.MAX_SAFE_INTEGER) */
export function channel<T = any>(bound: number = Number.MAX_SAFE_INTEGER): IChannel<T> {
  const stream   = new Stream<T>(bound)
  const readable = new Readable<T>(stream)
  const writable = new Writable<T>(stream)
  return { readable, writable }
}