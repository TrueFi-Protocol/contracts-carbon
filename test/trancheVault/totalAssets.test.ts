import { expect } from 'chai'
import { structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { trancheVaultFixture } from 'fixtures/trancheVaultFixture'
import { setupFixtureLoader } from 'test/setup'
import { MONTH, YEAR } from 'utils/constants'
import { timeTravelAndMine, timeTravelFromAndMine } from 'utils/timeTravel'

describe('TrancheVault.totalAssets', () => {
  const loadFixture = setupFixtureLoader()

  const DELTA = 1e5

  it('returns 0 when nothing is deposited', async () => {
    const { tranche } = await loadFixture(trancheVaultFixture)
    expect(await tranche.totalAssets()).to.eq(0)
  })

  it('returns balance in capital formation', async () => {
    const { equityTranche, depositToTranche, parseTokenUnits, token } = await loadFixture(structuredPortfolioFixture)
    await depositToTranche(equityTranche, parseTokenUnits(2e5))
    expect(await equityTranche.totalAssets()).to.eq(await token.balanceOf(equityTranche.address))
  })

  it('initial deposit in Live does not affect other tranches', async () => {
    const { startPortfolioAndEnableLiveActions, seniorTranche, juniorTranche, equityTranche, depositToTranche } = await loadFixture(structuredPortfolioFixture)
    await startPortfolioAndEnableLiveActions()

    const amount = 1000
    await depositToTranche(juniorTranche, amount)

    expect(await seniorTranche.totalAssets()).to.eq(0)
    expect(await juniorTranche.totalAssets()).to.eq(amount)
    expect(await equityTranche.totalAssets()).to.eq(0)
  })

  it('returns balance reduced by pending fees for Closed portfolio', async () => {
    const { equityTranche, token, structuredPortfolio, protocolConfig, withInterest, parseTokenUnits } = await loadFixture(structuredPortfolioLiveFixture)
    const protocolFeeRate = 1000
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
    const updateCheckpointsTx = await structuredPortfolio.updateCheckpoints()

    await structuredPortfolio.close()
    const equityBalance = await token.balanceOf(equityTranche.address)
    await timeTravelFromAndMine(updateCheckpointsTx, MONTH)

    const expectedProtocolFee = withInterest(equityBalance, protocolFeeRate, MONTH).sub(equityBalance)
    const delta = parseTokenUnits(0.01)
    expect(await equityTranche.totalAssets()).to.be.closeTo(equityBalance.sub(expectedProtocolFee), delta)
  })

  it('returns waterfall tranche value for Live portfolio', async () => {
    const {
      addAndFundLoan,
      parseTokenUnits,
      getLoan,
      repayLoanInFull,
      senior,
      seniorTranche,
    } = await loadFixture(structuredPortfolioLiveFixture)
    const loan = getLoan({ principal: parseTokenUnits(2e6) })
    const loanId = await addAndFundLoan(loan)
    await repayLoanInFull(loanId)

    await timeTravelAndMine(YEAR)

    expect(await seniorTranche.totalAssets()).to.be.closeTo(senior.calculateTargetValue(), DELTA)
  })
})
