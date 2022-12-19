import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('StructuredPortfolio.getNewLoansDeficit', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts when delta is min int256', async () => {
    const { structuredPortfolio } = await loadFixture(structuredPortfolioFixture)
    const minInt256 = BigNumber.from(2).pow(255).mul(-1)
    const currentDeficit = BigNumber.from(2).pow(255).add(1)
    await expect(structuredPortfolio.getNewLoansDeficit(currentDeficit, minInt256)).to.be.revertedWith('SP: Delta out of range')
  })
})
