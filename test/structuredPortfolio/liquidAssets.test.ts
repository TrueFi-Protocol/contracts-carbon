import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { YEAR } from 'utils/constants'
import { timeTravel } from 'utils/timeTravel'

describe('StructuredPortfolio.liquidAssets', () => {
  const loadFixture = setupFixtureLoader()

  it('simple token transfer does not make any effect', async () => {
    const { structuredPortfolio, token } = await loadFixture(structuredPortfolioFixture)
    await token.transfer(structuredPortfolio.address, 1234)
    expect(await structuredPortfolio.liquidAssets()).to.eq(0)
  })

  it('respects pending fees', async () => {
    const { structuredPortfolio, seniorTranche, protocolConfig, depositToTranche, parseTokenUnits, withInterest } = await loadFixture(structuredPortfolioFixture)
    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    const depositAmount = parseTokenUnits(1000)
    await depositToTranche(seniorTranche, depositAmount)

    await structuredPortfolio.start()
    await timeTravel(YEAR)

    const accruedFee = withInterest(depositAmount, protocolFeeRate, YEAR).sub(depositAmount)

    const delta = parseTokenUnits(0.00001)
    expect(await structuredPortfolio.liquidAssets()).to.be.closeTo(depositAmount.sub(accruedFee), delta)
  })
})
