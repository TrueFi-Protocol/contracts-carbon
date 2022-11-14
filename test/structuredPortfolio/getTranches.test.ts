import { TrancheVault__factory } from 'build/types'
import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('StructuredPortfolio.getTranches', () => {
  const loadFixture = setupFixtureLoader()

  it('returns tranches addresses', async () => {
    const { structuredPortfolio, tranchesData, wallet } = await loadFixture(structuredPortfolioFixture)

    const tranches = await structuredPortfolio.getTranches()

    for (let i = 0; i < tranches.length; i++) {
      const tranche = new TrancheVault__factory(wallet).attach(tranches[i])
      expect(await tranche.symbol()).to.eq(tranchesData[i].symbol)
      expect(await tranche.name()).to.eq(tranchesData[i].name)
    }
  })
})
