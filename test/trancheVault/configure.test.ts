import { setupFixtureLoader } from '../setup'
import { expect } from 'chai'
import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { TrancheVault, ConfigurationStruct } from 'contracts/TrancheVault'

describe('TrancheVault.configure', () => {
  const loadFixture = setupFixtureLoader()

  const getDefaultConfiguration = async (tranche: TrancheVault): Promise<ConfigurationStruct> => ({
    managerFeeRate: await tranche.managerFeeRate(),
    managerFeeBeneficiary: await tranche.managerFeeBeneficiary(),
    depositController: await tranche.depositController(),
    withdrawController: await tranche.withdrawController(),
    transferController: await tranche.transferController(),
  })

  describe('manager fee rate', () => {
    it('only portfolio manager', async () => {
      const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
      const newConfiguration = await getDefaultConfiguration(seniorTranche)
      newConfiguration.managerFeeRate = 100
      await expect(seniorTranche.connect(other).configure(newConfiguration)).to.be.revertedWith('TV: Only manager')
    })

    it('sets new manager fee rate iff it was changed', async () => {
      const { seniorTranche } = await loadFixture(structuredPortfolioFixture)
      const newConfiguration = await getDefaultConfiguration(seniorTranche)
      newConfiguration.managerFeeRate = 100
      await seniorTranche.configure(newConfiguration)
      expect(await seniorTranche.managerFeeRate()).to.eq(100)
    })
  })

  describe('manager fee beneficiary', () => {
    it('only portfolio manager', async () => {
      const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
      const newConfiguration = await getDefaultConfiguration(seniorTranche)
      newConfiguration.managerFeeBeneficiary = other.address
      await expect(seniorTranche.connect(other).configure(newConfiguration)).to.be.revertedWith('TV: Only manager')
    })

    it('sets new manager fee beneficiary iff it was changed', async () => {
      const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
      const newConfiguration = await getDefaultConfiguration(seniorTranche)
      newConfiguration.managerFeeBeneficiary = other.address
      await seniorTranche.configure(newConfiguration)
      expect(await seniorTranche.managerFeeBeneficiary()).to.eq(other.address)
    })
  })

  describe('deposit controller', () => {
    it('only tranche controller owner', async () => {
      const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
      const newConfiguration = await getDefaultConfiguration(seniorTranche)
      newConfiguration.depositController = other.address
      await expect(seniorTranche.connect(other).configure(newConfiguration)).to.be.revertedWith('TV: Only tranche controller owner')
    })

    it('sets new deposit controller iff it was changed', async () => {
      const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
      const newConfiguration = await getDefaultConfiguration(seniorTranche)
      newConfiguration.depositController = other.address
      await seniorTranche.configure(newConfiguration)
      expect(await seniorTranche.depositController()).to.eq(other.address)
    })
  })

  describe('withdraw controller', () => {
    it('only tranche controller owner', async () => {
      const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
      const newConfiguration = await getDefaultConfiguration(seniorTranche)
      newConfiguration.withdrawController = other.address
      await expect(seniorTranche.connect(other).configure(newConfiguration)).to.be.revertedWith('TV: Only tranche controller owner')
    })

    it('sets new withdraw controller iff it was changed', async () => {
      const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
      const newConfiguration = await getDefaultConfiguration(seniorTranche)
      newConfiguration.withdrawController = other.address
      await seniorTranche.configure(newConfiguration)
      expect(await seniorTranche.withdrawController()).to.eq(other.address)
    })
  })

  describe('transfer controller', () => {
    it('only tranche controller owner', async () => {
      const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
      const newConfiguration = await getDefaultConfiguration(seniorTranche)
      newConfiguration.transferController = other.address
      await expect(seniorTranche.connect(other).configure(newConfiguration)).to.be.revertedWith('TV: Only tranche controller owner')
    })

    it('sets new transfer controller iff it was changed', async () => {
      const { seniorTranche, other } = await loadFixture(structuredPortfolioFixture)
      const newConfiguration = await getDefaultConfiguration(seniorTranche)
      newConfiguration.transferController = other.address
      await seniorTranche.configure(newConfiguration)
      expect(await seniorTranche.transferController()).to.eq(other.address)
    })
  })

  it('cannot change controllers configuration after renouncing tranche controller owner role', async () => {
    const { seniorTranche, wallet, other } = await loadFixture(structuredPortfolioFixture)
    await seniorTranche.renounceRole(await seniorTranche.TRANCHE_CONTROLLER_OWNER_ROLE(), wallet.address)
    const currentConfiguration = await getDefaultConfiguration(seniorTranche)

    await expect(seniorTranche.configure({
      ...currentConfiguration,
      depositController: other.address,
    })).to.be.revertedWith('TV: Only tranche controller owner')

    await expect(seniorTranche.configure({
      ...currentConfiguration,
      withdrawController: other.address,
    })).to.be.revertedWith('TV: Only tranche controller owner')
  })

  it('can change manager fee configuration after renouncing tranche controller owner role', async () => {
    const { seniorTranche, wallet, other } = await loadFixture(structuredPortfolioFixture)
    await seniorTranche.renounceRole(await seniorTranche.TRANCHE_CONTROLLER_OWNER_ROLE(), wallet.address)

    const newConfiguration = await getDefaultConfiguration(seniorTranche)
    newConfiguration.managerFeeBeneficiary = other.address
    newConfiguration.managerFeeRate = 100
    await seniorTranche.configure(newConfiguration)

    expect(await seniorTranche.managerFeeBeneficiary()).to.eq(other.address)
    expect(await seniorTranche.managerFeeRate()).to.eq(100)
  })
})
