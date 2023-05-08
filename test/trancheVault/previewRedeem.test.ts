import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { ONE_IN_BPS, YEAR } from 'utils/constants'
import { convertToAssets } from 'utils/convertToAssets'
import { timeTravel } from 'utils/timeTravel'

describe('TrancheVault.previewRedeem', () => {
  const loadFixture = setupFixtureLoader()

  it('returns assets amount', async () => {
    const { equityTranche, structuredPortfolio, mintToPortfolio, depositToTranche, parseTokenUnits } = await loadFixture(structuredPortfolioFixture)

    const depositAmount = parseTokenUnits(10_000)
    await depositToTranche(equityTranche, depositAmount)

    await structuredPortfolio.start()

    const extraAmount = parseTokenUnits(1000)
    await mintToPortfolio(extraAmount)

    const totalAmount = depositAmount.add(extraAmount)
    const previewAmount = parseTokenUnits(1000)
    const expectedAssets = convertToAssets(previewAmount, totalAmount, depositAmount)
    expect(await equityTranche.previewRedeem(previewAmount)).to.eq(expectedAssets)
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
    expect(await equityTranche.previewRedeem(67)).to.equal(100)
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

    const shares = 500
    const expectedAssets = shares * totalAssets / totalSupply
    const expectedAssetsWithFee = Math.ceil(expectedAssets * (ONE_IN_BPS - withdrawFeeRate) / ONE_IN_BPS)
    expect(await seniorTranche.previewRedeem(shares)).to.eq(expectedAssetsWithFee)
    expect(await seniorTranche.previewWithdraw(expectedAssetsWithFee)).to.eq(shares)
  })

  it('is inverse of previewWithdraw', async () => {
    const { seniorTranche, juniorTranche, depositToTranche, startPortfolioAndEnableLiveActions, seniorTrancheData: { withdrawController } } = await loadFixture(structuredPortfolioFixture)

    const totalSupply = 1000
    await depositToTranche(seniorTranche, totalSupply)
    await depositToTranche(juniorTranche, totalSupply)

    await startPortfolioAndEnableLiveActions()

    await timeTravel(YEAR)

    const withdrawFeeRate = 500
    await withdrawController.setWithdrawFeeRate(withdrawFeeRate)

    const shares = 500
    expect(await seniorTranche.previewWithdraw(await seniorTranche.previewRedeem(shares))).to.eq(shares)
  })
})
