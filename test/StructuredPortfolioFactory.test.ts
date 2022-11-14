import { expect, use } from 'chai'
import { solidity } from 'ethereum-waffle'
import { constants } from 'ethers'
import { setupFixtureLoader } from './setup'
import { structuredPortfolioFactoryFixture } from 'fixtures/structuredPortfolioFactoryFixture'
import { extractEventArgFromTx } from 'utils/extractEventArgFromTx'
import { TrancheVault__factory } from 'build/types'

use(solidity)

describe('StructuredPortfolioFactory', () => {
  const loadFixture = setupFixtureLoader()

  describe('constructor', () => {
    it('grants admin role for deployer', async () => {
      const {
        structuredPortfolioFactory,
        wallet,
      } = await loadFixture(structuredPortfolioFactoryFixture)
      const adminRole = await structuredPortfolioFactory.DEFAULT_ADMIN_ROLE()
      expect(await structuredPortfolioFactory.hasRole(adminRole, wallet.address)).to.be.true
    })
  })

  describe('createPortfolio', () => {
    it('only whitelisted manager', async () => {
      const {
        structuredPortfolioFactory,
        other,
        fixedInterestOnlyLoans,
        portfolioParams,
        tranchesData,
        token,
      } = await loadFixture(structuredPortfolioFactoryFixture)
      await expect(
        structuredPortfolioFactory.connect(other).createPortfolio(
          token.address,
          fixedInterestOnlyLoans.address,
          portfolioParams,
          tranchesData,
          { from: 0, to: 0 },
        ),
      ).to.be.revertedWith('SPF: Only whitelisted manager')
    })

    it('creates portfolio and save in contract', async () => {
      const { structuredPortfolioFactory } = await loadFixture(structuredPortfolioFactoryFixture)

      const portfolios = await structuredPortfolioFactory.getPortfolios()

      expect(portfolios).to.have.length(1)
      expect(portfolios[0]).not.eq(constants.AddressZero)
    })

    it('creates tranches', async () => {
      const { structuredPortfolioFactory, wallet, tranchesData, createPortfolioTx } = await loadFixture(structuredPortfolioFactoryFixture)
      const tranches = await extractEventArgFromTx(createPortfolioTx, [structuredPortfolioFactory.address, 'PortfolioCreated', 'tranches'])

      expect(tranches.length).to.eq(3)

      for (let i = 0; i < tranches.length; i++) {
        const tranche = new TrancheVault__factory(wallet).attach(tranches[i])
        expect(await tranche.symbol()).to.eq(tranchesData[i].symbol)
        expect(await tranche.name()).to.eq(tranchesData[i].name)
      }
    })

    it('sets portfolio address in tranches', async () => {
      const { structuredPortfolioFactory, wallet, createPortfolioTx } = await loadFixture(structuredPortfolioFactoryFixture)
      const tranches = await extractEventArgFromTx(createPortfolioTx, [structuredPortfolioFactory.address, 'PortfolioCreated', 'tranches'])
      const portfolioAddress = await extractEventArgFromTx(createPortfolioTx, [structuredPortfolioFactory.address, 'PortfolioCreated', 'newPortfolio'])

      for (const trancheAddress of tranches) {
        const tranche = new TrancheVault__factory(wallet).attach(trancheAddress)
        expect(await tranche.portfolio()).to.eq(portfolioAddress)
      }
    })

    it('emits event', async () => {
      const { structuredPortfolioFactory, wallet, createPortfolioTx } = await loadFixture(structuredPortfolioFactoryFixture)

      const portfolioAddress = await extractEventArgFromTx(createPortfolioTx, [structuredPortfolioFactory.address, 'PortfolioCreated', 'newPortfolio'])
      const managerAddress = await extractEventArgFromTx(createPortfolioTx, [structuredPortfolioFactory.address, 'PortfolioCreated', 'manager'])

      expect(portfolioAddress).not.eq(constants.AddressZero)
      expect(managerAddress).to.eq(wallet.address)
    })
  })
})
