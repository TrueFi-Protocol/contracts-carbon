import { expect } from 'chai'
import { structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { YEAR } from 'utils/constants'
import { getTxTimestamp } from 'utils/getTxTimestamp'
import { timeTravel } from 'utils/timeTravel'

describe('StructuredPortfolio.fundLoan', () => {
  const loadFixture = setupFixtureLoader()

  it('only manager', async () => {
    const { structuredPortfolio, other, addAndAcceptLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const loanId = await addAndAcceptLoan()
    await expect(structuredPortfolio.connect(other).fundLoan(loanId))
      .to.be.revertedWith('SP: Only manager')
  })

  it('pays fees', async () => {
    const { structuredPortfolio, addAndAcceptLoan, loan, protocolConfig, protocolConfigParams: { protocolTreasury }, token, withInterest, tranches } = await loadFixture(structuredPortfolioLiveFixture)
    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
    const initialAmount = await token.balanceOf(structuredPortfolio.address)

    const updateTx = await structuredPortfolio.updateCheckpoints()
    await timeTravel(YEAR)

    const loanId = await addAndAcceptLoan(loan)

    const fundTx = await structuredPortfolio.fundLoan(loanId)

    const timePassed = await getTxTimestamp(fundTx) - await getTxTimestamp(updateTx)
    const expectedFees = withInterest(initialAmount, protocolFeeRate, timePassed).sub(initialAmount)

    // rounding issue: feeRate * portfolioAssets != feeRate * seniorAssets + feeRate * juniorAssets + feeRate * equityAssets
    const delta = tranches.length
    expect(await token.balanceOf(protocolTreasury)).to.be.closeTo(expectedFees, delta)
  })

  it('reverts when pending fees to high', async () => {
    const { structuredPortfolio, addAndAcceptLoan, loan, protocolConfig, token, addAndFundLoan, getLoan, parseTokenUnits } = await loadFixture(structuredPortfolioLiveFixture)
    const protocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)

    await structuredPortfolio.updateCheckpoints()
    await timeTravel(YEAR)

    const loanId = await addAndAcceptLoan(loan)

    const portfolioBalance = await token.balanceOf(structuredPortfolio.address)
    const pendingFees = await structuredPortfolio.totalPendingFees()
    const amountToKeep = pendingFees.add(loan.principal.div(2))
    await addAndFundLoan(getLoan({ principal: portfolioBalance.sub(amountToKeep), periodPayment: parseTokenUnits(1) }))

    await expect(structuredPortfolio.fundLoan(loanId)).to.be.revertedWith('LM: Insufficient funds')
  })

  it('reverts when portfolio is paused', async () => {
    const {
      structuredPortfolio,
      addAndAcceptLoan,
      loan,
    } = await loadFixture(structuredPortfolioLiveFixture)
    const loanId = await addAndAcceptLoan(loan)
    await structuredPortfolio.pause()

    await expect(structuredPortfolio.fundLoan(loanId))
      .to.be.revertedWith('Pausable: paused')
  })
})
