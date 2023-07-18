import { expect } from 'chai'
import { trancheVaultFixture } from 'fixtures/trancheVaultFixture'
import { setupFixtureLoader } from 'test/setup'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { deployMockContract } from 'ethereum-waffle'
import { TransferEnabledController__factory } from 'build/types'

describe('TrancheVault: transfer', () => {
  const loadFixture = setupFixtureLoader()

  async function blockTransferFixture() {
    const fixtureResult = await loadFixture(trancheVaultFixture)
    const { wallet, tranche } = fixtureResult

    const mockTransferController = await deployMockContract(wallet, TransferEnabledController__factory.abi)
    await tranche.setTransferController(mockTransferController.address)
    await mockTransferController.mock.onTransfer.returns(false)

    return { ...fixtureResult, transferController: mockTransferController }
  }

  it('transfer calls TransferController', async () => {
    const { tranche, other } = await blockTransferFixture()
    await expect(tranche.transfer(other.address, 1000)).to.be.revertedWith('TV: Transfer not allowed')
  })

  it('transferFrom calls TransferController', async () => {
    const { tranche, wallet, other } = await blockTransferFixture()
    await tranche.approve(other.address, 1000)
    await expect(tranche.connect(other).transferFrom(wallet.address, other.address, 1000)).to.be.revertedWith('TV: Transfer not allowed')
  })

  it('reverts when portfolio is paused', async () => {
    const { equityTranche, wallet, structuredPortfolio, protocolConfigParams: { pauser } } = await loadFixture(structuredPortfolioFixture)
    await structuredPortfolio.connect(pauser).pause()

    await expect(equityTranche.deposit(100, wallet.address))
      .to.be.revertedWith('TV: Portfolio is paused')
  })
})
