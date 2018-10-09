# async-channels

An experiment using JavaScript's `AsyncIterator<T>` to build fast / memory effecient uni-directional channels in nodejs.

```typescript
import { channel } from './channels'

const [producer, consumer] = channel()

// generate stream
setImmediate(async () => { 
  await producer.send(0)
  await producer.send(1)
  await producer.send(2)
  await producer.send(3)
  await producer.send(null) // eof
})
...
for await (const value of consumer) {
  console.log(value)
}
console.log('done')
```

## overview

This project is a experimental implementation of JavaScript's `AsyncIterator<T>` build asynchronous `pull` based channels in JavaScript. This project seeks to provide a fast / memory effecient means of streaming data asynchronouly which does not incur exceessive buffering or asynchronous overlap in high frequency messaging scenarios.

This project makes heavy use of `async/await` and JavaScripts `for await-of` syntax. 

## channel

A channel is a uni-directional pipe for which data can flow. The following code creates an `unbounded` channel which allows for near infinite buffering of messages between `sender` and `receiver`. The call to channel returns a `tuple` type containing a `sender` and `receiver` pair.

```typescript
const [tx, rx] = channel()
```
The following creates a bounded channel which allows for only `5` (see bounded vs unbounded)

```typescript
const [tx, rx] = channel(5)
```

## sending

The following code create a unbounded channel and sends 3 values to it `1, 2, 3` following by a `null`. The `null` is a signal to the receiver that the stream of values has finished. This will end iteration of a `for await-of` block. 

```typescript
const [tx, rx] = channel()

tx.send(1)
tx.send(2)
tx.send(3)
tx.send(null)

```
## receiving

The following code receives values. Note that in order to receive values, one ideally should be within a `async` block. below we use setImmediate to move into a `block` for iteration.

```typescript

const [tx, rx] = channel()
tx.send(1)
tx.send(2)
tx.send(3)
tx.send(null)

setImmediate(async () => {
  for await (const value of rx) {
    console.log(value)
  }
})
// prints: 1, 2, 3
```

Additionally, the `receiver` implements the `AsyncIterator` generator protocol, so one can pull values in the following way.

```typescript
const [tx, rx] = channel()
tx.send(1)
tx.send(2)
tx.send(3)
tx.send(null)

rx.next().then(result => result.value) // 1
rx.next().then(result => result.value) // 2
rx.next().then(result => result.value) // 3
rx.next().then(result => result.value) // null

```

## bounded vs unbounded

In this library, the `bound` given to a channel acts as a barrier for the `sender` to defer it from sending values
when exceeding an internal limit (the `bound`). The deferring of the `send` is handled by `await` at the send call site.

```typescript
const [tx, rx] = channel(5)
await tx.send(0)
await tx.send(1)
await tx.send(2)
await tx.send(3)
await tx.send(4) 
await tx.send(5) // blocks      <--+ receive one unblocks this send.
                 //                |
...              //                | 
                 //                |
rx.next()        // unblocks ------+
```
The effect of this is that sending logic can be suspended for a time until the receiver has received (and processed) previous values. This mechanism primarily helps to mitigate `back pressure` but preventing new values being sent faster than the receiver can receive.

## select

This library provides a simple channel `select` similar to Gos channel select.

```typescript
import { channel, Receiver, select } from './channels'

// stream an array of strings
function strings(): Receiver<string> {
  const [tx, rx] = channel<string>()
  setInterval(() => tx.send('hello world'), 100)
  return rx
}
// stream an array of numbers
function numbers(): Receiver<number> {
  const [tx, rx] = channel<number>()
  setInterval(() => tx.send(Math.random()), 200)
  return rx
}

setImmediate(async () => {
  // combine streams into string|number[]
  const receiver = select(strings(), numbers())
  for await (const value of receiver) {
    console.log(value)
  }
})
```

# tasks

The following tasks are supported

```
npm run clean # cleans this project.
npm run build # builds this project to ./bin.
npm run spec  # executes specification for this project.
npm run start # runs ./src/index.ts in watch mode.
npm run lint  # lints this project
```