import { expect } from 'chai'
import { trancheVaultFixture } from 'fixtures/trancheVaultFixture'
import { setupFixtureLoader } from 'test/setup'

describe('TrancheVault.updateCheckpointFromPortfolio', () => {
  const loadFixture = setupFixtureLoader()

  it('only portfolio', async () => {
    const { tranche } = await loadFixture(trancheVaultFixture)
    await expect(tranche.updateCheckpointFromPortfolio(100)).to.be.revertedWith('TV: Sender is not portfolio')
  })
})
