# Corsa

Asynchronous uni-directional channels in node using async iteration.

```typescript

import { channel } from './corsa'

async function start() {

  const { reader, writer } = channel()

  writer.write(0)
  writer.write(1)
  writer.write(2)
  writer.end()

  for await (const value of reader) {
    console.log(value)
  }
}

start()

// output: 0, 1, 2

```

## overview

This project is a experimental implementation of JavaScript's `AsyncIterator<T>` to allow for the building of asynchronous `pull` based channels in JavaScript. This project seeks to provide a fast / memory effecient means of streaming data asynchronouly which does not incur excessive buffering or result in asynchronous overlap in high frequency messaging scenarios.

This project makes heavy use of `async/await` and JavaScripts `for await-of` syntax. Built primarily for node 11 and above.

## channel

A channel is a uni-directional pipe for which data can flow. The following code creates an `unbounded` channel which allows for near infinite buffering of messages between `writer` and `reader`. The call to channel returns a `channel` object, which we destructure into the reader and writer pairs.

```typescript
const { reader, writer } = channel()
```
The following creates a bounded channel which allows for sending `5` values before suspending (see bounded vs unbounded)

```typescript
const { reader, writer }  = channel(5)
```

## Writer<T>

The following code create a unbounded channel and sends the values `1, 2, 3` following by call to `end()` signalling to a reader `EOF`.

```typescript
const { reader, writer } = channel<number>()

writer.write(1)
writer.write(2)
writer.write(3)
writer.end()

```

## Reader<T>

The `Reader<T>` is the receiving side of a channel and supports `for-await-of` for general iteration. 

```typescript
const { reader, writer } = channel()
writer.write(1)
writer.write(2)
writer.write(3)
writer.end()

for await (const value of reader) {
  console.log(value)
}

```

## bounded vs unbounded

By default all channels are `unbounded` but it is possible to set a fixed buffering size when creating a `channel()`. When setting a channel size, this will cause a writer to pause at `await` when sending values. The `await` at the writer will only occur once the channels buffer has filled with values. The writer will remained suspended until such time a receiver starts pulling values from the channel.

The following code demostrates this behavior with channel bound to a buffer of 5.

```typescript
const { reader, writer } = channel(5)
await writer.write(0) // 1
await writer.write(1) // 2
await writer.write(2) // 3
await writer.write(3) // 4
await writer.write(4) // 5 - at capacity, the reader will need to read something.

await writer.write(5) // paused   <------
                      //                | - reader.read() dequeues one element from the
...                   //                |   stream which will cause the writer to resume.
                      //                |  
reader.read()         // resume   ------>
```

Note, this behaviour is intended to ease back pressure in streaming scenarios where the writer may emit values faster than a reader can receive them. The behaviour of the `awaitable send` is modelled on the `std::sync::mpsc::SyncSender<T>` type found in the Rust standard library. But rather than blocking, this library leverages await to suspend.

## select

This library provides a simple channel `select` function similar to multi channel select found in the Go programming language. It allows multiple `Reader<T>` types to be combined into a singular stream.

```typescript
import { channel, select } from './corsa'

// A stream of strings
function strings() {
  const { reader, writer } = channel<string>()
  setInterval(() => writer.write('hello world'), 100)
  return reader
}
// A stream of numbers
function numbers() {
  const { reader, writer } = channel<number>()
  setInterval(() => writer.write(Math.random()), 200)
  return reader
}

async function start() {
  const reader = select(strings(), numbers())
  for await (const value of reader) {
    console.log(value)
  }
}
```
