import { expect } from 'chai'
import { loansManagerFixture } from 'fixtures/loansManagerFixture'
import { setupFixtureLoader } from 'test/setup'

describe('LoansManager.constructor', () => {
  const loadFixture = setupFixtureLoader()

  it('sets fixedInterestOnlyLoans', async () => {
    const { loansManager, fixedInterestOnlyLoans } = await loadFixture(loansManagerFixture)
    expect(await loansManager.fixedInterestOnlyLoans()).to.eq(fixedInterestOnlyLoans.address)
  })

  it('sets asset', async () => {
    const { loansManager, token } = await loadFixture(loansManagerFixture)
    expect(await loansManager.asset()).to.eq(token.address)
  })
})
