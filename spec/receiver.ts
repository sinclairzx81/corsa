import { channel } from "../src/index"
import { expect } from "chai"

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const move = (func: Function) => func()

describe('Receiver<T>', () => {
  it('should recv values (unbounded, manual)', async () => {
    const [tx, rx] = channel()
    tx.send(1)
    tx.send(2)
    tx.send(3)
    tx.send(null)

    const result = await Promise.all([
      rx.next().then(result => result.value),
      rx.next().then(result => result.value),
      rx.next().then(result => result.value),
      rx.next().then(result => result.value),
    ])
    expect(result).to.be.deep.eq([1, 2, 3, null])
  })

  it('should recv values (unbounded, for-await-of)', async () => {
    const [tx, rx] = channel()
    tx.send(1)
    tx.send(2)
    tx.send(3)
    tx.send(null)

    const result = []
    for await (const value of rx) {
      result.push(value)
    }
    expect(result).to.be.deep.eq([1, 2, 3])
  })

  it('should recv values (unbounded, for-await-of, read-first)', async () => {
    return new Promise((resolve, reject) => {
      const [tx, rx] = channel()
      // read
      move(async() => {
        const result = []
        for await (const value of rx) {
          result.push(value)
        }
        expect(result).to.be.deep.eq([1, 2, 3])
        resolve()
      })
      // write
      move(async () => {
        tx.send(1)
        tx.send(2)
        tx.send(3)
        tx.send(null)
      })
    })
  })

  it('should recv values (unbounded, for-await-of, write-first)', async () => {
    return new Promise((resolve, reject) => {
      const [tx, rx] = channel()
      // write
      move(async () => {
        tx.send(1)
        tx.send(2)
        tx.send(3)
        tx.send(null)
      })

      // read
      move(async() => {
        const result = []
        for await (const value of rx) {
          result.push(value)
        }
        expect(result).to.be.deep.eq([1, 2, 3])
        resolve()
      })
    })
  })

  it('should recv values (bounded, manual)', async () => {
    const [tx, rx] = channel(4)
    await tx.send(1)
    await tx.send(2)
    await tx.send(3)
    await tx.send(null)

    const result = await Promise.all([
      rx.next().then(result => result.value),
      rx.next().then(result => result.value),
      rx.next().then(result => result.value),
      rx.next().then(result => result.value),
    ])
    expect(result).to.be.deep.eq([1, 2, 3, null])
  })

  it('should recv values (bounded, for-await-of)', async () => {
    const [tx, rx] = channel(4)
    await tx.send(1)
    await tx.send(2)
    await tx.send(3)
    await tx.send(null)

    const result = []
    for await (const value of rx) {
      result.push(value)
    }
    expect(result).to.be.deep.eq([1, 2, 3])
  })

  it('should recv values (bounded, for-await-of, read-first)', async () => {
    return new Promise((resolve, reject) => {
      const [tx, rx] = channel(4)
      // read
      move(async() => {
        const result = []
        for await (const value of rx) {
          result.push(value)
        }
        expect(result).to.be.deep.eq([1, 2, 3])
        resolve()
      })
      // write
      move(async () => {
        await tx.send(1)
        await tx.send(2)
        await tx.send(3)
        await tx.send(null)
      })
    })
  })

  it('should recv values (bounded, for-await-of, write-first)', async () => {
    return new Promise((resolve, reject) => {
      const [tx, rx] = channel(4)
      // write
      move(async () => {
        await tx.send(1)
        await tx.send(2)
        await tx.send(3)
        await tx.send(null)
      })

      // read
      move(async() => {
        const result = []
        for await (const value of rx) {
          result.push(value)
        }
        expect(result).to.be.deep.eq([1, 2, 3])
        resolve()
      })
    })
  })

  it('should track state during iteration (bounded(1), manual)', async () => {
    return new Promise(async (resolve, reject) => {
      const [tx, rx] = channel(1)
      let state = 0
      move(async () => {
        await tx.send(1)   
        state = 1
        await tx.send(2) 
        state = 2
        await tx.send(3)
        state = 3
      })
      
      // defer to allow move entry.
      setTimeout(async () => {
        expect(state).to.be.eq(1)
        await rx.next() // read: 1
        await delay(1)
        expect(state).to.be.eq(2)
        await rx.next() // read: 2
        await delay(1)
        expect(state).to.be.eq(3)
        await rx.next() // read: 3
        await delay(1)
        resolve()
      })
    })
  })
})