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

/**
 * Defer<T>
 * 
 * Used exclusively by the Memory<T> type to queue and dequeue
 * reader/writers operations.
 */
interface Defer<T> {
  resolve: (value: T) => void
  reject: (error: Error) => void
}

/**
 * Memory<T>
 * 
 * The backing store used by Sender<T> and Receiver<T> implementations.
 * This type contains a small state machines to track async interactions
 * between sender and receiver and provides general read/write functions
 * that are in-tune with async-iterator semantics.
 */
class Memory<T> {
  private buffer: T[] = []
  private writers: Array<Defer<null>> = []
  private readers: Array<Defer<T>> = []
  
  constructor(private bounds: number) {}
  
  /**
   * returns a writer promise that resolves on call to read()
   * @returns {Promise<void>}
   */
  private write_pause() {
    return new Promise((resolve, reject) =>
      this.writers.push({ resolve, reject })
    )
  }

  /**
   * resumes the next write promise if one exists called from read()
   * @returns {void}
   */
  private write_resume() {
    if (this.writers.length > 0) {
      const writer = this.writers.shift()!
      writer.resolve(null)
    }    
  }

  /**
   * returns a reader promise that will resolve on call to write()
   * returns {Proimise<void>}
   */
  private reader_pause() {
    return new Promise<T>((resolve, reject) => {
      this.readers.push({ resolve, reject })
    })
  }

  /**
   * resumes a reader promise with a given value. called from write()
   * @returns {void}
   */
  private reader_resume(item: T) {
    if (this.readers.length > 0) {
      const reader = this.readers.shift()!
      reader.resolve(item)
    } else {
      this.buffer.push(item)
    }
  }

  /**
   * writes a value into this memory store and returns a promise indicating the value was sent.
   * @param {T} value the value to write.
   * @returns {Promise<T>}
   */
  public write (value: T): Promise<void> {
    return new Promise<void>(resolve => {
      setImmediate(async () => {
        if (this.buffer.length >= this.bounds) {
          await this.write_pause()
          this.reader_resume(value)
          resolve()
        } else {
          this.reader_resume(value)
          resolve()
        }
      })
    })
  }

  /**
   * reads a value from this memory store and returns a promise that resolves when a value is available.
   * @returns {Promise<T>}
   */
  public read (): Promise<T> {
    this.write_resume()
    if (this.buffer.length > 0) {
      return Promise.resolve(this.buffer.shift()!)
    } else {
      return this.reader_pause()
    }
  }
}


/**
 * Sender<T>
 * 
 * A async iterable sender for this channel. Allows a caller to
 * send values of T, Error and null which are relayed to a
 * associated Receiver<T>.
 */
export class Sender<T> {
  constructor(private queue: Memory<T | Error | null>) {}

  /** 
   * Sends the given value to this channel
   * @param {T | Error | null} value the value to send.
   * @return {Promise<void>} a promise which resolves when its ok to send more.
   */
  public send(value: T | Error | null): Promise<void> {
    return this.queue.write(value)
  }
}

/**
 * Receiver<T>
 * 
 * A async iterable receiver for this channel. This type provides asynchronous
 * element operations which allow callers to map, filter and reduce async
 * streams of values.
 */
export class Receiver<T> implements AsyncIterator<T> {
  private [Symbol.asyncIterator]() {
    return this
  }

  constructor(private queue: Memory<T | Error | null>) {}
  
  /**
   * Applies an accumulator function over a sequence.
   * @param {(acc: U, current: T, index?: number): U} func the aggregate function.
   * @param {U} initial the initial accumulator value.
   * @returns {Promise<U>}
   */
  public async aggregate<U>(func: (acc: U, value: T, index: number) => U, initial: U): Promise<U> {
    let index = 0
    for await (const value of this) {
      initial = func(initial, value, index++)
    }
    return initial
  }

  /**
   * Determines whether all the elements of a sequence satisfy a condition.
   * @param {(value: T): boolean} func the all function.
   * @returns {Promise<boolean>}
   */
  public async all(func: (value: T, index: number) => boolean): Promise<boolean> {
    let index = 0
    for await (const value of this) {
      if(!func(value, index++)) {
        return false
      }
    }
    return true
  }

  /**
   * Determines whether a sequence contains any elements that meet this criteria.
   * @param {(value: T): boolean} func the any function.
   * @returns {Promise<boolean>}
   */
  public async any(func: (value: T, index: number) => boolean): Promise<boolean> {
    let index = 0
    for await (const value of this) {
      if(func(value, index++)) {
        return true
      }
    }
    return false
  }

  /**
   * Computes the average of a sequence of numeric values.
   * @param {(value:T): number} func the average function.
   * @returns {Promise<number>}
   */
  public async average(func: (value: T, index: number) => number): Promise<number> {
    let index = 0
    let acc = 0
    let count = 0
    for await (const value of this) {
      acc += func(value, index++)
      count += 1
    }
    return acc / count
  }

  /**
   * Concatenates two receiver sequences returning a new receiver that enumerates the first, then the second.
   * @param {Receiver<T>} receiver the receiver to concat.
   * @returns {Receiver<T>}
   */
  public concat(receiver: Receiver<T>): Receiver<T> {
    const [tx, rx] = channel<T>(1)
    setImmediate(async () => {
      let index = 0
      for await (const value of this) {
        await tx.send(value)
      }
      for await (const value of receiver) {
        await tx.send(value)
      }
      tx.send(null)
    })
    return rx
  }

  /**
   * Returns the number of elements in a sequence.
   * @returns Promise<number>
   */
  public async count(): Promise<number> {
    let count = 0
    for await (const value of this) {
      count += 1
    }
    return count
  }
  /**
   * Returns distinct elements from a sequence by using the default equality comparer to compare values.
   * @returns {Receiver<T>}
   */
  public distinct(): Receiver<T> {
    const [tx, rx] = channel<T>(1)
    setImmediate(async () => {
      let hash = []
      for await (const value of this) {
        if (hash.indexOf(value) === -1) {
          hash.push(value)
          await tx.send(value)
        }
      }
      tx.send(null)
    })
    return rx
  }

  /**
   * Returns the element at the specified index, if no element exists, reject.
   * @param {number} index the element index.
   * @returns {Promise<T>}
   */
  public async elementAt(index: number): Promise<T> {
    let count = 0
    for await (const value of this) {
      if(count === index) {
        return value
      }
      count += 1
    }
    throw Error(`no element at index ${index}`)
  }

  /**
   * Returns the element at the specified index, if no element exists, reject.
   * @param {number} index the element index.
   * @returns {Promise<T>}
   */
  public async elementAtOrDefault(index: number): Promise<T | undefined> {
    let count = 0
    for await (const value of this) {
      if(count === index) {
        return value
      }
      count += 1
    }
    return undefined
  }

  /**
   * Returns the first element. if no element exists, reject.
   * @returns {Promise<T>}
   */
  public async first(): Promise<T> {
    for await (const value of this) {
      return value
    }
    throw Error('no elements in sequence')
  }

  /**
   * Returns the first element. if no element exists, resolve undefined.
   * @returns {Promise<T>}
   */
  public async firstOrDefault(): Promise<T | undefined> {
    for await (const value of this) {
      return value
    }
    return undefined
  }

  /**
   * Produces the set intersection of two sequences by using the default equality comparer to compare values.
   * @param {Receiver<T>} receiver the receiver to intersect.
   * @returns {Receiver<T>}
   */
  public intersect(receiver: Receiver<T>): Receiver<T> {
    const [tx, rx] = channel<T>(1)
    setImmediate(async () => {
      const collected = await receiver.collect()
      for await (const value of this) {
        if (collected.indexOf(value) !== -1) {
          await tx.send(value)
        }
      }
      tx.send(null)
    })
    return rx
  }

  /**
   * Returns the last element in this sequence. if empty, reject.
   * @returns {Promise<T>}
   */
  public async last(): Promise<T> {
    let acc: T | undefined
    for await (const value of this) {
      acc = value
    }
    if(acc === undefined) {
      throw Error('no elements in sequence')
    }
    return acc
  }

  /**
   * Returns the last element in this sequence. if empty, resolve undefined.
   * @returns {Promise<T>}
   */
  public async lastOrDefault(): Promise<T> {
    let acc: T | undefined
    for await (const value of this) {
      acc = value
    }
    return acc
  }

  /**
   * Sorts the elements of a sequence in ascending order according to a key. This method requires
   * an internal collect().
   * @param {(value: T): U} func the orderBy function.
   * @returns {Receiver<T>}
   */
  public orderBy<U>(func: (value: T) => U): Receiver<T> {
    const [tx, rx] = channel<T>(1)
    setImmediate(async () => {
      const collected = await this.collect()
      const sorted = collected.sort((a, b) => {
        let left = func(a)
        let right = func(b)
        return +(left > right) || +(left === right) - 1;
      })
      for (const value of sorted) {
        await tx.send(value)
      }
      await tx.send(null)
    })
    return rx
  }

  /**
   * Sorts the elements of a sequence in ascending order according to a key. This method requires
   * an internal collect().
   * @param {(value: T): U} func the orderBy function.
   * @returns {Receiver<T>}
   */
  public orderByDescending<U>(func: (value: T) => U): Receiver<T> {
    const [tx, rx] = channel<T>(1)
    setImmediate(async () => {
      const collected = await this.collect()
      const sorted = collected.sort((a, b) => {
        let left = func(a)
        let right = func(b)
        return +(left < right) || +(left === right) - 1;
      })
      for (const value of sorted) {
        await tx.send(value)
      }
      await tx.send(null)
    })
    return rx
  }

  /**
   * Inverts the order of the elements in a sequence. This method requires
   * an internal collect().
   * @returns {Receiver<T>}
   */
  public reverse(): Receiver<T> {
    const [tx, rx] = channel<T>(1)
    setImmediate(async () => {
      const collected = await this.collect()
      const reversed = collected.reverse()
      while(reversed.length > 0) {
        await tx.send(reversed.shift()!)
      }
      await tx.send(null)
    })
    return rx
  }

  /**
   * Projects each element of a sequence into a new form.
   * @param {(value:T, index: number): U} func the select function.
   * @returns {Receiver<U>}
   */
  public select<U>(func: (value: T, index: number) => U): Receiver<U> {
    const [tx, rx] = channel<U>(1)
    setImmediate(async () => {
      let index = 0
      for await (const value of this) {
        const next = func(value, index++)
        await tx.send(next)
      }
      tx.send(null)
    })
    return rx
  }

  /**
   * Projects each element of a sequence to an Array<T> and combines the resulting sequences into one sequence.
   * @param {(value:T, index: number): Array<U>} func the selectMany function.
   * @returns {Receiver<U>}
   */
  public selectMany<U>(func: (value: T, index: number) => Array<U>): Receiver<U> {
    const [tx, rx] = channel<U>(1)
    setImmediate(async () => {
      let index = 0
      for await (const value of this) {
        const next = func(value, index++)
        for(const inner of next) {
          await tx.send(inner)
        }
      }
      tx.send(null)
    })
    return rx
  }

  /**
   * Returns the only element of a sequence that satisfies a specified condition.
   * @param {(value: T, index: number): boolean} func the single function.
   * @returns {Promise<T>}
   */
  public async single(func: (value: T, index: number) => boolean): Promise<T> {
    let index = 0
    for await (const value of this) {
      if(func(value, index++)) {
        return value
      }
    }
    throw Error('no such value meets the given critera.')
  }

  /**
   * Returns the only element of a sequence that satisfies a specified condition.
   * @param {(value: T, index: number): boolean} func the single function.
   * @returns {Promise<T>}
   */
  public async singleOrDefault(func: (value: T, index: number) => boolean): Promise<T | undefined> {
    let index = 0
    for await (const value of this) {
      if(func(value, index++)) {
        return value
      }
    }
    return undefined
  }

  /**
   * Bypasses a specified number of elements in a sequence and then returns the remaining elements.
   * @param {number} count the number of elements to skip.
   * @returns {Receiver<T>}
   */
  public skip(count: number): Receiver<T> {
    const [tx, rx] = channel<T>(1)
    setImmediate(async () => {
      let index = 0
      for await (const value of this) {
        if(index >= count) {
          await tx.send(value)
        }
        index ++
      }
      tx.send(null)
    })
    return rx
  }

  /**
   * Computes the sum of the sequence of numeric values.
   * @param {(value: T, index: number): number} func the sum function.
   * @returns {Promise<number>}
   */
  public async sum(func: (value: T, index: number) => number): Promise<number> {
    let index = 0
    let acc = 0
    for await (const value of this) {
      acc += func(value, index)
    }
    return acc
  }

  /**
   * Returns a specified number of contiguous elements from the start of a sequence.
   * @param {number} count the number of elements to take.
   * @returns {Receiver<T>}
   */
  public take(count: number): Receiver<T> {
    const [tx, rx] = channel<T>(1)
    setImmediate(async () => {
      let index = 0
      for await (const value of this) {
        if(index < count) {
          await tx.send(value)
          index ++
        } else {
          break
        }
      }
      tx.send(null)
    })
    return rx
  }

  /**
   * Filters a sequence of values based on a predicate.
   * @param {(value: T, index: number): boolean} func the where function.
   * @returns {Receiver<T>}
   */
  public where(func: (value: T, index: number) => boolean): Receiver<T> {
    const [tx, rx] = channel<T>(1)
    setImmediate(async () => {
      let index = 0
      for await (const value of this) {
        if(func(value, index++)) {
          await tx.send(value)
        }
      }
      tx.send(null)
    })
    return rx
  }


  /**
   * Collects all values in this receiver.
   * @returns {Promise<Array<T>>}
   */
  public async collect(): Promise<Array<T>> {
    let acc: T[] = []
    for await (const value of this) {
      acc.push(value)
    }
    return acc
  }


  /**
   * Projects each element of a sequence into a new form.
   * @param {(value:T, index: number): U} func the map function.
   * @returns {Receiver<U>}
   */
  public map<U>(func: (value: T, index: number) => U): Receiver<U> {
    return this.select(func)
  }

  /**
   * Filters a sequence of values based on a predicate.
   * @param {(value: T, index: number): boolean} func the where function.
   * @returns {Receiver<T>}
   */
  public filter(func: (value: T, index: number) => boolean): Receiver<T> {
    return this.where(func)
  }

  /**
   * Applies an accumulator function over a sequence.
   * @param {(acc: U, current: T, index?: number): U} func the aggregate function.
   * @param {U} initial the initial accumulator value.
   * @returns {Promise<U>}
   */
  public reduce<U>(func: (acc: U, value: T, index: number) => U, initial: U): Promise<U> {
    return this.aggregate(func, initial)
  }

  /** 
   * (async-iterator) Returns the next promise.
   * @returns {Promise<IteratorResult<T>>}
   */
  public async next(): Promise<IteratorResult<T>> {
    const value = await this.queue.read()
    if(value instanceof Error) {
      throw value
    }
    if (value === null) {
      const done = true
      return { done, value }
    }
    const done = false
    return { done, value }
  }
}

/**
 * Creates a new async channel with the given size. If no size is provided, the size defaults
 * to Number.MAX_SAFE_INTEGER which can be interpreted as a unbounded channel.
 * @param {number} size the buffering size for this channel.
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
 * A basic source function that provides a convienience interface for emitting values.
 * @param {(Sender<T>) => Promise<void>} func the stream emitting function.
 * @returns {Receiver<T>}
 */
export const source = <T>(func: (sender: Sender<T>) => Promise<void>): Receiver<T> => {
  const [tx, rx] = channel<T>(1)
  setImmediate(() => func(tx))
  return rx
}