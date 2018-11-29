import { channel } from '../src/index'

describe('Writer<T>', () => {
  it('should send values (unbounded, no-await)', async () => {
    const { writer } = channel()
    writer.write(1)
    writer.write(2)
    writer.write(3)
  })
  it('should send values (unbounded, await)', async () => {
    const { writer } = channel()
    await writer.write(1)
    await writer.write(2)
    await writer.write(3)
  })
  it('should send values (bounded, no-await)', async () => {
    const { writer } = channel(3)
    writer.write(1)
    writer.write(2)
    writer.write(3)
  })
  it('should send values (bounded, await)', async () => {
    const { writer } = channel(3)
    await writer.write(1)
    await writer.write(2)
    await writer.write(3)
  })
  it('should defer (bounded, await, expect timeout)', () => {
    return new Promise(async (resolve, reject) => {
      const { writer } = channel(3)
      await writer.write(1)
      await writer.write(2)
      await writer.write(3)
      setTimeout(() => resolve(), 250)
      writer.write(4).then(() => reject())
    })
  })
  it('should defer and resume (bounded, await)', () => {
    return new Promise(async (resolve, reject) => {
      const  { writer, reader } = channel(3)
      await writer.write(1)
      await writer.write(2)
      await writer.write(3)
      
      writer.write(4).then(() => resolve())
      setTimeout(() => reader.read(), 100) // resolve first
      setTimeout(() => reject(), 200)  // resolve last
    })
  })
})