import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { ONE_IN_BPS, YEAR } from 'utils/constants'
import { timeTravel } from 'utils/timeTravel'

describe('TrancheVault.previewMint', () => {
  const loadFixture = setupFixtureLoader()

  it('returns assets amount', async () => {
    const { equityTranche, structuredPortfolio, mintToPortfolio, depositToTranche, parseTokenUnits } = await loadFixture(structuredPortfolioFixture)

    const depositAmount = parseTokenUnits(10_000)
    await depositToTranche(equityTranche, depositAmount)

    await structuredPortfolio.start()
    const extraAmount = parseTokenUnits(1000)
    await mintToPortfolio(extraAmount)

    const totalAmount = depositAmount.add(extraAmount)
    const previewShares = parseTokenUnits(1000)
    const expectedAmount = previewShares.mul(totalAmount).div(depositAmount)
    expect(await equityTranche.previewMint(previewShares)).to.eq(expectedAmount)
  })

  it('rounds up', async () => {
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
    expect((await equityTranche.previewMint(67))).to.equal(101)
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

    const shares = 500
    const expectedAssets = shares * totalAssets / totalSupply
    const expectedAssetsWithFee = Math.floor(expectedAssets * (ONE_IN_BPS + depositFeeRate) / ONE_IN_BPS)
    expect(await seniorTranche.previewMint(shares)).to.eq(expectedAssetsWithFee)
  })
})
