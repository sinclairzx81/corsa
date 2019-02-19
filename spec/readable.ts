import { expect }  from 'chai'
import { channel } from '../src'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const move  = (func: Function) => func()

describe('Readable<T>', () => {
  it('should recv values (unbounded, manual)', async () => {
    const { writable, readable } = channel()
    writable.write(1)
    writable.write(2)
    writable.write(3)
    writable.end()
    const result = await Promise.all([
      readable.read(),
      readable.read(),
      readable.read(),
      readable.read()
    ])
    expect(result).to.be.deep.eq([1, 2, 3, undefined])
  })

  it('should recv values (unbounded, for-await-of)', async () => {
    const { writable, readable } = channel()
    writable.write(1)
    writable.write(2)
    writable.write(3)
    writable.end()

    const result = []
    for await (const value of readable) {
      result.push(value)
    }
    expect(result).to.be.deep.eq([1, 2, 3])
  })

  it('should recv values (unbounded, for-await-of, read-first)', async () => {
    return new Promise((resolve, _) => {
      const { writable, readable } = channel()
      // read
      move(async() => {
        const result = []
        for await (const value of readable) {
          result.push(value)
        }
        expect(result).to.be.deep.eq([1, 2, 3])
        resolve()
      })
      // write
      move(async () => {
        writable.write(1)
        writable.write(2)
        writable.write(3)
        writable.end()
      })
    })
  })

  it('should recv values (unbounded, for-await-of, write-first)', async () => {
    return new Promise((resolve, _) => {
      const { writable, readable } = channel()
      // write
      move(async () => {
        writable.write(1)
        writable.write(2)
        writable.write(3)
        writable.end()
      })

      // read
      move(async() => {
        const result = []
        for await (const value of readable) {
          result.push(value)
        }
        expect(result).to.be.deep.eq([1, 2, 3])
        resolve()
      })
    })
  })

  it('should recv values (bounded, manual)', async () => {
    const { writable, readable } = channel(4)
    await writable.write(1)
    await writable.write(2)
    await writable.write(3)
    await writable.end()

    const result = await Promise.all([
      readable.read(),
      readable.read(),
      readable.read(),
      readable.read(),
    ])
    expect(result).to.be.deep.eq([1, 2, 3, undefined])
  })

  it('should recv values (bounded, for-await-of)', async () => {
    const { writable, readable } = channel(4)
    await writable.write(1)
    await writable.write(2)
    await writable.write(3)
    await writable.end()

    const result = []
    for await (const value of readable) {
      result.push(value)
    }
    expect(result).to.be.deep.eq([1, 2, 3])
  })

  it('should recv values (bounded, for-await-of, read-first)', async () => {
    return new Promise((resolve, _) => {
      const { writable, readable } = channel(4)
      // read
      move(async() => {
        const result = []
        for await (const value of readable) {
          result.push(value)
        }
        expect(result).to.be.deep.eq([1, 2, 3])
        resolve()
      })
      // write
      move(async () => {
        await writable.write(1)
        await writable.write(2)
        await writable.write(3)
        await writable.end()
      })
    })
  })

  it('should recv values (bounded, for-await-of, write-first)', async () => {
    return new Promise((resolve, _) => {
      const { writable, readable } = channel(4)
      // write
      move(async () => {
        await writable.write(1)
        await writable.write(2)
        await writable.write(3)
        await writable.end()
      })

      // read
      move(async() => {
        const result = []
        for await (const value of readable) {
          result.push(value)
        }
        expect(result).to.be.deep.eq([1, 2, 3])
        resolve()
      })
    })
  })

  it('should track state during iteration (bounded(1), manual)', async () => {
    return new Promise(async (resolve, reject) => {
      const { writable, readable } = channel(1)
      let state = 0
      move(async () => {
        await writable.write(1)   
        state = 1
        await writable.write(2) 
        state = 2
        await writable.write(3)
        state = 3
      })
      
      // defer to allow move entry.
      setTimeout(async () => {
        expect(state).to.be.eq(1)
        await readable.read() // read: 1
        await delay(1)
        expect(state).to.be.eq(2)
        await readable.read() // read: 2
        await delay(1)
        expect(state).to.be.eq(3)
        await readable.read() // read: 3
        await delay(1)
        resolve()
      })
    })
  })
})