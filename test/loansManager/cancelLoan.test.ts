import { expect } from 'chai'
import { loansManagerFixture, LoanStatus } from 'fixtures/loansManagerFixture'
import { setupFixtureLoader } from 'test/setup'

describe('LoansManager.cancelLoan', () => {
  const loadFixture = setupFixtureLoader()
  const loanId = 0

  it('cancels loan', async () => {
    const { loansManager, fixedInterestOnlyLoans, loan } = await loadFixture(loansManagerFixture)

    await loansManager.addLoan(loan)
    await loansManager.cancelLoan(loanId)

    expect(await fixedInterestOnlyLoans.status(loanId)).to.equal(LoanStatus.Canceled)
  })

  it('emits event', async () => {
    const { loansManager, loan } = await loadFixture(loansManagerFixture)
    await loansManager.addLoan(loan)
    await expect(loansManager.cancelLoan(loanId)).to.emit(loansManager, 'LoanCancelled').withArgs(loanId)
  })
})
