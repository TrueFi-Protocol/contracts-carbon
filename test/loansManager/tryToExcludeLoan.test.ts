import { loansManagerFixture } from 'fixtures/loansManagerFixture'
import { setupFixtureLoader } from 'test/setup'
import { expect } from 'chai'
import { timeTravel } from 'utils/timeTravel'
import { DAY } from 'utils/constants'

describe('LoansManager.tryToExcludeLoan', () => {
  const loadFixture = setupFixtureLoader()

  it('non-existing loan', async () => {
    const { loansManager } = await loadFixture(loansManagerFixture)
    await expect(loansManager.tryToExcludeLoan(1000)).to.be.revertedWith('panic code 0x32')
  })

  it('one-element loans array', async () => {
    const { loansManager, addAndFundLoan } = await loadFixture(loansManagerFixture)
    const loanId = await addAndFundLoan()

    await timeTravel(DAY * 2)
    await loansManager.setLoanAsDefaulted(loanId)
    await loansManager.tryToExcludeLoan(loanId)

    expect(await loansManager.getActiveLoans()).to.deep.eq([])
  })

  it('excludes first loan', async () => {
    const { addAndFundLoan, loansManager } = await loadFixture(loansManagerFixture)
    const loanIds = [await addAndFundLoan(), await addAndFundLoan(), await addAndFundLoan()]

    await timeTravel(DAY * 2)
    const defaultedLoanId = loanIds[0]
    await loansManager.setLoanAsDefaulted(defaultedLoanId)
    await loansManager.tryToExcludeLoan(defaultedLoanId)

    expect(await loansManager.getActiveLoans()).to.deep.equal([loanIds[2], loanIds[1]])
  })

  it('excludes last loan', async () => {
    const { addAndFundLoan, loansManager } = await loadFixture(loansManagerFixture)
    const loanIds = [await addAndFundLoan(), await addAndFundLoan(), await addAndFundLoan()]

    await timeTravel(DAY * 2)
    const defaultedLoanId = loanIds[2]
    await loansManager.setLoanAsDefaulted(defaultedLoanId)
    await loansManager.tryToExcludeLoan(defaultedLoanId)

    expect(await loansManager.getActiveLoans()).to.deep.equal([loanIds[0], loanIds[1]])
  })

  it('excludes loan in the middle', async () => {
    const { addAndFundLoan, loansManager } = await loadFixture(loansManagerFixture)
    const loanIds = [await addAndFundLoan(), await addAndFundLoan(), await addAndFundLoan()]

    await timeTravel(DAY * 2)
    const defaultedLoanId = loanIds[1]
    await loansManager.setLoanAsDefaulted(defaultedLoanId)
    await loansManager.tryToExcludeLoan(defaultedLoanId)

    expect(await loansManager.getActiveLoans()).to.deep.equal([loanIds[0], loanIds[2]])
  })

  it('emits event', async () => {
    const { loansManager, addAndFundLoan } = await loadFixture(loansManagerFixture)
    const loanId = await addAndFundLoan()

    await timeTravel(DAY * 2)
    await loansManager.setLoanAsDefaulted(loanId)
    await expect(loansManager.tryToExcludeLoan(loanId)).to.emit(loansManager, 'ActiveLoanRemoved').withArgs(loanId)
  })
})
