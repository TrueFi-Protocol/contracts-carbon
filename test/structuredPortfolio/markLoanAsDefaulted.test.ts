import { expect } from 'chai'
import { structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { DAY } from 'utils/constants'
import { timeTravel } from 'utils/timeTravel'

describe('StructuredPortfolio.markLoanAsDefaulted', () => {
  const loadFixture = setupFixtureLoader()

  it('only manager', async () => {
    const { addAndFundLoan, structuredPortfolio, other } = await loadFixture(structuredPortfolioLiveFixture)

    const loanId = await addAndFundLoan()
    await timeTravel(DAY * 2)

    await expect(structuredPortfolio.connect(other).markLoanAsDefaulted(loanId)).to.be.revertedWith('SP: Only manager')
  })
})
