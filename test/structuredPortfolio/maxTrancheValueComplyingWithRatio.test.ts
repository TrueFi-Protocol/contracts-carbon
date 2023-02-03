import { expect } from 'chai'
import { structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { parseUSDC } from 'utils/parseUSDC'
import { constants } from 'ethers'

describe('StructuredPortfolio.maxTrancheValueComplyingWithRatio', () => {
  const loadFixture = setupFixtureLoader()

  const minSubordinateRatio = 2000

  it('returns max possible values for all tranches', async () => {
    const { structuredPortfolio, initialDeposits } = await loadFixture(structuredPortfolioLiveFixture)

    await structuredPortfolio.setTrancheMinSubordinateRatio(1, minSubordinateRatio)
    await structuredPortfolio.setTrancheMinSubordinateRatio(2, 5000)

    const maxJuniorRatioLimit = initialDeposits[0].mul(5) //  1/0.2
    const maxSeniorRatioLimit = initialDeposits[0].add(initialDeposits[1]).mul(2) // 1/0.5
    expect(await structuredPortfolio.maxTrancheValueComplyingWithRatio(0)).to.equal(constants.MaxUint256)
    expect(await structuredPortfolio.maxTrancheValueComplyingWithRatio(1)).to.be.closeTo(maxJuniorRatioLimit, parseUSDC(1))
    expect(await structuredPortfolio.maxTrancheValueComplyingWithRatio(2)).to.be.closeTo(maxSeniorRatioLimit, parseUSDC(1))
  })

  it('returns max int when min ratio is not set for tranche', async () => {
    const { structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)

    expect(await structuredPortfolio.maxTrancheValueComplyingWithRatio(1)).to.equal(constants.MaxUint256)
    expect(await structuredPortfolio.maxTrancheValueComplyingWithRatio(2)).to.equal(constants.MaxUint256)
  })

  it('is possible to deposit amount to match max value but not more', async () => {
    const { depositToTranche, juniorTranche, structuredPortfolio, initialDeposits } = await loadFixture(structuredPortfolioLiveFixture)
    await structuredPortfolio.setTrancheMinSubordinateRatio(1, minSubordinateRatio)

    const maxJuniorDeposit = initialDeposits[0].mul(5).sub(initialDeposits[1]).sub(parseUSDC(1))
    await expect(depositToTranche(juniorTranche, maxJuniorDeposit)).to.be.not.reverted
    await expect(depositToTranche(juniorTranche, parseUSDC(1.1))).to.be.revertedWith('SP: Tranche min ratio not met')
  })

  it('returns max int when portfolio is not live', async () => {
    const { structuredPortfolio, startAndClosePortfolio } = await loadFixture(structuredPortfolioFixture)

    await structuredPortfolio.setTrancheMinSubordinateRatio(1, minSubordinateRatio)
    await structuredPortfolio.setTrancheMinSubordinateRatio(2, 5000)

    expect(await structuredPortfolio.maxTrancheValueComplyingWithRatio(1)).to.equal(constants.MaxUint256)
    expect(await structuredPortfolio.maxTrancheValueComplyingWithRatio(2)).to.equal(constants.MaxUint256)

    await startAndClosePortfolio()

    expect(await structuredPortfolio.maxTrancheValueComplyingWithRatio(1)).to.equal(constants.MaxUint256)
    expect(await structuredPortfolio.maxTrancheValueComplyingWithRatio(2)).to.equal(constants.MaxUint256)
  })
})
