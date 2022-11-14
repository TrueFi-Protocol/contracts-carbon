import { expect } from 'chai'
import { protocolConfigFixture } from 'fixtures/protocolConfigFixture'
import { setupFixtureLoader } from 'test/setup'

describe('ProtocolConfig.setProtocolTreasury', () => {
  const loadFixture = setupFixtureLoader()

  it('only admin', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.connect(other).setProtocolTreasury(other.address)).to.be.revertedWith('PC: Only default admin')
  })

  it('only different value', async () => {
    const { protocolConfig, protocolConfigParams: { protocolTreasury } } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.setProtocolTreasury(protocolTreasury)).to.be.revertedWith('PC: Treasury already set')
  })

  it('sets new value', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await protocolConfig.setProtocolTreasury(other.address)
    expect(await protocolConfig.protocolTreasury()).to.eq(other.address)
  })

  it('emits event', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.setProtocolTreasury(other.address)).to.emit(protocolConfig, 'ProtocolTreasuryChanged').withArgs(other.address)
  })
})
