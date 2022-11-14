import { expect } from 'chai'
import { Wallet } from 'ethers'
import { trancheVaultFixture } from 'fixtures/trancheVaultFixture'
import { setupFixtureLoader } from 'test/setup'

describe('TrancheVault.setTransferController', () => {
  const loadFixture = setupFixtureLoader()

  it('only tranche controller owner', async () => {
    const { tranche, other } = await loadFixture(trancheVaultFixture)
    await expect(tranche.connect(other).setTransferController(other.address))
      .to.be.revertedWith('TV: Only tranche controller owner')
  })

  it('manager can renounce role', async () => {
    const { tranche, wallet, transferController } = await loadFixture(trancheVaultFixture)
    await tranche.renounceRole(await tranche.TRANCHE_CONTROLLER_OWNER_ROLE(), wallet.address)

    await expect(tranche.setTransferController(transferController.address))
      .to.be.revertedWith('TV: Only tranche controller owner')
  })

  it('sets transfer controller', async () => {
    const { tranche } = await loadFixture(trancheVaultFixture)
    const newTransferController = Wallet.createRandom()
    await tranche.setTransferController(newTransferController.address)
    expect(await tranche.transferController()).to.eq(newTransferController.address)
  })

  it('emits event', async () => {
    const { tranche } = await loadFixture(trancheVaultFixture)
    const newTransferController = Wallet.createRandom()
    await expect(tranche.setTransferController(newTransferController.address))
      .to.emit(tranche, 'TransferControllerChanged').withArgs(newTransferController.address)
  })
})
