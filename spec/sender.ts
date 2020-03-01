import { expect } from 'chai'
import { channel, into, Eof } from '../src'

describe('Sender<T>', () => {
  it('should send one value', async () => {
    const [sender, receiver] = channel()
    const [a, b] = await Promise.all([
      into(async () => {
        await sender.send(0)
        return true
      }),
      into(async () => {
        return receiver.receive()
      })
    ])
    expect(a).to.eq(true)
    expect(b).to.eq(0)
  })

  it('should send many values', async () => {
    const [sender, receiver] = channel()
    const [a, b] = await Promise.all([
      into(async () => {
        await sender.send(0)
        await sender.send(1)
        await sender.send(2)
        return true
      }),
      into(async () => {
        const a = await receiver.receive()
        const b = await receiver.receive()
        const c = await receiver.receive()
        return [a, b, c]
      })
    ])
    expect(a).to.eq(true)
    expect(b[0]).to.eq(0)
    expect(b[1]).to.eq(1)
    expect(b[2]).to.eq(2)
  })

  it('should send many values then end', async () => {
    const [sender, receiver] = channel()
    const [a, b] = await Promise.all([
      into(async () => {
        await sender.send(0)
        await sender.send(1)
        await sender.send(2)
        await sender.end()
        return true
      }),
      into(async () => {
        const a = await receiver.receive()
        const b = await receiver.receive()
        const c = await receiver.receive()
        const d = await receiver.receive()
        return [a, b, c, d]
      })
    ])
    expect(a).to.eq(true)
    expect(b[0]).to.eq(0)
    expect(b[1]).to.eq(1)
    expect(b[2]).to.eq(2)
    expect(b[3]).to.eq(Eof)
  })

  it('should send many values then end without await', async () => {
    const [sender, receiver] = channel()
    const [a, b] = await Promise.all([
      into(async () => {
        sender.send(0)
        sender.send(1)
        sender.send(2)
        sender.end()
        return true
      }),
      into(async () => {
        const a = await receiver.receive()
        const b = await receiver.receive()
        const c = await receiver.receive()
        const d = await receiver.receive()
        return [a, b, c, d]
      })
    ])
    expect(a).to.eq(true)
    expect(b[0]).to.eq(0)
    expect(b[1]).to.eq(1)
    expect(b[2]).to.eq(2)
    expect(b[3]).to.eq(Eof)
  })

  it('should send one value but throw (because the receiver ends before receiving any values)', async () => {
    const [sender, receiver] = channel()
    const [a, _] = await Promise.all([
      into(async () => {
        return sender.send(0).then(() => false).catch(() => true)
      }),
      into(async () => {
        receiver.end()
      })
    ])
    expect(a).to.eq(true)
  })

  it('should send two values but throw on second (because the receiver reads one but ends before receiving the second)', async () => {
    const [sender, receiver] = channel()
    const [a, _] = await Promise.all([
      into(async () => {
        const a = await sender.send(0).then(() => true).catch(() => false)
        const b = await sender.send(1).then(() => false).catch(() => true)
        return [a, b]
      }),
      into(async () => {
        await receiver.receive()
        receiver.end()
      })
    ])
    expect(a[0]).to.eq(true)
    expect(a[1]).to.eq(true)
  })

  it('should send two values but throw on both (because the receiver ended before receiving either)', async () => {
    const [sender, receiver] = channel()
    const [a, _] = await Promise.all([
      into(async () => {
        const a = await sender.send(0).then(() => false).catch(() => true)
        const b = await sender.send(1).then(() => false).catch(() => true)
        return [a, b]
      }),
      into(async () => {
        receiver.end()
      })
    ])
    expect(a[0]).to.eq(true)
    expect(a[1]).to.eq(true)
  })

  it('should send first, then end, then throw on second (because the sender ended after the first was sent)', async () => {
    const [sender, receiver] = channel()
    const [a, b] = await Promise.all([
      into(async () => {
        const a = await sender.send(0).then(() => true).catch(() => false)
        await sender.end()
        const b = await sender.send(1).then(() => false).catch(() => true)
        return [a, b]
      }),
      into(async () => {
        const a = await receiver.receive()
        const b = await receiver.receive()
        const c = await receiver.receive()
        const d = await receiver.receive()
        return [a, b, c, d]
      })
    ])
    
    expect(a[0]).to.eq(true)
    expect(a[1]).to.eq(true)

    expect(b[0]).to.eq(0)
    expect(b[1]).to.eq(Eof)
    expect(b[2]).to.eq(Eof)
    expect(b[3]).to.eq(Eof)
  })

  it('(non-await) should send first, then end, then throw on second (because the sender ended after the first value was sent)', async () => {
    const [sender, receiver] = channel()
    const [a, b] = await Promise.all([
      into(async () => {
        const a = sender.send(0).then(() => true).catch(() => false)
        sender.end()
        const b = sender.send(1).then(() => false).catch(() => true)
        return [await a, await b]
      }),
      into(async () => {
        const a = await receiver.receive()
        const b = await receiver.receive()
        const c = await receiver.receive()
        const d = await receiver.receive()
        return [a, b, c, d]
      })
    ])
    
    expect(a[0]).to.eq(true)
    expect(a[1]).to.eq(true)

    expect(b[0]).to.eq(0)
    expect(b[1]).to.eq(Eof)
    expect(b[2]).to.eq(Eof)
    expect(b[3]).to.eq(Eof)
  })
})