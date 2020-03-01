import { expect } from 'chai'
import { channel, into, eof } from '../src'

describe('Receiver<T>', () => {
  it('should receive one value', async () => {
    const [sender, receiver] = channel()
    const [_, b] = await Promise.all([
      into(async () => {
        await sender.send(0)
      }),
      into(async () => {
        return receiver.receive()
      })
    ])
    expect(b).to.eq(0)
  })

  it('should receive many values', async () => {
    const [sender, receiver] = channel()
    const [_, b] = await Promise.all([
      into(async () => {
        await sender.send(0)
        await sender.send(1)
        await sender.send(2)
      }),
      into(async () => {
        return [
          await receiver.receive(), 
          await receiver.receive(),
          await receiver.receive()
        ]
      })
    ])
    expect(b[0]).to.eq(0)
    expect(b[1]).to.eq(1)
    expect(b[2]).to.eq(2)
  })

  it('should receive many values incl end', async () => {
    const [sender, receiver] = channel()
    const [_, b] = await Promise.all([
      into(async () => {
        await sender.send(0)
        await sender.send(1)
        await sender.send(2)
        await sender.end()
      }),
      into(async () => {
        return [
          await receiver.receive(), 
          await receiver.receive(),
          await receiver.receive(),
          await receiver.receive()
        ]
      })
    ])
    expect(b[0]).to.eq(0)
    expect(b[1]).to.eq(1)
    expect(b[2]).to.eq(2)
    expect(b[3]).to.eq(eof)
  })

  it('should receive many values incl end then receive eof for all subsequent receives', async () => {
    const [sender, receiver] = channel()
    const [a, b] = await Promise.all([
      into(async () => {
        await sender.send(0)
        await sender.send(1)
        await sender.send(2)
        await sender.end()
      }),
      into(async () => {
        return [
          await receiver.receive(), // 0
          await receiver.receive(), // 1
          await receiver.receive(), // 2
          await receiver.receive(), // eof
          await receiver.receive(), // eof
          await receiver.receive(), // eof
          await receiver.receive(), // eof
        ]
      })
    ])
    expect(b[0]).to.eq(0)
    expect(b[1]).to.eq(1)
    expect(b[2]).to.eq(2)
    expect(b[3]).to.eq(eof)
    expect(b[4]).to.eq(eof)
    expect(b[5]).to.eq(eof)
    expect(b[6]).to.eq(eof)
  })
  
  // it('(concurrent) should receive many values incl end then receive eof for all subsequent receives', async () => {
  //   const [sender, receiver] = channel()
  //   const [_, b] = await Promise.all([
  //     into(async () => {
  //       await sender.send(0)
  //       await sender.send(1)
  //       await sender.send(2)
  //       await sender.end()
  //     }),
  //     into(async () => {
  //       return Promise.all([
  //         receiver.receive(), // 0
  //         receiver.receive(), // 1
  //         receiver.receive(), // 2
  //         receiver.receive(), // eof
  //         receiver.receive(), // eof
  //         receiver.receive(), // eof
  //         receiver.receive(), // eof
  //       ])
  //     })
  //   ])
  //   expect(b[0]).to.eq(0)
  //   expect(b[1]).to.eq(1)
  //   expect(b[2]).to.eq(2)
  //   expect(b[3]).to.eq(eof)
  //   expect(b[4]).to.eq(eof)
  //   expect(b[5]).to.eq(eof)
  //   expect(b[6]).to.eq(eof)
  // })

  it('should await indefinately when the sender has sent no values.', async () => {
    const [_, receiver] = channel()
    const [a, b] = await Promise.all([
      into(async () => {
        // send nothing
      }),
      into(async () => {
        return Promise.race([
          new Promise<boolean>(resolve => setTimeout(() => resolve(true), 100)),
          receiver.receive().then(() => false)
        ])
      })
    ])
    expect(b).to.eq(true)
  }).timeout(1000)

  it('should cause the sender to throw when calling end on the receiver.', async () => {
    const [sender, receiver] = channel()
    const [a, b] = await Promise.all([
      into(async () => {
        return [
          await sender.send(void 0).then(() => false).catch(() => true),
          await sender.send(void 0).then(() => false).catch(() => true),
          await sender.send(void 0).then(() => false).catch(() => true),
        ]
      }),
      into(async () => {
        receiver.end()
      })
    ])
    expect(a[0]).to.eq(true)
    expect(a[1]).to.eq(true)
    expect(a[2]).to.eq(true)
  })

  it('should cause the sender to throw when calling end on the receiver after receiving one value', async () => {
    const [sender, receiver] = channel()
    const [a, b] = await Promise.all([
      into(async () => {
        return [
          await sender.send(void 0).then(() => true).catch(() => false),
          await sender.send(void 0).then(() => false).catch(() => true),
          await sender.send(void 0).then(() => false).catch(() => true),
        ]
      }),
      into(async () => {
        await receiver.receive()
        receiver.end()
      })
    ])
    expect(a[0]).to.eq(true)
    expect(a[1]).to.eq(true)
    expect(a[2]).to.eq(true)
  })

  it('should support async iteration.', async () => {
    const [sender, receiver] = channel()
    const [_, b] = await Promise.all([
      into(async () => {
          await sender.send(0)
          await sender.send(1)
          await sender.send(2)
          await sender.end()
      }),
      into(async () => {
        const buffer = []
        for await(const value of receiver) {
          buffer.push(value)
        }
        buffer.push(eof)
        return buffer
      })
    ])
    expect(b[0]).to.eq(0)
    expect(b[1]).to.eq(1)
    expect(b[2]).to.eq(2)
    expect(b[3]).to.eq(eof)
  })
})