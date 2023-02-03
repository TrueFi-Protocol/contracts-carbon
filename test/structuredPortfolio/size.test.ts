import StructuredPortfolio from 'build/StructuredPortfolio.json'
import { expect } from 'chai'

const CONTRACT_SIZE = StructuredPortfolio.deployedBytecode.length / 2 - 1
const LIMIT = 24_576

describe(`StructuredPortfolio size (${CONTRACT_SIZE}B)`, () => {
  it(`fits max contract size: ${LIMIT}B`, () => {
    expect(CONTRACT_SIZE).to.be.lte(LIMIT)
  })
})
