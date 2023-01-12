import { expect } from 'chai'
import { protocolConfigFixture } from 'fixtures/protocolConfigFixture'
import { setupFixtureLoader } from 'test/setup'

describe('ProtocolConfig.initialize', () => {
  const loadFixture = setupFixtureLoader()

  it('sets admin role for sender', async () => {
    const { protocolConfig, wallet } = await loadFixture(protocolConfigFixture)
    const adminRole = await protocolConfig.DEFAULT_ADMIN_ROLE()
    expect(await protocolConfig.hasRole(adminRole, wallet.address)).to.be.true
  })

  it('sets pauser role for pauser address', async () => {
    const { protocolConfig, protocolConfigParams: { pauser } } = await loadFixture(protocolConfigFixture)
    const pauserRole = await protocolConfig.PAUSER_ROLE()
    expect(await protocolConfig.hasRole(pauserRole, pauser.address)).to.be.true
  })

  it('sets protocol fee rate', async () => {
    const { protocolConfig, protocolConfigParams: { defaultProtocolFeeRate } } = await loadFixture(protocolConfigFixture)
    expect(await protocolConfig.defaultProtocolFeeRate()).to.eq(defaultProtocolFeeRate)
  })

  it('sets protocol admin', async () => {
    const { protocolConfig, protocolConfigParams: { protocolAdmin } } = await loadFixture(protocolConfigFixture)
    expect(await protocolConfig.protocolAdmin()).to.eq(protocolAdmin)
  })

  it('sets protocol treasury', async () => {
    const { protocolConfig, protocolConfigParams: { protocolTreasury } } = await loadFixture(protocolConfigFixture)
    expect(await protocolConfig.protocolTreasury()).to.eq(protocolTreasury)
  })

  it('sets pauser address', async () => {
    const { protocolConfig, protocolConfigParams: { pauser } } = await loadFixture(protocolConfigFixture)
    expect(await protocolConfig.pauserAddress()).to.eq(pauser.address)
  })
})
