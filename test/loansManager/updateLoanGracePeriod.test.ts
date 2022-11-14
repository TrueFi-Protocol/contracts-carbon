import { expect } from 'chai'
import { loansManagerFixture } from 'fixtures/loansManagerFixture'
import { setupFixtureLoader } from 'test/setup'
import { DAY } from 'utils/constants'

describe('LoansManager.updateLoanGracePeriod', () => {
  const loadFixture = setupFixtureLoader()

  it('updates loan', async () => {
    const { loansManager, fixedInterestOnlyLoans, addAndFundLoan } = await loadFixture(loansManagerFixture)
    const newGracePeriod = 3 * DAY
    const loanId = await addAndFundLoan()
    await loansManager.updateLoanGracePeriod(loanId, newGracePeriod)
    expect(await fixedInterestOnlyLoans.gracePeriod(loanId)).to.equal(newGracePeriod)
  })

  it('emits event', async () => {
    const { loansManager, addAndFundLoan } = await loadFixture(loansManagerFixture)
    const newGracePeriod = 3 * DAY
    const loanId = await addAndFundLoan()
    await expect(loansManager.updateLoanGracePeriod(loanId, newGracePeriod)).to.emit(loansManager, 'LoanGracePeriodUpdated').withArgs(loanId, newGracePeriod)
  })
})
