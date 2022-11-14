import { expect } from 'chai'
import { protocolConfigFixture } from 'fixtures/protocolConfigFixture'
import { setupFixtureLoader } from 'test/setup'

describe('ProtocolConfig.setCustomProtocolFeeRate', () => {
  const loadFixture = setupFixtureLoader()

  it('only admin', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.connect(other).setCustomProtocolFeeRate(other.address, 500)).to.be.revertedWith('PC: Only default admin')
  })

  it('sets new value', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    const customFeeRate = 500
    await protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate)
    expect((await protocolConfig.functions['protocolFeeRate(address)'](other.address))[0]).to.eq(customFeeRate)
  })

  it('only different value', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    const customFeeRate = 500
    await protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate)
    await expect(protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate)).to.be.revertedWith('PC: Fee already set')
  })

  it('can set zero fee rate', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await protocolConfig.setDefaultProtocolFeeRate(500)
    await protocolConfig.setCustomProtocolFeeRate(other.address, 0)
    expect((await protocolConfig.functions['protocolFeeRate(address)'](other.address))[0]).to.eq(0)
  })

  it('emits event', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    const customFeeRate = 500
    await expect(protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate)).to.emit(protocolConfig, 'CustomProtocolFeeRateChanged').withArgs(other.address, customFeeRate)
  })
})
