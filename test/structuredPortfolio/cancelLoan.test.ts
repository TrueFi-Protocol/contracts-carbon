import { expect } from 'chai'
import { structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { LoanStatus } from 'fixtures/loansManagerFixture'

describe('StructuredPortfolio.cancelLoan', () => {
  const loadFixture = setupFixtureLoader()

  it('only manager', async () => {
    const { structuredPortfolio, other, loan, addLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const loanId = await addLoan(loan)
    await expect(structuredPortfolio.connect(other).cancelLoan(loanId)).to.be.revertedWith('SP: Only manager')
  })

  it('cancels loan', async () => {
    const {
      structuredPortfolio,
      addAndAcceptLoan,
      fixedInterestOnlyLoans,
      loan,
    } = await loadFixture(structuredPortfolioLiveFixture)
    const loanId = await addAndAcceptLoan(loan)
    await structuredPortfolio.cancelLoan(loanId)
    expect(await fixedInterestOnlyLoans.status(loanId)).to.equal(
      LoanStatus.Canceled,
    )
  })
})
