import { source } from "../src/index"
import { expect } from "chai"

const empty = () => source<number>(sender => {
  sender.send(null)
})

const create = <T>(array: T[]) => source<T>(sender => {
  for(const value of array) {
    sender.send(value)
  }
  sender.send(null)
})

const ordered = () => source<number>(sender => {
  sender.send(0)
  sender.send(1)
  sender.send(2)
  sender.send(3)
  sender.send(4)
  sender.send(5)
  sender.send(6)
  sender.send(7)
  sender.send(8)
  sender.send(9)
  sender.send(null)
})

const unordered = () => source<number>(sender => {
  sender.send(6)
  sender.send(2)
  sender.send(9)
  sender.send(0)
  sender.send(5)
  sender.send(1)
  sender.send(8)
  sender.send(7)
  sender.send(4)
  sender.send(3)
  sender.send(null)
})

describe('Queryable<T>', () => {
  it('should produce `aggregate` result (ok)', async () => {
    const result = await ordered().aggregate((acc, c) => acc + c, 0)
    expect(result).to.be.eq(45)
  })

  it('should produce `all` result (ok)', async () => {
    const result = await ordered().all(n => n < 10)
    expect(result).to.be.true
  })

  it('should produce `all` result (inverse)', async () => {
    const result = await ordered().all(n => n > 10)
    expect(result).to.be.false
  })

  it('should produce `any` result (ok)', async () => {
    const result = await ordered().any(n => n < 10)
    expect(result).to.be.true
  })

  it('should produce `any` result (inverse)', async () => {
    const result = await ordered().any(n => n > 10)
    expect(result).to.be.false
  })

  it('should produce `average` result (ok)', async () => {
    const result = await ordered().average(n => n )
    expect(result).to.be.eq(4.5)
  })

  it('should produce `concat` result (ok)', async () => {
    const a = ordered()
    const b = ordered().map(n => n + 10)
    const c = await a.concat(b).collect()
    expect(c).to.be.deep.eq([
      0,  1,  2,  3,  4,  5,  6,  7,  8,  9,
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19
    ])
  })

  it('should produce `count` result (ok)', async () => {
    const result = await ordered().count()
    expect(result).to.be.eq(10)
  })

  it('should produce `distinct` result (ok)', async () => {
    const result = await ordered().concat(ordered()).distinct().collect()
    expect(result).to.be.deep.eq([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9
    ])
  })

  it('should produce `elementAt` result (ok)', async () => {
    const result = await ordered().elementAt(4)
    expect(result).to.be.eq(4)
  })

  it('should produce `elementAt` result (throw)', async () => {
    try {
      await ordered().elementAt(99)
    } catch {
      return
    }
    throw Error('expected throw')
  })

  it('should produce `elementAtOrDefault` result (ok)', async () => {
    const result = await ordered().elementAtOrDefault(4)
    expect(result).to.be.eq(4)
  })

  it('should produce `elementAtOrDefault` result (undefined)', async () => {
    const result = await ordered().elementAtOrDefault(100)
    expect(result).to.be.eq(undefined)
  })

  it('should produce `first` result (ok)', async () => {
    const result = await ordered().first()
    expect(result).to.be.eq(0)
  })

  it('should produce `first` result (empty | throw)', async () => {
    try {
      await empty().first()
    } catch {
      return
    }
    throw Error('expected throw')
  })

  it('should produce `firstOrDefault` result (ok)', async () => {
    const result = await ordered().firstOrDefault()
    expect(result).to.be.eq(0)
  })

  it('should produce `firstOrDefault` result (empty | undefined)', async () => {
    const result = await empty().firstOrDefault()
    expect(result).to.be.eq(undefined)
  })

  it('should produce `intersect` result (ok)', async () => {
    const a = create([1, 2, 3])
    const b = create([3, 4, 5])
    const c = await a.intersect(b).collect()
    expect(c).to.be.deep.eq([3])
  })

  it('should produce `last` result (ok)', async () => {
    const result = await ordered().last()
    expect(result).to.be.eq(9)
  })
  
  it('should produce `last` result (empty | throw)', async () => {
    try {
      await empty().last()
    } catch {
      return
    }
    throw Error('expected throw')
  })

  it('should produce `lastOrDefault` result (ok)', async () => {
    const result = await ordered().lastOrDefault()
    expect(result).to.be.eq(9)
  })

  it('should produce `lastOrDefault` result (empty | undefined)', async () => {
    const result = await empty().lastOrDefault()
    expect(result).to.be.eq(undefined)
  })

  it('should produce `orderBy` result (ok)', async () => {
    const result = await unordered().orderBy(n => n).collect()
    expect(result).to.be.deep.eq([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9
    ])
  })

  it('should produce `orderByDescending` result (ok)', async () => {
    const result = await unordered().orderByDescending(n => n).collect()
    expect(result).to.be.deep.eq([
      9, 8, 7, 6, 5, 4, 3, 2, 1, 0
    ])
  })

  it('should produce `reverse` result (ok)', async () => {
    const result = await ordered().reverse().collect()
    expect(result).to.be.deep.eq([
      9, 8, 7, 6, 5, 4, 3, 2, 1, 0
    ])
  })

  it('should produce `select` result (ok)', async () => {
    const result = await ordered().select(n => n + 1).collect()
    expect(result).to.be.deep.eq([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10
    ])
  })

  it('should produce `selectMany` result (ok)', async () => {
    const result = await create([[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]]).selectMany(n => n).collect()
    expect(result).to.be.deep.eq([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9
    ])
  })

  it('should produce `single` result (ok)', async () => {
    const result = await ordered().single(n => n === 7)
    expect(result).to.be.eq(7)
  })

  it('should produce `single` result (throw)', async () => {
    try {
      await await ordered().single(n => n === 10)
    } catch {
      return
    }
    throw Error('expected throw')
  })

  it('should produce `singleOrDefault` result (ok)', async () => {
    const result = await ordered().singleOrDefault(n => n === 7)
    expect(result).to.be.eq(7)
  })

  it('should produce `singleOrDefault` result (undefined)', async () => {
    const result = await ordered().singleOrDefault(n => n === 10)
    expect(result).to.be.eq(undefined)
  })

  it('should produce `skip` result (undefined)', async () => {
    const result = await ordered().skip(1).collect()
    expect(result).to.be.deep.eq([
      1, 2, 3, 4, 5, 6, 7, 8, 9
    ])
  })

  it('should produce `sum` result (ok)', async () => {
    const result = await ordered().sum(n => n)
    expect(result).to.be.eq(45)
  })

  it('should produce `take` result (ok)', async () => {
    const result = await ordered().take(5).collect()
    expect(result).to.be.deep.eq([
      0, 1, 2, 3, 4
    ])
  })

  it('should produce `where` result (ok)', async () => {
    const result = await ordered().where(n => n % 2 === 0).collect()
    expect(result).to.be.deep.eq([
      0, 2, 4, 6, 8
    ])
  })

  // ----------------------------------------------
  // common js map, filter, reduce
  // ----------------------------------------------
  it('should produce `map` result (ok)', async () => {
    const result = await ordered().map(n => n + 1).collect()
    expect(result).to.be.deep.eq([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10
    ])
  })

  it('should produce `filter` result (ok)', async () => {
    const result = await ordered().filter(n => n % 2 === 0).collect()
    expect(result).to.be.deep.eq([
      0, 2, 4, 6, 8
    ])
  })

  it('should produce `reduce` result (ok)', async () => {
    const result = await ordered().reduce((acc, c) => acc + c, 0)
    expect(result).to.be.eq(45)
  })
})