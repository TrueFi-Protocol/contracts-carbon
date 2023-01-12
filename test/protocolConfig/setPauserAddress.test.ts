import { expect } from 'chai'
import { protocolConfigFixture } from 'fixtures/protocolConfigFixture'
import { setupFixtureLoader } from 'test/setup'

describe('ProtocolConfig.setPauserAddress', () => {
  const loadFixture = setupFixtureLoader()

  it('only admin', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.connect(other).setPauserAddress(other.address)).to.be.revertedWith('PC: Only default admin')
  })

  it('only different value', async () => {
    const { protocolConfig, protocolConfigParams: { pauser } } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.setPauserAddress(pauser.address)).to.be.revertedWith('PC: Pauser already set')
  })

  it('sets new value', async () => {
    const { protocolConfig, wallet } = await loadFixture(protocolConfigFixture)
    await protocolConfig.setPauserAddress(wallet.address)
    expect(await protocolConfig.pauserAddress()).to.eq(wallet.address)
  })

  it('emits event', async () => {
    const { protocolConfig, wallet } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.setPauserAddress(wallet.address)).to.emit(protocolConfig, 'PauserAddressChanged').withArgs(wallet.address)
  })
})
