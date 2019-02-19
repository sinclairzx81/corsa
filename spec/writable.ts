import { channel } from '../src'

describe('Writable<T>', () => {
  it('should send values (unbounded, no-await)', async () => {
    const { writable } = channel()
    writable.write(1)
    writable.write(2)
    writable.write(3)
  })
  it('should send values (unbounded, await)', async () => {
    const { writable } = channel()
    await writable.write(1)
    await writable.write(2)
    await writable.write(3)
  })
  it('should send values (bounded, no-await)', async () => {
    const { writable } = channel(3)
    writable.write(1)
    writable.write(2)
    writable.write(3)
  })
  it('should send values (bounded, await)', async () => {
    const { writable } = channel(3)
    await writable.write(1)
    await writable.write(2)
    await writable.write(3)
  })
  it('should defer (bounded, await, expect timeout)', () => {
    return new Promise(async (resolve, reject) => {
      const { writable } = channel(3)
      await writable.write(1)
      await writable.write(2)
      await writable.write(3)
      setTimeout(() => resolve(), 250)
      writable.write(4).then(() => reject())
    })
  })
  it('should defer and resume (bounded, await)', () => {
    return new Promise(async (resolve, reject) => {
      const  { writable, readable } = channel(3)
      await writable.write(1)
      await writable.write(2)
      await writable.write(3)
      
      writable.write(4).then(() => resolve())
      setTimeout(() => readable.read(), 100) // resolve first
      setTimeout(() => reject(), 200)      // resolve last
    })
  })
})