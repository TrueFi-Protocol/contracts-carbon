import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { YEAR, DAY } from 'utils/constants'
import { timeTravelAndMine } from 'utils/timeTravel'
import { parseUSDC } from 'utils/parseUSDC'
import { Loan } from 'fixtures/setupLoansManagerHelpers'
import { BigNumber } from 'ethers'

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
    await timeTravelAndMine(YEAR)

    const accruedFee = withInterest(depositAmount, protocolFeeRate, YEAR).sub(depositAmount)

    const delta = parseTokenUnits(0.00001)
    expect(await structuredPortfolio.liquidAssets()).to.be.closeTo(depositAmount.sub(accruedFee), delta)
  })

  it('is correct when equity tranche is defaulted and junior is covered by loan', async () => {
    const { parseTokenUnits, depositToTranche, equityTranche, juniorTranche, seniorTranche, structuredPortfolio, other, addAndFundLoan, protocolConfig, repayLoanInFull } = await loadFixture(structuredPortfolioFixture)
    await protocolConfig.setDefaultProtocolFeeRate(10000 / 2) // 50%

    const loan1: Loan = {
      principal: parseUSDC(150),
      periodCount: 1,
      periodPayment: BigNumber.from(1),
      periodDuration: DAY,
      recipient: other.address,
      gracePeriod: DAY,
      canBeRepaidAfterDefault: true,
    }
    const loan2: Loan = {
      principal: parseUSDC(149),
      periodCount: 1,
      periodPayment: BigNumber.from(1),
      periodDuration: DAY,
      recipient: other.address,
      gracePeriod: DAY,
      canBeRepaidAfterDefault: true,
    }
    const depositAmount = parseTokenUnits(100)

    await depositToTranche(equityTranche, depositAmount)

    await depositToTranche(juniorTranche, depositAmount)

    await depositToTranche(seniorTranche, depositAmount)

    await structuredPortfolio.start()

    await addAndFundLoan(loan1)
    await addAndFundLoan(loan2)

    await timeTravelAndMine(90 * DAY)

    await structuredPortfolio.markLoanAsDefaulted(0)

    await repayLoanInFull(BigNumber.from(1))

    const loan3: Loan = {
      principal: parseUSDC(50),
      periodCount: 1,
      periodPayment: BigNumber.from(1),
      periodDuration: DAY,
      recipient: other.address,
      gracePeriod: DAY,
      canBeRepaidAfterDefault: true,
    }

    await addAndFundLoan(loan3)
    await timeTravelAndMine(90 * DAY)

    const liquidAssets = await structuredPortfolio.liquidAssets()

    await structuredPortfolio.updateCheckpoints()

    expect(await structuredPortfolio.liquidAssets()).to.closeTo(liquidAssets, parseUSDC(1))
  })
})
