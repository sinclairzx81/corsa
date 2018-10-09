/*--------------------------------------------------------------------------

async-channels - asynchronous channel iterators

The MIT License (MIT)

Copyright (c) 2018 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/

const POLYFILL: any = Symbol
POLYFILL['asyncIterator'] = 
POLYFILL[`asyncIterator`] || 
POLYFILL.for('Symbol.asyncIterator')

interface Defer<T> {
  resolve: (value: T) => void
  reject: (error: Error) => void
}

class Memory<T> {
  private buffer: T[] = []
  private writers: Array<Defer<null>> = []
  private readers: Array<Defer<T>> = []
  
  constructor(private bounds: number) {}

  private write_block() {
    return new Promise((resolve, reject) =>
      this.writers.push({ resolve, reject })
    )
  }

  private write_unblock() {
    if (this.writers.length > 0) {
      const writer = this.writers.shift()!
      writer.resolve(null)
    }    
  }

  private reader_block() {
    return new Promise<T>((resolve, reject) => {
      this.readers.push({ resolve, reject })
    })
  }

  private reader_unblock(item: T) {
    if (this.readers.length > 0) {
      const reader = this.readers.shift()!
      reader.resolve(item)
    } else {
      this.buffer.push(item)
    }
  }

  public write (value: T): Promise<void> {
    return new Promise<void>(resolve => {
      setImmediate(async () => {
        if (this.buffer.length >= this.bounds) {
          await this.write_block()
          this.reader_unblock(value)
          resolve()
        } else {
          this.reader_unblock(value)
          resolve()
        }
      })
    })
  }

  public read (): Promise<T> {
    this.write_unblock()
    if (this.buffer.length > 0) {
      return Promise.resolve(this.buffer.shift()!)
    } else {
      return this.reader_block()
    }
  }
}

export class Sender<T> {
  constructor(private queue: Memory<T | null>) {}
  /** Sends the given value to the receiver. Send `null` to signal EOF. */
  public send(value: T | null): Promise<void> {
    return this.queue.write(value)
  }
}

export class Receiver<T> implements AsyncIterator<T> {
  [Symbol.asyncIterator]() {
    return this
  }

  constructor(private queue: Memory<T>) {}
  
  /** maps elements of this sequence into a new form. */
  public map<U>(func: (value:T) => U): Receiver<U> {
    const [tx, rx] = channel<U>(1)
    setImmediate(async () => {
      for await (const value of this) {
        await tx.send(func(value))
      }
      tx.send(null)
    })
    return rx
  }

  /** filters elements of this receiver based on a condition. */
  public filter(func: (value:T) => boolean): Receiver<T> {
    const [tx, rx] = channel<T>(1)
    setImmediate(async () => {
      for await (const value of this) {
        if(func(value)) {
          await tx.send(value)
        }
      }
      tx.send(null)
    })
    return rx
  }

  /** returns the next asynchronous value in this channel. */
  public async next(): Promise<IteratorResult<T>> {
    const value = await this.queue.read()
    if (value === null) {
      const done = true
      return { done, value }
    }
    const done = false
    return { done, value }
  }
}

/**
 * creates a new async queue of the given bounded `size`.
 * @param {number} size the maximum size of this queue (default MAX_SAFE_INTEGER)
 * @returns {[Sender<T>, Receiver<T>]}
 */
export function channel<T>(
  size: number = Number.MAX_SAFE_INTEGER
): [Sender<T>, Receiver<T>] {
  const queue = new Memory<T>(size)
  const tx = new Sender<T>(queue)
  const rx = new Receiver<T>(queue)
  return [tx, rx]
}

/**
 * Selects from the given Receiver<T> types and produces a
 * new multiplexed Receiver<T> merging elements for each.
 */
export function select<T1, T2, T3, T4, T5, T6, T7, T8>(
  r1: Receiver<T1>,
  r2: Receiver<T2>,
  r3: Receiver<T3>,
  r4: Receiver<T4>,
  r5: Receiver<T5>,
  r6: Receiver<T6>,
  r7: Receiver<T7>,
  r8: Receiver<T8>
): Receiver<T1 | T2 | T3 | T4 | T5 | T6 | T7>

/**
 * Selects from the given Receiver<T> types and produces a
 * new multiplexed Receiver<T> merging elements for each.
 */
export function select<T1, T2, T3, T4, T5, T6, T7>(
  r1: Receiver<T1>,
  r2: Receiver<T2>,
  r3: Receiver<T3>,
  r4: Receiver<T4>,
  r5: Receiver<T5>,
  r6: Receiver<T6>,
  r7: Receiver<T7>
): Receiver<T1 | T2 | T3 | T4 | T5 | T6 | T7>

/**
 * Selects from the given Receiver<T> types and produces a
 * new multiplexed Receiver<T> merging elements for each.
 */
export function select<T1, T2, T3, T4, T5, T6>(
  r1: Receiver<T1>,
  r2: Receiver<T2>,
  r3: Receiver<T3>,
  r4: Receiver<T4>,
  r5: Receiver<T5>,
  r6: Receiver<T6>
): Receiver<T1 | T2 | T3 | T4 | T5 | T6>

/**
 * Selects from the given Receiver<T> types and produces a
 * new multiplexed Receiver<T> merging elements for each.
 */
export function select<T1, T2, T3, T4, T5>(
  r1: Receiver<T1>,
  r2: Receiver<T2>,
  r3: Receiver<T3>,
  r4: Receiver<T4>,
  r5: Receiver<T5>
): Receiver<T1 | T2 | T3 | T4 | T5>

/**
 * Selects from the given Receiver<T> types and produces a
 * new multiplexed Receiver<T> merging elements for each.
 */
export function select<T1, T2, T3, T4>(
  r1: Receiver<T1>,
  r2: Receiver<T2>,
  r3: Receiver<T3>,
  r4: Receiver<T4>
): Receiver<T1 | T2 | T3 | T4>

/**
 * Selects from the given Receiver<T> types and produces a
 * new multiplexed Receiver<T> merging elements for each.
 */
export function select<T1, T2, T3>(
  r1: Receiver<T1>,
  r2: Receiver<T2>,
  r3: Receiver<T3>
): Receiver<T1 | T2 | T3>

/**
 * Selects from the given Receiver<T> types and produces a multiplexed
 * Receiver<T> combining elements for each.
 */
export function select<T1, T2>(
  r1: Receiver<T1>,
  r2: Receiver<T2>
): Receiver<T1 | T2>

/**
 * Selects from the given Receiver<T> types and produces a
 * new multiplexed Receiver<T> merging elements for each.
 */
export function select<T1>(r1: Receiver<T1>): Receiver<T1>

/**
 * Selects from the given Receiver<T> types and produces a
 * new multiplexed Receiver<T> merging elements for each.
 */
export function select(...receivers: Array<Receiver<any>>): Receiver<any> {
  const [tx, rx] = channel<any>(1)
  receivers.forEach(async receiver => {
    for await (const value of receiver) {
      await tx.send(value)
    }
  })
  return rx
}

/**
 * convenience function which generates a stream of values.
 * @param {(Sender<T>) => Promise<void>} func the stream generation function.
 * @returns {Receiver<T>}
 */
export const source = <T>(func: (sender: Sender<T>) => Promise<void>): Receiver<T> => {
  const [tx, rx] = channel<T>(1)
  setImmediate(() => func(tx))
  return rx
}