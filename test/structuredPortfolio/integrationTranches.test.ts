import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { DAY, MONTH, YEAR } from 'utils/constants'
import { timeTravel } from 'utils/timeTravel'

describe('StructuredPortfolio: tranches integration tests', () => {
  const loadFixture = setupFixtureLoader()

  it('no deposit in CapitalFormation, deposit just before close', async () => {
    const {
      startPortfolioAndEnableLiveActions,
      depositToTranche,
      seniorTranche,
      juniorTranche,
      equityTranche,
      parseTokenUnits,
      structuredPortfolio,
      token,
    } = await loadFixture(structuredPortfolioFixture)

    await startPortfolioAndEnableLiveActions()

    await timeTravel(YEAR)

    const juniorDeposit = parseTokenUnits(1e6)
    const seniorDeposit = parseTokenUnits(2e6)
    const equityDeposit = parseTokenUnits(3e6)

    await depositToTranche(juniorTranche, juniorDeposit)
    await depositToTranche(seniorTranche, seniorDeposit)
    await depositToTranche(equityTranche, equityDeposit)

    await structuredPortfolio.close()

    const delta = parseTokenUnits('0.1')
    expect(await token.balanceOf(seniorTranche.address)).to.be.closeTo(seniorDeposit, delta)
    expect(await token.balanceOf(juniorTranche.address)).to.be.closeTo(juniorDeposit, delta)
    expect(await token.balanceOf(equityTranche.address)).to.be.closeTo(equityDeposit, delta)
  })

  it('no deposit to junior', async () => {
    const {
      seniorTranche,
      juniorTranche,
      equityTranche,
      parseTokenUnits,
      depositToTranche,
      structuredPortfolio,
      token,
      startPortfolioAndEnableLiveActions,
    } = await loadFixture(structuredPortfolioFixture)

    const depositAmount = parseTokenUnits(1e6)
    await depositToTranche(seniorTranche, depositAmount)
    await depositToTranche(equityTranche, depositAmount)

    await startPortfolioAndEnableLiveActions()

    await timeTravel(YEAR)

    await structuredPortfolio.close()

    expect(await token.balanceOf(seniorTranche.address)).to.be.gt(depositAmount)
    expect(await token.balanceOf(juniorTranche.address)).to.eq(0)
    expect(await token.balanceOf(equityTranche.address)).to.be.lt(depositAmount)
  })

  it('deposit and immediately withdraw all from junior', async () => {
    const {
      seniorTranche,
      juniorTranche,
      equityTranche,
      parseTokenUnits,
      depositToTranche,
      redeemFromTranche,
      structuredPortfolio,
      token,
      startPortfolioAndEnableLiveActions,
      wallet,
    } = await loadFixture(structuredPortfolioFixture)

    const depositAmount = parseTokenUnits(1e6)
    await depositToTranche(seniorTranche, depositAmount)
    await depositToTranche(equityTranche, depositAmount)

    await startPortfolioAndEnableLiveActions()

    await timeTravel(YEAR)

    await depositToTranche(juniorTranche, depositAmount)
    await redeemFromTranche(juniorTranche, await juniorTranche.balanceOf(wallet.address))

    await timeTravel(YEAR)

    await structuredPortfolio.close()

    expect(await token.balanceOf(seniorTranche.address)).to.be.gt(depositAmount)
    expect(await token.balanceOf(juniorTranche.address)).to.eq(0)
    expect(await token.balanceOf(equityTranche.address)).to.be.lt(depositAmount)
  })

  it('no assets in portfolio lifetime', async () => {
    const {
      protocolConfig,
      structuredPortfolio,
    } = await loadFixture(structuredPortfolioFixture)
    await protocolConfig.setDefaultProtocolFeeRate(500)

    await structuredPortfolio.start()
    await timeTravel(YEAR)

    await expect(structuredPortfolio.close()).not.to.be.reverted
  })

  it('no assets in Capital Formation, only for a while in Live', async () => {
    const {
      startPortfolioAndEnableLiveActions,
      depositToTranche,
      redeemFromTranche,
      juniorTranche,
      protocolConfig,
      structuredPortfolio,
      parseTokenUnits,
      wallet,
      protocolConfigParams: { protocolTreasury },
      withInterest,
      juniorTrancheData: { targetApy },
      another: lender,
      token,
    } = await loadFixture(structuredPortfolioFixture)
    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    await startPortfolioAndEnableLiveActions()

    await timeTravel(MONTH)
    const depositAmount = parseTokenUnits(1e6)
    await depositToTranche(juniorTranche, depositAmount, lender.address)
    await timeTravel(DAY)

    const allShares = await juniorTranche.balanceOf(lender.address)
    await juniorTranche.connect(lender).approve(wallet.address, allShares)
    await redeemFromTranche(juniorTranche, allShares, lender.address, lender.address)
    await timeTravel(MONTH)

    await structuredPortfolio.close()

    const delta = parseTokenUnits('0.01')

    const expectedProtocolFee = withInterest(depositAmount, targetApy, DAY).sub(depositAmount)
    expect(await token.balanceOf(protocolTreasury)).to.be.closeTo(expectedProtocolFee, delta)
    expect(await token.balanceOf(lender.address)).to.be.closeTo(depositAmount.sub(expectedProtocolFee), delta)
  })
})
