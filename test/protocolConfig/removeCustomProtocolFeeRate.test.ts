import { expect } from 'chai'
import { protocolConfigFixture } from 'fixtures/protocolConfigFixture'
import { setupFixtureLoader } from 'test/setup'

describe('ProtocolConfig.removeCustomProtocolFeeRate', () => {
  const loadFixture = setupFixtureLoader()

  it('only admin', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.connect(other).removeCustomProtocolFeeRate(other.address)).to.be.revertedWith('PC: Only default admin')
  })

  it('only if custom fee rate set', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.removeCustomProtocolFeeRate(other.address)).to.be.revertedWith('PC: No fee rate to remove')
  })

  it('removes custom fee rate', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    const defaultProtocolFeeRate = 500
    const customFeeRate = 300
    await protocolConfig.setDefaultProtocolFeeRate(500)
    await protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate)
    expect((await protocolConfig.functions['protocolFeeRate(address)'](other.address))[0]).to.eq(customFeeRate)

    await protocolConfig.removeCustomProtocolFeeRate(other.address)
    expect((await protocolConfig.functions['protocolFeeRate(address)'](other.address))[0]).to.eq(defaultProtocolFeeRate)
  })

  it('emits event', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await protocolConfig.setCustomProtocolFeeRate(other.address, 500)
    await expect(protocolConfig.removeCustomProtocolFeeRate(other.address)).to.emit(protocolConfig, 'CustomProtocolFeeRateRemoved').withArgs(other.address)
  })
})
