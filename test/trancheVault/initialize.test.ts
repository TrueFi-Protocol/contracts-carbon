import { trancheVaultFixture } from 'fixtures/trancheVaultFixture'
import { setupFixtureLoader } from 'test/setup'
import { expect } from 'chai'

describe('TrancheVault.initialize', () => {
  const loadFixture = setupFixtureLoader()

  it('sets asset', async () => {
    const { tranche, token } = await loadFixture(trancheVaultFixture)
    expect(await tranche.asset()).to.eq(token.address)
  })

  it('sets deposit controller', async () => {
    const { tranche, depositController } = await loadFixture(trancheVaultFixture)
    expect(await tranche.depositController()).to.eq(depositController.address)
  })

  it('sets withdraw controller', async () => {
    const { tranche, withdrawController } = await loadFixture(trancheVaultFixture)
    expect(await tranche.withdrawController()).to.eq(withdrawController.address)
  })

  it('sets transfer controller', async () => {
    const { tranche, transferController } = await loadFixture(trancheVaultFixture)
    expect(await tranche.transferController()).to.eq(transferController.address)
  })

  it('sets waterfall index', async () => {
    const { tranche, waterfallIndex } = await loadFixture(trancheVaultFixture)
    expect(await tranche.waterfallIndex()).to.eq(waterfallIndex)
  })

  it('sets protocol config address', async () => {
    const { tranche, protocolConfig } = await loadFixture(trancheVaultFixture)
    expect(await tranche.protocolConfig()).to.eq(protocolConfig.address)
  })

  it('sets manager fee beneficiary', async () => {
    const { tranche, wallet } = await loadFixture(trancheVaultFixture)
    expect(await tranche.managerFeeBeneficiary()).to.eq(wallet.address)
  })

  it('sets manager fee rate', async () => {
    const { deployTranche } = await loadFixture(trancheVaultFixture)
    const managerFeeRate = 500
    const tranche = await deployTranche({ managerFeeRate })
    expect(await tranche.managerFeeRate()).to.eq(managerFeeRate)
  })
})
