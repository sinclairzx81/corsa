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

import { IReader } from './reader'
import { channel } from './channel'

/**
 * Selects from the given IReader<T> types and produces a
 * new multiplexed IReader<T> merging elements for each.
 */
export function select<T1, T2, T3, T4, T5, T6, T7, T8>(
  r1: IReader<T1>,
  r2: IReader<T2>,
  r3: IReader<T3>,
  r4: IReader<T4>,
  r5: IReader<T5>,
  r6: IReader<T6>,
  r7: IReader<T7>,
  r8: IReader<T8>
): IReader<T1 | T2 | T3 | T4 | T5 | T6 | T7>

/**
 * Selects from the given IReader<T> types and produces a
 * new multiplexed IReader<T> merging elements for each.
 */
export function select<T1, T2, T3, T4, T5, T6, T7>(
  r1: IReader<T1>,
  r2: IReader<T2>,
  r3: IReader<T3>,
  r4: IReader<T4>,
  r5: IReader<T5>,
  r6: IReader<T6>,
  r7: IReader<T7>
): IReader<T1 | T2 | T3 | T4 | T5 | T6 | T7>

/**
 * Selects from the given IReader<T> types and produces a
 * new multiplexed IReader<T> merging elements for each.
 */
export function select<T1, T2, T3, T4, T5, T6>(
  r1: IReader<T1>,
  r2: IReader<T2>,
  r3: IReader<T3>,
  r4: IReader<T4>,
  r5: IReader<T5>,
  r6: IReader<T6>
): IReader<T1 | T2 | T3 | T4 | T5 | T6>

/**
 * Selects from the given IReader<T> types and produces a
 * new multiplexed IReader<T> merging elements for each.
 */
export function select<T1, T2, T3, T4, T5>(
  r1: IReader<T1>,
  r2: IReader<T2>,
  r3: IReader<T3>,
  r4: IReader<T4>,
  r5: IReader<T5>
): IReader<T1 | T2 | T3 | T4 | T5>

/**
 * Selects from the given IReader<T> types and produces a
 * new multiplexed IReader<T> merging elements for each.
 */
export function select<T1, T2, T3, T4>(
  r1: IReader<T1>,
  r2: IReader<T2>,
  r3: IReader<T3>,
  r4: IReader<T4>
): IReader<T1 | T2 | T3 | T4>

/**
 * Selects from the given IReader<T> types and produces a
 * new multiplexed IReader<T> merging elements for each.
 */
export function select<T1, T2, T3>(
  r1: IReader<T1>,
  r2: IReader<T2>,
  r3: IReader<T3>
): IReader<T1 | T2 | T3>

/**
 * Selects from the given IReader<T> types and produces a multiplexed
 * IReader<T> combining elements for each.
 */
export function select<T1, T2>(
  r1: IReader<T1>,
  r2: IReader<T2>
): IReader<T1 | T2>

/**
 * Selects from the given IReader<T> types and produces a
 * new multiplexed IReader<T> merging elements for each.
 */
export function select<T1>(r1: IReader<T1>): IReader<T1>

/**
 * Selects from the given IReader<T> types and produces a
 * new multiplexed IReader<T> merging elements for each.
 */
export function select(...readers: Array<IReader<any>>): IReader<any> {
  const { writer: writer_main, reader: reader_main } = channel<any>(1)
  let completed = 0
  readers.forEach(async reader => {
    for await (const value of reader as any) {
      await writer_main.write(value)
    }
    completed += 1
    if(completed === readers.length) {
      await writer_main.end()
    }
  })
  return reader_main
}
