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
  public read(): Promise<T | undefined> {
    return this.reader.read()
  }
}