import { channel } from '../src/index'

describe('Sender<T>', () => {
  it('should send values (unbounded, no-await)', async () => {
    const [tx, _] = channel()
    tx.send(1)
    tx.send(2)
    tx.send(3)
  })
  it('should send values (unbounded, await)', async () => {
    const [tx, _] = channel()
    await tx.send(1)
    await tx.send(2)
    await tx.send(3)
  })
  it('should send values (bounded, no-await)', async () => {
    const [tx, _] = channel(3)
    tx.send(1)
    tx.send(2)
    tx.send(3)
  })
  it('should send values (bounded, await)', async () => {
    const [tx, _] = channel(3)
    await tx.send(1)
    await tx.send(2)
    await tx.send(3)
  })
  it('should defer (bounded, await, expect timeout)', () => {
    return new Promise(async (resolve, reject) => {
      const [tx, _] = channel(3)
      await tx.send(1)
      await tx.send(2)
      await tx.send(3)
      setTimeout(() => resolve(), 250)
      tx.send(4).then(() => reject())
    })
  })
  it('should defer and resume (bounded, await)', () => {
    return new Promise(async (resolve, reject) => {
      const [tx, rx] = channel(3)
      await tx.send(1)
      await tx.send(2)
      await tx.send(3)
      
      tx.send(4).then(() => resolve())
      setTimeout(() => rx.next(), 100) // resolve first
      setTimeout(() => reject(), 200)  // resolve last
    })
  })
})