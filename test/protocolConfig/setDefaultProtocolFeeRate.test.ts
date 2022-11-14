import { expect } from 'chai'
import { protocolConfigFixture } from 'fixtures/protocolConfigFixture'
import { setupFixtureLoader } from 'test/setup'

describe('ProtocolConfig.setDefaultProtocolFeeRate', () => {
  const loadFixture = setupFixtureLoader()

  it('only admin', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.connect(other).setDefaultProtocolFeeRate(500)).to.be.revertedWith('PC: Only default admin')
  })

  it('only different value', async () => {
    const { protocolConfig, protocolConfigParams: { defaultProtocolFeeRate } } = await loadFixture(protocolConfigFixture)
    await expect(protocolConfig.setDefaultProtocolFeeRate(defaultProtocolFeeRate)).to.be.revertedWith('PC: Fee already set')
  })

  it('sets new value', async () => {
    const { protocolConfig } = await loadFixture(protocolConfigFixture)
    const defaultProtocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(defaultProtocolFeeRate)
    expect(await protocolConfig.defaultProtocolFeeRate()).to.eq(defaultProtocolFeeRate)
  })

  it('emits event', async () => {
    const { protocolConfig } = await loadFixture(protocolConfigFixture)
    const defaultProtocolFeeRate = 500
    await expect(protocolConfig.setDefaultProtocolFeeRate(defaultProtocolFeeRate)).to.emit(protocolConfig, 'DefaultProtocolFeeRateChanged').withArgs(defaultProtocolFeeRate)
  })
})
