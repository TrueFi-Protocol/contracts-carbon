import { structuredPortfolioFixture } from 'fixtures/structuredPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { expect } from 'chai'
import { MockToken__factory, StructuredPortfolio__factory } from 'build/types'
import { structuredPortfolioFactoryFixture } from 'fixtures/structuredPortfolioFactoryFixture'
import { deployFixedInterestOnlyLoans } from 'fixtures/deployFixedInterestOnlyLoans'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import { deployMockContract, MockContract } from 'ethereum-waffle'
import TrancheVaultJson from 'build/TrancheVault.json'
import { getTxTimestamp } from 'utils/getTxTimestamp'

const TRANCHES_COUNT = 3

describe('StructuredPortfolio.initialize', () => {
  const loadFixture = setupFixtureLoader()

  it('grants manager role to sender', async () => {
    const { structuredPortfolio, wallet } = await loadFixture(structuredPortfolioFixture)
    const managerRole = await structuredPortfolio.MANAGER_ROLE()
    expect(await structuredPortfolio.hasRole(managerRole, wallet.address)).to.be.true
  })

  it('sets name', async () => {
    const { structuredPortfolio, portfolioParams: { name } } = await loadFixture(structuredPortfolioFixture)
    expect(await structuredPortfolio.name()).to.eq(name)
  })

  it('sets start deadline', async () => {
    const { structuredPortfolio, createPortfolioTx, portfolioParams: { capitalFormationPeriod } } = await loadFixture(structuredPortfolioFixture)
    const createPortfolioTimestamp = await getTxTimestamp(createPortfolioTx)
    expect(await structuredPortfolio.startDeadline()).to.eq(createPortfolioTimestamp + capitalFormationPeriod)
  })

  it('sets default status', async () => {
    const { structuredPortfolio, PortfolioStatus } = await loadFixture(structuredPortfolioFixture)
    expect(await structuredPortfolio.status()).to.eq(PortfolioStatus.CapitalFormation)
  })

  it('sets protocol config', async () => {
    const { structuredPortfolio, protocolConfig } = await loadFixture(structuredPortfolioFixture)
    expect(await structuredPortfolio.protocolConfig()).to.eq(protocolConfig.address)
  })

  it('sets startDeadline', async () => {
    const { structuredPortfolio, startDeadline } = await loadFixture(structuredPortfolioFixture)
    expect(await structuredPortfolio.startDeadline()).to.eq(startDeadline)
  })

  it('grants manager role to sender', async () => {
    const { structuredPortfolio, wallet } = await loadFixture(structuredPortfolioFixture)
    const managerRole = await structuredPortfolio.MANAGER_ROLE()
    expect(await structuredPortfolio.hasRole(managerRole, wallet.address)).to.be.true
  })

  it('sets tranches target apys', async () => {
    const { structuredPortfolio, tranchesData } = await loadFixture(structuredPortfolioFixture)
    const expectedTargetApys = tranchesData.map(({ targetApy }) => targetApy)
    for (let trancheIdx = 0; trancheIdx < 3; trancheIdx++) {
      expect((await structuredPortfolio.tranchesData(trancheIdx)).targetApy).to.eq(expectedTargetApys[trancheIdx])
    }
  })

  it('sets tranches min subordinate ratios', async () => {
    const { structuredPortfolio, tranchesData } = await loadFixture(structuredPortfolioFixture)
    const expectedRatios = tranchesData.map(({ minSubordinateRatio }) => minSubordinateRatio)
    for (let trancheIdx = 0; trancheIdx < 3; trancheIdx++) {
      expect((await structuredPortfolio.tranchesData(trancheIdx)).minSubordinateRatio).to.eq(expectedRatios[trancheIdx])
    }
  })

  it('duration cannot be zero', async () => {
    const {
      structuredPortfolioFactory,
      portfolioParams,
      wallet,
      tranchesData,
      token,
      protocolConfigParams: { pauser },
    } = await loadFixture(structuredPortfolioFactoryFixture)
    const { fixedInterestOnlyLoans } = await deployFixedInterestOnlyLoans([wallet, pauser])
    await expect(structuredPortfolioFactory
      .createPortfolio(token.address, fixedInterestOnlyLoans.address, { ...portfolioParams, duration: 0 }, tranchesData, { from: 0, to: 0 }))
      .to.be.revertedWith('SP: Duration cannot be zero')
  })

  it('reverts for non-zero equity target apy', async () => {
    const {
      structuredPortfolioFactory,
      fixedInterestOnlyLoans,
      tranchesData,
      portfolioParams,
      token,
    } = await loadFixture(structuredPortfolioFactoryFixture)
    const [equityTranche, ...otherTranches] = tranchesData
    const invalidTranchesData = [{ ...equityTranche, targetApy: 100 }, ...otherTranches]
    await expect(structuredPortfolioFactory
      .createPortfolio(token.address, fixedInterestOnlyLoans.address, portfolioParams, invalidTranchesData, { from: 0, to: 0 }))
      .to.be.revertedWith('SP: Target APY in tranche 0')
  })

  it('reverts for non-zero equity min subordinate ratio', async () => {
    const {
      structuredPortfolioFactory,
      portfolioParams,
      fixedInterestOnlyLoans,
      tranchesData,
      token,
    } = await loadFixture(structuredPortfolioFactoryFixture)
    const [equityTranche, ...otherTranches] = tranchesData
    const invalidTranchesData = [{ ...equityTranche, minSubordinateRatio: 10 }, ...otherTranches]
    await expect(structuredPortfolioFactory
      .createPortfolio(token.address, fixedInterestOnlyLoans.address, portfolioParams, invalidTranchesData, { from: 0, to: 0 }))
      .to.be.revertedWith('SP: Min sub ratio in tranche 0')
  })

  it('sets min and max value for equity tranche', async () => {
    const { structuredPortfolio, expectedEquityRate } = await loadFixture(structuredPortfolioFixture)
    expect((await structuredPortfolio.expectedEquityRate()).from).to.eq(expectedEquityRate.from)
    expect((await structuredPortfolio.expectedEquityRate()).to).to.eq(expectedEquityRate.to)
  })

  describe('token and tranche decimals mismatch', () => {
    for (let trancheIdx = 0; trancheIdx < TRANCHES_COUNT; trancheIdx++) {
      it(`tranche: ${trancheIdx}`, async () => {
        const {
          wallet,
          fixedInterestOnlyLoans,
          tranchesData,
          portfolioParams,
          protocolConfig,
        } = await loadFixture(structuredPortfolioFactoryFixture)

        const decimals = 8
        const invalidDecimals = 6
        const tranches: MockContract[] = []
        for (let i = 0; i < tranchesData.length; i++) {
          const tranche = await deployMockContract(wallet, TrancheVaultJson.abi)
          await tranche.mock.decimals.returns(i === trancheIdx ? invalidDecimals : decimals)
          tranches.push(tranche)
        }

        const tranchesInitData = []
        for (let i = 0; i < tranchesData.length; i++) {
          tranchesInitData.push({ ...tranchesData[i], tranche: tranches[i].address })
        }

        const portfolioToken = await new MockToken__factory(wallet).deploy(decimals)

        await expect(
          deployBehindProxy(
            new StructuredPortfolio__factory(wallet),
            wallet.address,
            portfolioToken.address,
            fixedInterestOnlyLoans.address,
            protocolConfig.address,
            portfolioParams,
            tranchesInitData,
            { from: 0, to: 1 },
          ),
        ).to.be.revertedWith('SP: Decimals mismatched')
      })
    }
  })

  it('pauser role is taken from protocol config', async () => {
    const { createPortfolio, protocolConfig, wallet } = await loadFixture(structuredPortfolioFactoryFixture)
    await protocolConfig.setPauserAddress(wallet.address)
    const { portfolio } = await createPortfolio()
    expect(await portfolio.hasRole(await portfolio.PAUSER_ROLE(), wallet.address)).to.be.true
  })

  it('grants default admin role to protocol admin', async () => {
    const { createPortfolio, protocolConfig, other } = await loadFixture(structuredPortfolioFactoryFixture)
    await protocolConfig.setProtocolAdmin(other.address)
    const { portfolio } = await createPortfolio()
    expect(await portfolio.hasRole(await portfolio.DEFAULT_ADMIN_ROLE(), other.address)).to.be.true
  })
})
