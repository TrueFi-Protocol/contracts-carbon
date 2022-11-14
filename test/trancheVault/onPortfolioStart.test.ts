import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from '../setup'

describe('TrancheVault.onPortfolioStart', () => {
  const loadFixture = setupFixtureLoader()

  it('only portfolio', async () => {
    const { equityTranche } = await loadFixture(structuredPortfolioFixture)
    await expect(equityTranche.onPortfolioStart()).to.be.revertedWith('TV: Sender is not portfolio')
  })
})
