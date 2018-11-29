import { channel } from "../src/index"
import { expect } from "chai"

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const move = (func: Function) => func()

describe('Reader<T>', () => {
  it('should recv values (unbounded, manual)', async () => {
    const { writer, reader } = channel()
    writer.write(1)
    writer.write(2)
    writer.write(3)
    writer.end()

    const result = await Promise.all([
      reader.read(),
      reader.read(),
      reader.read(),
      reader.read()
    ])
    expect(result).to.be.deep.eq([1, 2, 3, undefined])
  })

  it('should recv values (unbounded, for-await-of)', async () => {
    const { writer, reader } = channel()
    writer.write(1)
    writer.write(2)
    writer.write(3)
    writer.end()

    const result = []
    for await (const value of reader) {
      result.push(value)
    }
    expect(result).to.be.deep.eq([1, 2, 3])
  })

  it('should recv values (unbounded, for-await-of, read-first)', async () => {
    return new Promise((resolve, _) => {
      const { writer, reader } = channel()
      // read
      move(async() => {
        const result = []
        for await (const value of reader) {
          result.push(value)
        }
        expect(result).to.be.deep.eq([1, 2, 3])
        resolve()
      })
      // write
      move(async () => {
        writer.write(1)
        writer.write(2)
        writer.write(3)
        writer.end()
      })
    })
  })

  it('should recv values (unbounded, for-await-of, write-first)', async () => {
    return new Promise((resolve, _) => {
      const { writer, reader } = channel()
      // write
      move(async () => {
        writer.write(1)
        writer.write(2)
        writer.write(3)
        writer.end()
      })

      // read
      move(async() => {
        const result = []
        for await (const value of reader) {
          result.push(value)
        }
        expect(result).to.be.deep.eq([1, 2, 3])
        resolve()
      })
    })
  })

  it('should recv values (bounded, manual)', async () => {
    const { writer, reader } = channel(4)
    await writer.write(1)
    await writer.write(2)
    await writer.write(3)
    await writer.end()

    const result = await Promise.all([
      reader.read(),
      reader.read(),
      reader.read(),
      reader.read(),
    ])
    expect(result).to.be.deep.eq([1, 2, 3, undefined])
  })

  it('should recv values (bounded, for-await-of)', async () => {
    const { writer, reader } = channel(4)
    await writer.write(1)
    await writer.write(2)
    await writer.write(3)
    await writer.end()

    const result = []
    for await (const value of reader) {
      result.push(value)
    }
    expect(result).to.be.deep.eq([1, 2, 3])
  })

  it('should recv values (bounded, for-await-of, read-first)', async () => {
    return new Promise((resolve, _) => {
      const { writer, reader } = channel(4)
      // read
      move(async() => {
        const result = []
        for await (const value of reader) {
          result.push(value)
        }
        expect(result).to.be.deep.eq([1, 2, 3])
        resolve()
      })
      // write
      move(async () => {
        await writer.write(1)
        await writer.write(2)
        await writer.write(3)
        await writer.end()
      })
    })
  })

  it('should recv values (bounded, for-await-of, write-first)', async () => {
    return new Promise((resolve, _) => {
      const { writer, reader } = channel(4)
      // write
      move(async () => {
        await writer.write(1)
        await writer.write(2)
        await writer.write(3)
        await writer.end()
      })

      // read
      move(async() => {
        const result = []
        for await (const value of reader) {
          result.push(value)
        }
        expect(result).to.be.deep.eq([1, 2, 3])
        resolve()
      })
    })
  })

  it('should track state during iteration (bounded(1), manual)', async () => {
    return new Promise(async (resolve, reject) => {
      const { writer, reader } = channel(1)
      let state = 0
      move(async () => {
        await writer.write(1)   
        state = 1
        await writer.write(2) 
        state = 2
        await writer.write(3)
        state = 3
      })
      
      // defer to allow move entry.
      setTimeout(async () => {
        expect(state).to.be.eq(1)
        await reader.read() // read: 1
        await delay(1)
        expect(state).to.be.eq(2)
        await reader.read() // read: 2
        await delay(1)
        expect(state).to.be.eq(3)
        await reader.read() // read: 3
        await delay(1)
        resolve()
      })
    })
  })
})