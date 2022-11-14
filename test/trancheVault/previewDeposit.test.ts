import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { ONE_IN_BPS, YEAR } from 'utils/constants'
import { timeTravel } from 'utils/timeTravel'

describe('TrancheVault.previewDeposit', () => {
  const loadFixture = setupFixtureLoader()

  it('returns shares amount', async () => {
    const { equityTranche, depositToTranche, parseTokenUnits, startPortfolioAndEnableLiveActions, mintToPortfolio } = await loadFixture(structuredPortfolioFixture)

    const depositAmount = parseTokenUnits(10_000)
    await depositToTranche(equityTranche, depositAmount)

    await startPortfolioAndEnableLiveActions()

    const extraAmount = parseTokenUnits(1000)
    await mintToPortfolio(extraAmount)

    const totalAmount = depositAmount.add(extraAmount)
    const previewAmount = parseTokenUnits(1000)
    const expectedShares = previewAmount.mul(depositAmount).div(totalAmount)
    expect(await equityTranche.previewDeposit(previewAmount)).to.eq(expectedShares)
  })

  it('rounds down', async () => {
    const {
      equityTranche,
      depositToTranche,
      startPortfolioAndEnableLiveActions,
      mintToPortfolio,
    } = await loadFixture(structuredPortfolioFixture)
    const depositAmount = 200
    await depositToTranche(equityTranche, depositAmount)
    await startPortfolioAndEnableLiveActions()
    await mintToPortfolio(100)
    expect((await equityTranche.previewDeposit(100))).to.equal(66)
  })

  it('respects deposit controller fee', async () => {
    const { seniorTranche, juniorTranche, depositToTranche, withInterest, startPortfolioAndEnableLiveActions, seniorTrancheData: { targetApy, depositController } } = await loadFixture(structuredPortfolioFixture)

    const totalSupply = 1000
    await depositToTranche(seniorTranche, totalSupply)
    await depositToTranche(juniorTranche, totalSupply)

    await startPortfolioAndEnableLiveActions()

    await timeTravel(YEAR)

    const totalAssets = withInterest(totalSupply, targetApy, YEAR).toNumber()

    const depositFeeRate = 500
    await depositController.setDepositFeeRate(depositFeeRate)

    const amount = 500
    const amountAfterFee = amount * (ONE_IN_BPS - depositFeeRate) / ONE_IN_BPS
    const expectedShares = Math.floor(amountAfterFee * totalSupply / totalAssets)
    expect(await seniorTranche.previewDeposit(amount)).to.eq(expectedShares)
  })
})
