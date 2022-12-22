import {
  DepositController,
  DepositController__factory,
  MockLenderVerifier__factory,
  MockToken__factory,
  StructuredPortfolioFactory__factory,
  StructuredPortfolioTest__factory,
  TrancheVaultTest,
  TrancheVaultTest__factory,
  WithdrawController,
  WithdrawController__factory,
} from 'build/types'
import { BigNumberish, BytesLike, constants, Contract, ContractTransaction, utils, Wallet } from 'ethers'
import { YEAR, DAY } from 'utils/constants'
import { extractEventArgFromTx } from 'utils/extractEventArgFromTx'
import { deployFixedInterestOnlyLoans } from './deployFixedInterestOnlyLoans'
import { deployControllers } from 'fixtures/deployControllers'
import { deployProtocolConfig } from './deployProtocolConfig'

interface TrancheInitData {
  name: string,
  symbol: string,
  depositControllerImplementation: string,
  depositControllerInitData: BytesLike,
  withdrawControllerImplementation: string,
  withdrawControllerInitData: BytesLike,
  transferControllerImplementation: string,
  transferControllerInitData: BytesLike,
  targetApy: number,
  minSubordinateRatio: number,
  managerFeeRate: number,
}

export interface TrancheData extends TrancheInitData {
  depositController: DepositController,
  withdrawController: WithdrawController,
}

interface PortfolioParams {
  name: string,
  duration: number,
  capitalFormationPeriod: number,
  minimumSize: number,
}

export interface FixtureConfig {
  tokenDecimals: number,
  targetApys: number[],
}

const defaultFixtureConfig: FixtureConfig = {
  tokenDecimals: 6,
  targetApys: [0, 500, 300],
}

export const getStructuredPortfolioFactoryFixture = (fixtureConfig?: Partial<FixtureConfig>) => {
  return async ([wallet, other]: Wallet[]) => {
    const { tokenDecimals, targetApys } = { ...defaultFixtureConfig, ...fixtureConfig }
    const token = await new MockToken__factory(wallet).deploy(tokenDecimals)

    const parseTokenUnits = (amount: string | number) => utils.parseUnits(amount.toString(), tokenDecimals)

    await token.mint(wallet.address, parseTokenUnits(1e12))
    await token.mint(other.address, parseTokenUnits(1e10))

    const structuredPortfolioImplementation = await new StructuredPortfolioTest__factory(wallet).deploy()
    const trancheVaultImplementation = await new TrancheVaultTest__factory(wallet).deploy()

    const { protocolConfig, protocolConfigParams } = await deployProtocolConfig(wallet)

    const structuredPortfolioFactory = await new StructuredPortfolioFactory__factory(wallet).deploy(
      structuredPortfolioImplementation.address,
      trancheVaultImplementation.address,
      protocolConfig.address,
    )

    const whitelistedManagerRole = await structuredPortfolioFactory.WHITELISTED_MANAGER_ROLE()
    await structuredPortfolioFactory.grantRole(whitelistedManagerRole, wallet.address)

    const { fixedInterestOnlyLoans } = await deployFixedInterestOnlyLoans([wallet])

    const { depositController, withdrawController, transferController } = await deployControllers(wallet)

    const lenderVerifier = await new MockLenderVerifier__factory(wallet).deploy()

    const sizes = [
      { floor: constants.Zero, ceiling: parseTokenUnits(5e9) },
      { floor: constants.Zero, ceiling: parseTokenUnits(5e9) },
      { floor: constants.Zero, ceiling: parseTokenUnits(1e10) },
    ]

    const equityTrancheInitData: TrancheInitData = {
      name: 'Equity Tranche',
      symbol: 'EQT',
      depositControllerImplementation: depositController.address,
      depositControllerInitData: depositController.interface.encodeFunctionData('initialize', [wallet.address, lenderVerifier.address, 0, parseTokenUnits(1e10)]),
      withdrawControllerImplementation: withdrawController.address,
      withdrawControllerInitData: withdrawController.interface.encodeFunctionData('initialize', [wallet.address, 0, 1]),
      transferControllerImplementation: transferController.address,
      transferControllerInitData: transferController.interface.encodeFunctionData('initialize', [wallet.address]),
      targetApy: targetApys[0],
      minSubordinateRatio: 0,
      managerFeeRate: 0,
    }

    const juniorTrancheInitData: TrancheInitData = {
      name: 'Junior Tranche',
      symbol: 'JNT',
      depositControllerImplementation: depositController.address,
      depositControllerInitData: depositController.interface.encodeFunctionData('initialize', [wallet.address, lenderVerifier.address, 0, parseTokenUnits(1e10)]),
      withdrawControllerImplementation: withdrawController.address,
      withdrawControllerInitData: withdrawController.interface.encodeFunctionData('initialize', [wallet.address, 0, 1]),
      transferControllerImplementation: transferController.address,
      transferControllerInitData: transferController.interface.encodeFunctionData('initialize', [wallet.address]),
      targetApy: targetApys[1],
      minSubordinateRatio: 0,
      managerFeeRate: 0,
    }

    const seniorTrancheInitData: TrancheInitData = {
      name: 'Senior Tranche',
      symbol: 'SNT',
      depositControllerImplementation: depositController.address,
      depositControllerInitData: depositController.interface.encodeFunctionData('initialize', [wallet.address, lenderVerifier.address, 0, parseTokenUnits(1e10)]),
      withdrawControllerImplementation: withdrawController.address,
      withdrawControllerInitData: withdrawController.interface.encodeFunctionData('initialize', [wallet.address, 0, 1]),
      transferControllerImplementation: transferController.address,
      transferControllerInitData: transferController.interface.encodeFunctionData('initialize', [wallet.address]),
      targetApy: targetApys[2],
      minSubordinateRatio: 0,
      managerFeeRate: 0,
    }

    const tranchesInitData = [
      equityTrancheInitData,
      juniorTrancheInitData,
      seniorTrancheInitData,
    ]

    const portfolioDuration = 2 * YEAR

    const portfolioParams: PortfolioParams = {
      name: 'Portfolio',
      duration: portfolioDuration,
      capitalFormationPeriod: 90 * DAY,
      minimumSize: 0,
    }

    const expectedEquityRate = { from: 200, to: 2000 }

    async function createPortfolio(params: Partial<{
      token: Wallet | Contract,
      fixedInterestOnlyLoans: Wallet | Contract,
      portfolioParams: PortfolioParams,
      tranchesInitData: TrancheInitData[],
      expectedEquityRate: { from: number, to: number },
    }> = {}) {
      const args = {
        token,
        fixedInterestOnlyLoans,
        portfolioParams,
        tranchesInitData,
        expectedEquityRate,
        ...params,
      }
      const createPortfolioTx = await structuredPortfolioFactory.createPortfolio(
        args.token.address,
        args.fixedInterestOnlyLoans.address,
        args.portfolioParams,
        args.tranchesInitData,
        args.expectedEquityRate,
      )
      const portfolio = await getPortfolioFromTx(createPortfolioTx)

      return { portfolio, createPortfolioTx }
    }

    async function createPortfolioAndSetupControllers(...args: Parameters<typeof createPortfolio>) {
      const { portfolio, createPortfolioTx } = await createPortfolio(...args)
      const tranches = await getTranchesFromTx(createPortfolioTx)
      const controllers: {depositController: DepositController, withdrawController: WithdrawController}[] = []
      for (let i = 0; i < tranches.length; i++) {
        const depositControllerAddress = await tranches[i].depositController()
        const withdrawControllerAddress = await tranches[i].withdrawController()
        const depositController = DepositController__factory.connect(depositControllerAddress, wallet)
        const withdrawController = WithdrawController__factory.connect(withdrawControllerAddress, wallet)
        controllers.push({ depositController, withdrawController })
      }
      return { portfolio, tranches, createPortfolioTx, controllers }
    }

    const { createPortfolioTx } = await createPortfolio()

    const { timestamp: now } = await wallet.provider.getBlock('latest')
    const maxCapitalFormationDuration = 90 * DAY
    const startDeadline = now + maxCapitalFormationDuration

    const tranches = await getTranchesFromTx(createPortfolioTx)

    const tranchesData: TrancheData[] = []
    for (let i = 0; i < tranches.length; i++) {
      const depositControllerAddress = await tranches[i].depositController()
      const withdrawControllerAddress = await tranches[i].withdrawController()
      const depositController = DepositController__factory.connect(depositControllerAddress, wallet)
      const withdrawController = WithdrawController__factory.connect(withdrawControllerAddress, wallet)
      tranchesData.push({
        ...tranchesInitData[i],
        depositController,
        withdrawController,
      })

      await depositController.setCeiling(sizes[i].ceiling)
      await withdrawController.setFloor(sizes[i].floor)
    }

    async function depositToTranche(tranche: TrancheVaultTest, amount: BigNumberish, receiver = wallet.address) {
      await token.approve(tranche.address, amount)
      return tranche.deposit(amount, receiver)
    }

    async function mintToTranche(tranche: TrancheVaultTest, shares: BigNumberish, receiver = wallet.address) {
      await token.approve(tranche.address, constants.MaxUint256)
      return tranche.mint(shares, receiver)
    }

    async function getPortfolioFromTx(tx: ContractTransaction = createPortfolioTx) {
      const portfolioAddress: string = await extractEventArgFromTx(tx, [structuredPortfolioFactory.address, 'PortfolioCreated', 'newPortfolio'])
      return new StructuredPortfolioTest__factory(wallet).attach(portfolioAddress)
    }

    async function getTranchesFromTx(tx: ContractTransaction = createPortfolioTx) {
      const tranchesAddresses: string[] = await extractEventArgFromTx(tx, [structuredPortfolioFactory.address, 'PortfolioCreated', 'tranches'])
      const tranches = tranchesAddresses.map((address) => new TrancheVaultTest__factory(wallet).attach(address))
      return tranches
    }

    return {
      structuredPortfolioFactory,
      tranchesData,
      tranches,
      token,
      fixedInterestOnlyLoans,
      portfolioDuration,
      portfolioParams,
      createPortfolioTx,
      parseTokenUnits,
      depositToTranche,
      mintToTranche,
      getPortfolioFromTx,
      getTranchesFromTx,
      startDeadline,
      maxCapitalFormationDuration,
      equityTrancheData: tranchesData[0],
      juniorTrancheData: tranchesData[1],
      seniorTrancheData: tranchesData[2],
      whitelistedManagerRole,
      protocolConfig,
      protocolConfigParams,
      expectedEquityRate,
      tranchesInitData,
      createPortfolio,
      createPortfolioAndSetupControllers,
      lenderVerifier,
    }
  }
}

export const structuredPortfolioFactoryFixture = getStructuredPortfolioFactoryFixture()
