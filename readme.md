# Corsa

Asynchronous channels in JavaScript

[![NPM package](https://badge.fury.io/js/corsa.svg)](https://www.npmjs.com/package/corsa) 
 [![Build Status](https://travis-ci.org/sinclairzx81/corsa.svg?branch=master)](https://travis-ci.org/sinclairzx81/corsa)

```
$ npm install corsa --save
```
```typescript
import { channel } from 'corsa'

const [sender, receiver] = channel()

setTimeout(async () => {
  await sender.send(3)
  await sender.send(2)
  await sender.send(1)
  await sender.end()
}, 0)

...

setTimeout(async () => {
  for await (const value of receiver) {
    console.log(value)
  }
})
```
```
output:
> 3
> 2
> 1
> done
```
## Overview

Corsa is a small library for creating asynchronous channels in JavaScript. It is intended to provide an alternative to event emitters, allowing for finer level control over asynchronous message buffering (back-pressure) by enabling a sender of messages to `await` for messages to be received.

It is recommended that JavaScript environments support `async-await` and `for-await-of`. Additionally, It is recommended that TypeScript users use modern versions of the TypeScript compiler that provide `AsyncGenerator<T>` type in the `ESNext` target.

## channel&lt;T&gt;

A channel is a uni-directional pipe for which values can flow. Calling this function returns a tuple containing a `Sender` and `Receiver`.

```typescript
const [sender, receiver] = channel()
```
## Sender&lt;T&gt;

A `Sender` allows the caller to send values into the channel to be received by its `Receiver`. The `Sender` provides two functions, `send()` and `end()`. Both of these functions can be awaited.

The following code creates a `channel` and sends the values 1, 2, 3 and then ends the channel. The sender will `await` at each send. 

```typescript
const [sender, receiver] = channel<number>()
await sender.send(1) // wait for receipt
await sender.send(2) // wait for receipt
await sender.send(3) // wait for receipt
await sender.end()   // wait for receipt
```
Contrast this with the following code that sends 1, 2, 3 without awaiting. When sending without `await` the channel will async buffer the values. In the following example, the `Sender` awaits the `end()` call, which indicates the `Receiver` will have received all preceeding values as soon as the `end()` promise as resolves.

```typescript
const [sender, receiver] = channel<number>()
sender.send(1)       // buffer 1
sender.send(2)       // buffer 2
sender.send(3)       // buffer 3
await sender.end()   // wait for receipt
```
Note: the call to `end()` results in an `Eof` message being sent to the channel. See `Receiver` for details.

## Receiver&lt;T&gt;

A `Receiver` is used to receive values sent from a `Sender`. It provides a `receive()`function to receive exactly one value, `Receiver` implements `[Symbol.asyncIterator]` which allows it to work with `for-await-of`. The `Receiver` also provides an `end()` function to inform the `Sender` that the `Receiver` won't accept more values. 

The `Receiver` `recieve()` function will return a promise that will resolve as soon as the `Sender` sender sends a value. If the `Sender` has already sent a value this `Promise` will resolve immediately. This function will return either `T` or `typeof Eof`. If `Eof` is received, all subsequent attempts to `receive()` will result in a `Eof`.

The following code will receive all values in a channel using the `receive()` function to pull new values one by one.

```typescript
import { channel, Eof } from 'corsa'

const [sender, receiver] = channel<number>()

setTimeout(async () => {
  await sender.send(3)
  await sender.send(2)
  await sender.send(1)
  await sender.end()
}, 0)

setTimeout(async () => {
  while(true) {
    const value = await receiver.receive()
    if(value === Eof) {
      break // expect no more values
    }
    console.log(value)
  }
  console.log('done')
}, 0)
```
The `Receiver` also implements `[Symbol.asyncIterator]`, so its possible to rewrite this code as follows. Note, checking for `Eof` is not required when using `for-await-of`.

```typescript
import { channel } from 'corsa'

const [sender, receiver] = channel<number>()
setTimeout(async () => {
  await sender.send(3)
  await sender.send(2)
  await sender.send(1)
  await sender.end()
}, 0)

setTimeout(async () => {
  for await (const value of receiver) {
    console.log(value)
  }
  console.log('done')
}, 0)
```
A `Receiver` may choose to `end()` receiving values. This allows for a kind of cancellation. When a `Receiver` calls `end()`, all values that have been sent to the channel will result in errors at `Sender`. Additionally subsequent `send()` will `throw` with a `Error(Receiver has closed this channel)` error.

```typescript
const [sender, receiver] = channel<number>()

// Attempt to send a value
sender.send(1).catch(error => console.log(error))

// End receiver without receiving a value. This
// causes the preceeding 'send' to throw.
receiver.end()

```

## select

Corsa provides a simple channel `select` function. It allows multiple `Receiver<T>` types to be combined into a single stream.

```typescript
import { channel, select, Receiver } from 'corsa'

// A sequence of strings
function strings(): Receiver<string> {
  const [sender, receiver] = channel<string>()
  setInterval(() => sender.send('hello world'), 100)
  return receiver
}
// A sequence of numbers
function numbers(): Receiver<number> {
  const [sender, receiver] = channel<number>()
  setInterval(() => sender.send(Math.random()), 100)
  return receiver
}

async function start() {
  // combine into single sequence.
  const receiver = select(strings(), numbers())
  for await (const value of receiver) {
    console.log(value) // string | number
  }
}
```
## duplex

Returns a bi-direction messaging channel. Useful for creating actor like systems in JavaScript.

```typescript
import { duplex, Sender, Receiver } from 'corsa'

async function actorA(sender: Sender<number>, receiver: Receiver<number>) {
    await sender.send(0)
    for await(const value of receiver) {
      console.log('actorA received:', value)
      await sender.send(value + 1)
    }
}

async function actorB(sender: Sender<number>, receiver: Receiver<number>) {
  for await(const value of receiver) {
    console.log('actorB received:', value)
    await sender.send(value + 1)
  }
}

// Create duplex and pass left into actorA, right into actorB. This
// allows actorA and actorB to communicate via their channels.
const [left, right] = duplex<number>()
actorA(...left)
actorB(...right)
```
```
> actorB received: 0
> actorA received: 1
> actorB received: 2
> actorA received: 3
> actorB received: 4
> actorA received: 5
> ...
```