import { expect } from 'chai'
import { structuredPortfolioFixture, structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { parseUSDC } from 'utils/parseUSDC'

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
})
