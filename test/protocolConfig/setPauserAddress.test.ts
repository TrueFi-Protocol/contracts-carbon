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
    const { protocolConfig, protocolConfigParams: { pauserAddress } } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.setPauserAddress(pauserAddress)).to.be.revertedWith('PC: Pauser already set')
  })

  it('sets new value', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await protocolConfig.setPauserAddress(other.address)
    expect(await protocolConfig.pauserAddress()).to.eq(other.address)
  })

  it('emits event', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.setPauserAddress(other.address)).to.emit(protocolConfig, 'PauserAddressChanged').withArgs(other.address)
  })
})
