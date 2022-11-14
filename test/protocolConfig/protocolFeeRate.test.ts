import { expect } from 'chai'
import { protocolConfigFixture } from 'fixtures/protocolConfigFixture'
import { setupFixtureLoader } from 'test/setup'

describe('ProtocolConfig.protocolFeeRate', () => {
  const loadFixture = setupFixtureLoader()

  it('returns default fee rate for no custom fee rate set', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    const defaultProtocolFeeRate = 500
    await protocolConfig.setDefaultProtocolFeeRate(defaultProtocolFeeRate)
    expect((await protocolConfig.functions['protocolFeeRate(address)'](other.address))[0]).to.eq(defaultProtocolFeeRate)
  })

  it('returns custom fee rate if set', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    const customFeeRate = 500
    await protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate)
    expect((await protocolConfig.functions['protocolFeeRate(address)'](other.address))[0]).to.eq(customFeeRate)
  })

  it('returns fee rate for msg.sender if address not passed', async () => {
    const { protocolConfig, other } = await loadFixture(protocolConfigFixture)
    const customFeeRate = 500
    await protocolConfig.setCustomProtocolFeeRate(other.address, customFeeRate)
    expect((await protocolConfig.connect(other).functions['protocolFeeRate()']())[0]).to.eq(customFeeRate)
  })
})
