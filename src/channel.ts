/*--------------------------------------------------------------------------

corsa - asynchronous channels in JavaScript

The MIT License (MIT)

Copyright (c) 2020 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

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

import { defer, Resolver, Rejector } from './defer'
import { queue, Enqueue, Dequeue } from './queue'

export const Eof = Symbol('Eof')

enum Status {
    ENDED_BY_SENDER,
    ENDED_BY_RECEIVER,
    OPEN,
}

type Deferred<T> = [Resolver<T>, Rejector]

class Shared {
    constructor(public status: Status, public awaiters: Array<Deferred<void>>) {

    }
}

/** An error that is thrown when a Sender attempts to send subsequent values after calling end. */
export class SenderEndedError extends Error {
    constructor() {
        super('Cannot send to to a closed channel.')
    }
}

/** An error that is thrown when a Sender attempts to send when the Receiver has ended the channel. */
export class ReceiverEndedError extends Error {
    constructor() {
        super('Cannot send to closed channel because the Receiver has called end.')
    }
}

/** The sending side of a channel. */
export class Sender<T> {
    constructor(
        private readonly shared: Shared,
        private readonly enqueue: Enqueue<T | typeof Eof>,

    ) { }

    /** Sends one value to this channel. Returns a Promise that resolves once the value has been received. */
    public async send(value: T): Promise<void> {
        this.assert()
        const [promise, resolve, reject] = defer<void>()
        this.shared.awaiters.push([resolve, reject])
        this.enqueue(value)
        return await promise
    }

    /** End this channel. Returns a Promise that resolves once an Eof has been received. */
    public async end(): Promise<void> {
        this.assert()
        const [promise, resolve, reject] = defer<void>()
        this.shared.awaiters.push([resolve, reject])
        this.enqueue(Eof)
        return await promise
    }

    /** Asserts if a value can be sent. */
    private assert() {
        switch (this.shared.status) {
            case Status.ENDED_BY_RECEIVER: throw new ReceiverEndedError()
            case Status.ENDED_BY_SENDER: throw new SenderEndedError()
        }
    }
}

/** The receiving side of a channel. */
export class Receiver<T> {
    constructor(
        private readonly shared: Shared,
        private readonly dequeue: Dequeue<T | typeof Eof>
    ) { }
    
    /** Receives one value from this channel or Eof if this Sender has called end. */
    public async receive(): Promise<T | typeof Eof> {
        switch(this.shared.status) {
            case Status.OPEN: {
                const value = await this.dequeue()
                this.shared.status = value === Eof ? Status.ENDED_BY_SENDER : this.shared.status
                const [resolve, _] = this.shared.awaiters.shift()!
                resolve()
                return value
            }
            case Status.ENDED_BY_SENDER: {
                while (this.shared.awaiters.length > 0) {
                    const [_, reject] = this.shared.awaiters.shift()!
                    reject(new SenderEndedError())
                }
                return Eof
            }
            case Status.ENDED_BY_RECEIVER: {
                return Eof
            }
        }
    }

    /** Ends this channel. Causes the Sender to 'throw' if there are subsequent attempts to send. */
    public end(): void {
        this.shared.status = Status.ENDED_BY_RECEIVER
        while (this.shared.awaiters.length > 0) {
            const [_, reject] = this.shared.awaiters.shift()!
            reject(new ReceiverEndedError())
        }
    }

    /** The async iterator for this receiver. */
    public async *[Symbol.asyncIterator](): AsyncGenerator<T> {
        while (true) {
            const next = await this.receive()
            if (next === Eof) {
                return
            } else {
                yield next
            }
        }
    }
}

/** Creates an asynchronous channel. Returns a Sender and Receiver used to send and receive values on the channel. */
export function channel<T = any>(): [Sender<T>, Receiver<T>] {
    const [enqueue, dequeue] = queue<T | typeof Eof>()
    const shared = new Shared(Status.OPEN, [])
    const sender = new Sender<T>(shared, enqueue)
    const receiver = new Receiver<T>(shared, dequeue)
    return [sender, receiver]
}
