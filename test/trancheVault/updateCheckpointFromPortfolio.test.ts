import { expect } from 'chai'
import { structuredPortfolioLiveFixture } from 'fixtures/structuredPortfolioFixture'
import { trancheVaultFixture } from 'fixtures/trancheVaultFixture'
import { setupFixtureLoader } from 'test/setup'
import { WEEK } from 'utils/constants'
import { timeTravel } from 'utils/timeTravel'

describe('TrancheVault.updateCheckpointFromPortfolio', () => {
  const loadFixture = setupFixtureLoader()

  it('only portfolio', async () => {
    const { tranche } = await loadFixture(trancheVaultFixture)
    await expect(tranche.updateCheckpointFromPortfolio(100)).to.be.revertedWith('TV: Sender is not portfolio')
  })

  it('reverts if managerFeeBeneficiary is TrancheVault', async () => {
    const { seniorTranche, structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
    await seniorTranche.setManagerFeeRate(500)
    await timeTravel(WEEK)
    await seniorTranche.setManagerFeeBeneficiary(seniorTranche.address)

    await expect(structuredPortfolio.updateCheckpoints()).to.be.revertedWith('TV: Token transfer to TV')
  })

  it('reverts if protocolTreasury is TrancheVault', async () => {
    const { protocolConfig, seniorTranche, structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
    await protocolConfig.setDefaultProtocolFeeRate(500)
    await structuredPortfolio.updateCheckpoints()
    await timeTravel(WEEK)
    await protocolConfig.setProtocolTreasury(seniorTranche.address)

    await expect(structuredPortfolio.updateCheckpoints()).to.be.revertedWith('TV: Token transfer to TV')
  })

  it('reverts if managerFeeBeneficiary is StructuredPortfolio', async () => {
    const { seniorTranche, structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
    await seniorTranche.setManagerFeeRate(500)
    await timeTravel(WEEK)
    await seniorTranche.setManagerFeeBeneficiary(structuredPortfolio.address)

    await expect(structuredPortfolio.updateCheckpoints()).to.be.revertedWith('TV: Token transfer to SP')
  })

  it('reverts if protocolTreasury is StructuredPortfolio', async () => {
    const { protocolConfig, structuredPortfolio } = await loadFixture(structuredPortfolioLiveFixture)
    await protocolConfig.setDefaultProtocolFeeRate(500)
    await structuredPortfolio.updateCheckpoints()
    await timeTravel(WEEK)
    await protocolConfig.setProtocolTreasury(structuredPortfolio.address)

    await expect(structuredPortfolio.updateCheckpoints()).to.be.revertedWith('TV: Token transfer to SP')
  })
})
