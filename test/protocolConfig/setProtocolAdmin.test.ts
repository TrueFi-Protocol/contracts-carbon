import { expect } from 'chai'
import { protocolConfigFixture } from 'fixtures/protocolConfigFixture'
import { setupFixtureLoader } from 'test/setup'

describe('ProtocolConfig.setProtocolAdmin', () => {
  const loadFixture = setupFixtureLoader()

  it('only admin', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.connect(other).setProtocolAdmin(other.address)).to.be.revertedWith('PC: Only default admin')
  })

  it('only different value', async () => {
    const { protocolConfig, protocolConfigParams: { protocolAdmin } } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.setProtocolAdmin(protocolAdmin)).to.be.revertedWith('PC: Admin already set')
  })

  it('sets new value', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await protocolConfig.setProtocolAdmin(other.address)
    expect(await protocolConfig.protocolAdmin()).to.eq(other.address)
  })

  it('emits event', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.setProtocolAdmin(other.address)).to.emit(protocolConfig, 'ProtocolAdminChanged').withArgs(other.address)
  })
})
