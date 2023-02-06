import { expect } from 'chai'
import { structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { ONE_IN_BPS, YEAR } from 'utils/constants'
import { parseUSDC } from 'utils/parseUSDC'
import { timeTravel } from 'utils/timeTravel'

describe('StructuredPortfolio.totalAssets', () => {
  const loadFixture = setupFixtureLoader()

  it('capital formation', async () => {
    const { structuredPortfolio, tranches, parseTokenUnits, depositToTranche } = await loadFixture(structuredPortfolioFixture)
    const depositAmount = parseTokenUnits(1000)
    for (let i = 0; i < tranches.length; i++) {
      await depositToTranche(tranches[i], depositAmount)
    }
    expect(await structuredPortfolio.totalAssets()).to.eq(depositAmount.mul(3))
  })

  it('live without loans', async () => {
    const { structuredPortfolio, token } = await loadFixture(structuredPortfolioLiveFixture)

    const portfolioBalance = await token.balanceOf(structuredPortfolio.address)
    expect(await structuredPortfolio.totalAssets()).to.eq(portfolioBalance)
  })

  it('live with started loan', async () => {
    const { structuredPortfolio, token, addAndAcceptLoan, loan } = await loadFixture(structuredPortfolioLiveFixture)
    const loanId = await addAndAcceptLoan()
    await structuredPortfolio.fundLoan(loanId)

    const portfolioBalance = await token.balanceOf(structuredPortfolio.address)
    expect(await structuredPortfolio.totalAssets()).to.eq(portfolioBalance.add(loan.principal))
  })

  it('with loan repaid', async () => {
    const { structuredPortfolio, token, addAndAcceptLoan, repayLoanInFull } = await loadFixture(structuredPortfolioLiveFixture)
    const loanId = await addAndAcceptLoan()
    await structuredPortfolio.fundLoan(loanId)

    await repayLoanInFull(loanId)

    const portfolioBalance = await token.balanceOf(structuredPortfolio.address)
    expect(await structuredPortfolio.totalAssets()).to.eq(portfolioBalance)
  })

  it('closed state', async () => {
    const { structuredPortfolio, totalDeposit } = await loadFixture(structuredPortfolioLiveFixture)
    expect(await structuredPortfolio.totalAssets()).to.eq(totalDeposit)
  })

  it('transferring assets to portfolio does not affect total assets in live state', async () => {
    const { structuredPortfolio, PortfolioStatus, token, wallet, other, equityTranche, startPortfolioAndEnableLiveActions } = await loadFixture(structuredPortfolioFixture)

    expect(await structuredPortfolio.status()).to.eq(PortfolioStatus.CapitalFormation)

    const amount = parseUSDC(1_000)

    await startPortfolioAndEnableLiveActions()

    await token.connect(wallet).approve(equityTranche.address, 1)
    await equityTranche.connect(wallet).deposit(1, wallet.address)
    await token.connect(wallet).transfer(structuredPortfolio.address, amount)

    expect(await structuredPortfolio.virtualTokenBalance()).to.eq(1)
    expect(await structuredPortfolio.totalAssets()).to.eq(1)

    await token.connect(other).approve(equityTranche.address, amount)
    await equityTranche.connect(other).deposit(amount, other.address)

    expect(await equityTranche.maxWithdraw(wallet.address)).to.eq(1)
    expect(await equityTranche.maxWithdraw(other.address)).to.eq(amount)
  })

  it('fee subtracted from loans value', async () => {
    const {
      addAndFundLoan,
      protocolConfig,
      getLoan,
      structuredPortfolio,
      totalDeposit,
      parseTokenUnits,
    } = await loadFixture(structuredPortfolioLiveFixture)

    const loanPrincipal = totalDeposit
    const loanInterest = loanPrincipal
    await addAndFundLoan(
      getLoan({
        periodCount: 1,
        principal: loanPrincipal,
        periodPayment: loanInterest,
        periodDuration: 1,
        gracePeriod: 0,
      }),
    )

    // start accruing fees
    const protocolFeeRate = 100
    await protocolConfig.setDefaultProtocolFeeRate(protocolFeeRate)
    await structuredPortfolio.updateCheckpoints()

    await timeTravel(YEAR)

    const loanValue = loanPrincipal.add(loanInterest)

    const protocolFee = loanValue.mul(protocolFeeRate).div(ONE_IN_BPS)
    const expectedTotalAssets = loanValue.sub(protocolFee)
    await structuredPortfolio.updateCheckpoints()
    expect(await structuredPortfolio.totalAssets()).to.closeTo(expectedTotalAssets, parseTokenUnits(0.01))
  })
})
