import { expect } from 'chai'
import { structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { DAY } from 'utils/constants'
import { timeTravel } from 'utils/timeTravel'
import { LoanStatus } from 'fixtures/loansManagerFixture'

describe('StructuredPortfolio.markLoanAsDefaulted', () => {
  const loadFixture = setupFixtureLoader()

  it('only manager', async () => {
    const { addAndFundLoan, structuredPortfolio, other } = await loadFixture(structuredPortfolioLiveFixture)

    const loanId = await addAndFundLoan()
    await timeTravel(DAY * 2)

    await expect(structuredPortfolio.connect(other).markLoanAsDefaulted(loanId)).to.be.revertedWith('SP: Only manager')
  })

  it('sets someLoansDefaulted to true', async () => {
    const { addAndFundLoan, structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)

    const loanId = await addAndFundLoan()
    await timeTravel(DAY * 2)

    await structuredPortfolio.markLoanAsDefaulted(loanId)
    expect(await structuredPortfolio.someLoansDefaultedTest()).to.be.true
  })

  it('can be used in closed', async () => {
    const { addAndFundLoan, structuredPortfolio, portfolioDuration, fixedInterestOnlyLoans } = await loadFixture(structuredPortfolioLiveFixture)

    const loanId = await addAndFundLoan()
    await timeTravel(portfolioDuration)
    await structuredPortfolio.close()

    await expect(structuredPortfolio.markLoanAsDefaulted(loanId)).not.to.be.reverted
    const loanData = await fixedInterestOnlyLoans.loanData(loanId)
    expect(loanData.status).to.eq(LoanStatus.Defaulted)
  })
})
