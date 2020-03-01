import { expect }  from 'chai'
import { channel } from '../src'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const move  = (func: Function) => func()

describe('Receiver<T>', () => {
  it('should pass', async () => {
    // const { writable, readable } = channel()
    // writable.write(1)
    // writable.write(2)
    // writable.write(3)
    // writable.end()
    // const result = await Promise.all([
    //   readable.read(),
    //   readable.read(),
    //   readable.read(),
    //   readable.read()
    // ])
    // expect(result).to.be.deep.eq([1, 2, 3, undefined])
  })
})