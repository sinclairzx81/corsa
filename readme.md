![logo](./docs/logo.png)

# Corsa

Asynchronous uni-directional channels in JavaScript using async iteration.

```typescript

import { channel } from 'corsa'

const [ writable, readable ] = channel()
writable.write(3)
writable.write(2)
writable.write(1)
writable.end()

for await (const value of readable) {
  console.log(value)
}
console.log('done')
```
```
output:
> 3
> 2
> 1
> done
```

## Overview

Corsa is a library to create asynchronous readable / writable channels in JavaScript. This library was specifically written to help solve `fast-in` | `slow-out` backpressure issues that can occur at high messaging frequencies using traditional event listeners in JavaScript.

Corsa approaches this problem by making the `sender` side of a `channel` awaitable. This helps to ensure the senders send rate is locked to the throughput allowed by the `receiver`.

## channel&lt;T&gt;

A channel is a uni-directional pipe for which data can flow. The following code creates an `unbounded` channel which allows for near infinite buffering of messages between `writable` and `readable`. The call to channel returns a `channel` object, which we destructure into the readable and writable pairs.

```typescript
const [ writable, readable ] = channel()
```
The following creates a bounded channel which allows for sending `5` values before suspending (see bounded vs unbounded)

```typescript
const [ writable, readable ]  = channel(5)
```

## Writer&lt;T&gt;

The following code create a unbounded channel and sends the values `1, 2, 3` following by call to `end()` signalling to a readable `EOF`.

```typescript
const [ writable, readable ] = channel<number>()

writable.write(1)
writable.write(2)
writable.write(3)
writable.end()

```

## Reader&lt;T&gt;

The `Reader<T>` is the receiving side of a channel and supports `for-await-of` for general iteration. 

```typescript
const [ writable, readable ] = channel()
writable.write(1)
writable.write(2)
writable.write(3)
writable.end()

for await (const value of readable) {
  console.log(value)
}

```

## bounded vs unbounded

By default all channels are `unbounded` but it is possible to set a fixed buffering size when creating a `channel()`. When setting a channel size, this will cause a writable to pause at `await` when sending values. The `await` at the writable will only occur once the channels buffer has filled with values. The writable will remained suspended until such time a receiver starts pulling values from the channel.

The following code demostrates this behavior with channel bound to a buffer of 5.

```typescript
const [ writable, readable ] = channel(5)
await writable.write(1) 
await writable.write(2) 
await writable.write(3) 
await writable.write(4) 
await writable.write(5) // - at capacity, the readable will need to read something.

await writable.write(6) // suspend  <-----+
                        //                | - readable.read() dequeues one element from the
...                     //                |   stream which will cause the writable to resume.
                        //                |  
await readable.read()   // resume   ------+
```

## select

This library provides a simple channel `select` function similar to multi channel select found in the Go programming language. It allows multiple `Reader<T>` types to be combined into a singular stream.

```typescript
import { channel, select } from 'corsa'

function strings() {
  const [ writable, readable ] = channel<string>()
  setInterval(() => writable.write('hello world'), 100)
  return readable
}

function numbers() {
  const [ writable, readable ] = channel<number>()
  setInterval(() => writable.write(Math.random()), 200)
  return readable
}

async function start() {
  const readable = select(strings(), numbers())
  for await (const value of readable) {
    console.log(value)
  }
}
```
