# async-channels

An experiment using JavaScript's `AsyncIterator<T>` to build fast / memory effecient uni-directional channels in nodejs.

```typescript
import { channel } from './channels'

const [tx, rx] = channel()

tx.send(0)
tx.send(1)
tx.send(2)
tx.send(3)
tx.send(null) // eof

...
for await (const n of rx) {
  console.log(n)
}
```

## overview

This project is a experimental implementation of JavaScript's `AsyncIterator<T>` to allow for the building of asynchronous `pull` based channels in JavaScript. This project seeks to provide a fast / memory effecient means of streaming data asynchronouly which does not incur excessive buffering or result in asynchronous overlap in high frequency messaging scenarios.

This project makes heavy use of `async/await` and JavaScripts `for await-of` syntax and provides `rx` operators on receive.

## channel

A channel is a uni-directional pipe for which data can flow. The following code creates an `unbounded` channel which allows for near infinite buffering of messages between `sender` and `receiver`. The call to channel returns a `tuple` type containing a `sender` and `receiver` pair.

```typescript
const [tx, rx] = channel()
```
The following creates a bounded channel which allows for sending `5` values before suspending (see bounded vs unbounded)

```typescript
const [tx, rx] = channel(5)
```

## sending

The following code create a unbounded channel and sends the values `1, 2, 3` following by a `null`. The `null` is a signal to the receiver that the stream of values has finished. A `null` value will cause the `for await-of` block to finish.

```typescript
const [tx, rx] = channel()

tx.send(1)
tx.send(2)
tx.send(3)
tx.send(null)

```
## receiving

The `Receiver<T>` side of a channel supports `for-await-of` for general iteration. 

```typescript
const [tx, rx] = channel()
tx.send(1)
tx.send(2)
tx.send(3)
tx.send(null)

for await (const n of rx) {
  console.log(n)
}
```
But also provides many `linq` / `RxJs` inspired operators on the receiver.

```typescript
const [tx, rx] = channel()
tx.send(1)
tx.send(2)
tx.send(3)
tx.send(null)

for await (const n of rx.filter(n => n % 2 === 0)
                         .map(n => '#' + n)
                         .reverse()) {
  console.log(n)
}

```

## bounded vs unbounded

By default all channels are `unbounded` but it is possible to set a fixed buffering size when creating a `channel()`. When setting a channel size, this will cause a sender to `await` when sending values. The `await` at the sender will only occur once the channel has filled up with values. The sender will remained suspended until such time a receiver starts pulling values from the channel.

The following code demostrates this behavior with channel bound to a buffer of 5.

```typescript
const [tx, rx] = channel(5)
await tx.send(0) // 1
await tx.send(1) // 2
await tx.send(2) // 3
await tx.send(3) // 4
await tx.send(4) // 5 - at capacity

await tx.send(5) // suspend  <-----+
                 //                |
...              //                |- rx.next() resumes the suspended tx.send() 
                 //                |
rx.next()        // resume   ------+
```

Note, this behaviour is intended to ease back pressure in streaming scenarios where the sender may emit values faster than a receiver can receive them. The behaviour of the `awaitable send` is modelled on the `std::sync::mpsc::SyncSender<T>` type found in the Rust standard library. But rather than blocking, this library leverages await to suspend.

## select

This library provides a simple channel `select` function similar to that going in the Go programming language. It allows multiple `Receiver<T>` types to be combined into a singular stream.

```typescript
import { channel, Receiver, select } from './channels'

// stream an array of strings
function strings() {
  const [tx, rx] = channel<string>()
  setInterval(() => tx.send('hello world'), 100)
  return rx
}
// stream an array of numbers
function numbers() {
  const [tx, rx] = channel<number>()
  setInterval(() => tx.send(Math.random()), 200)
  return rx
}

setImmediate(async () => {
  // combine streams into string|number[]
  const rx = select(strings(), numbers())
  for await (const n of rx) {
    console.log(n)
  }
})
```
