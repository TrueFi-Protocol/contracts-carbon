import { expect } from 'chai'
import { structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { scaleToPercentage } from 'utils/scaleToPercentage'
import { parseUSDC } from 'utils/parseUSDC'

describe('WithdrawController.minTrancheValueComplyingWithRatio', () => {
  const loadFixture = setupFixtureLoader()

  const minSubordinateRatio = 2000

  it('all ratios are limited by tranche directly over them', async () => {
    const { seniorTranche, equityTranche, juniorTranche, structuredPortfolio, initialDeposits } = await loadFixture(structuredPortfolioLiveFixture)

    await structuredPortfolio.setTrancheMinSubordinateRatio(1, minSubordinateRatio)
    await structuredPortfolio.setTrancheMinSubordinateRatio(2, 5000)

    const minEquityRatioLimit = scaleToPercentage(initialDeposits[1], minSubordinateRatio)
    const minJuniorRatioLimit = scaleToPercentage(initialDeposits[2], 5000).sub(initialDeposits[0])

    expect(await equityTranche.minTrancheValueComplyingWithRatio()).to.be.closeTo(minEquityRatioLimit, parseUSDC(1))
    expect(await juniorTranche.minTrancheValueComplyingWithRatio()).to.be.closeTo(minJuniorRatioLimit, parseUSDC(1))
    expect(await seniorTranche.minTrancheValueComplyingWithRatio()).to.equal(0)
  })

  it('when lower tranches cover all needs, return 0', async () => {
    const { juniorTranche, structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
    await structuredPortfolio.setTrancheMinSubordinateRatio(2, minSubordinateRatio)

    expect(await juniorTranche.minTrancheValueComplyingWithRatio()).to.equal(0)
  })

  it('equity tranche is limited ', async () => {
    const { structuredPortfolio, initialDeposits, equityTranche } = await loadFixture(structuredPortfolioLiveFixture)
    await structuredPortfolio.setTrancheMinSubordinateRatio(2, 8000)

    const minEquityRatioLimit = scaleToPercentage(initialDeposits[2], 8000).sub(initialDeposits[1])

    expect(await equityTranche.minTrancheValueComplyingWithRatio()).to.be.closeTo(minEquityRatioLimit, parseUSDC(1))
  })

  it('is possible to withdraw amount to match min value but not more', async () => {
    const { withdrawFromTranche, equityTranche, structuredPortfolio, initialDeposits } = await loadFixture(structuredPortfolioLiveFixture)
    await structuredPortfolio.setTrancheMinSubordinateRatio(1, minSubordinateRatio)

    const minEquityRatioLimit = scaleToPercentage(initialDeposits[1], minSubordinateRatio)
    const maxWithdraw = initialDeposits[0].sub(minEquityRatioLimit).sub(parseUSDC(1))
    await expect(withdrawFromTranche(equityTranche, maxWithdraw)).to.be.not.reverted
    await expect(withdrawFromTranche(equityTranche, parseUSDC(1.1))).to.be.revertedWith('SP: Tranche min ratio not met')
  })

  it('returns 0 when portfolio is not live', async () => {
    const { equityTranche, juniorTranche, seniorTranche, structuredPortfolio, startAndClosePortfolio } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.setTrancheMinSubordinateRatio(1, minSubordinateRatio)
    await structuredPortfolio.setTrancheMinSubordinateRatio(2, 5000)

    expect(await equityTranche.minTrancheValueComplyingWithRatio()).to.equal(0)
    expect(await juniorTranche.minTrancheValueComplyingWithRatio()).to.equal(0)
    expect(await seniorTranche.minTrancheValueComplyingWithRatio()).to.equal(0)

    await startAndClosePortfolio()

    expect(await equityTranche.minTrancheValueComplyingWithRatio()).to.equal(0)
    expect(await juniorTranche.minTrancheValueComplyingWithRatio()).to.equal(0)
    expect(await seniorTranche.minTrancheValueComplyingWithRatio()).to.equal(0)
  })
})
