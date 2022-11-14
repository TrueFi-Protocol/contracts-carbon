import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { ONE_IN_BPS, YEAR } from 'utils/constants'
import { timeTravel } from 'utils/timeTravel'

describe('TrancheVault.previewWithdraw', () => {
  const loadFixture = setupFixtureLoader()

  const DELTA = 1e4

  it('returns 1:1 for totalAssets equal 0', async () => {
    const { seniorTranche } = await loadFixture(structuredPortfolioFixture)
    const assets = 1e6
    expect(await seniorTranche.previewWithdraw(assets)).to.eq(assets)
  })

  it('returns 0 for 0 assets', async () => {
    const { seniorTranche, token } = await loadFixture(structuredPortfolioFixture)
    await token.mint(seniorTranche.address, 1e6)
    expect(await seniorTranche.previewWithdraw(0)).to.eq(0)
  })

  it('capital formation, returns 1:1', async () => {
    const { equityTranche, parseTokenUnits, depositToTranche } = await loadFixture(structuredPortfolioFixture)
    await depositToTranche(equityTranche, 2e9)
    const assets = parseTokenUnits(1e6)
    expect(await equityTranche.previewWithdraw(assets)).to.eq(assets)
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
    expect(await equityTranche.previewWithdraw(100)).to.equal(67)
  })

  it('portfolio status Closed, returns correct value', async () => {
    const {
      seniorTranche,
      juniorTranche,
      parseTokenUnits,
      depositToTranche,
      structuredPortfolio,
      tranchesData: [seniorData],
      withInterest,
    } = await loadFixture(structuredPortfolioFixture)
    const depositAmount = parseTokenUnits(1000)
    await depositToTranche(seniorTranche, depositAmount)
    await depositToTranche(juniorTranche, depositAmount)

    await timeTravel(YEAR)
    await structuredPortfolio.close()

    const assets = parseTokenUnits(1e6)
    const expectedTrancheValue = withInterest(depositAmount, seniorData.targetApy, YEAR)
    const expectedAmount = assets.mul(depositAmount).div(expectedTrancheValue)
    expect(await seniorTranche.previewWithdraw(assets)).to.be.closeTo(expectedAmount, DELTA)
  })

  it('respects withdraw controller fee', async () => {
    const { seniorTranche, juniorTranche, depositToTranche, withInterest, startPortfolioAndEnableLiveActions, seniorTrancheData: { targetApy, withdrawController } } = await loadFixture(structuredPortfolioFixture)

    const totalSupply = 1000
    await depositToTranche(seniorTranche, totalSupply)
    await depositToTranche(juniorTranche, totalSupply)

    await startPortfolioAndEnableLiveActions()

    await timeTravel(YEAR)

    const totalAssets = withInterest(totalSupply, targetApy, YEAR).toNumber()

    const withdrawFeeRate = 500
    await withdrawController.setWithdrawFeeRate(withdrawFeeRate)

    const amount = 500
    const amountWithFee = amount * (ONE_IN_BPS + withdrawFeeRate) / ONE_IN_BPS
    const expectedShares = Math.ceil(amountWithFee * totalSupply / totalAssets)
    expect(await seniorTranche.previewWithdraw(amount)).to.eq(expectedShares)
  })
})
