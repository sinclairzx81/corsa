/*--------------------------------------------------------------------------

corsa - Asynchronous uni-directional channels in node using async iteration.

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

import { IReadable }             from './readable'
import { ReadableAsyncIterator } from './readable'
import { ReadableIterator }      from './readable'
import { IWritable }             from './writable'

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
  
  /** writes the given value to the stream. */
  public async write (value: T): Promise<void> {
    if (this.queue.length >= this.bounds) {
      await this.writePause()
      this.readResume(value)
      return
    }
    this.readResume(value)
  }

  /** ends this stream. */
  public async end (): Promise<void> {
    if (this.queue.length >= this.bounds) {
      await this.writePause()
      this.readResume(void 0)
    } else {
      this.readResume(void 0)
    }
  }

  /** reads one element from the stream. */
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
