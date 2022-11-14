import { expect } from 'chai'
import { structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('StructuredPortfolio.updateLoanGracePeriod', () => {
  const loadFixture = setupFixtureLoader()

  it('only manager', async () => {
    const { structuredPortfolio, other, addAndAcceptLoan } = await loadFixture(structuredPortfolioLiveFixture)
    const loanId = await addAndAcceptLoan()
    await expect(structuredPortfolio.connect(other).updateLoanGracePeriod(loanId, 0)).to.be.revertedWith('SP: Only manager')
  })
})
