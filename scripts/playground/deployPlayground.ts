import { CarbonDeployResult } from '../deployment/deployCarbon'
import { contract, NumberLike, reduce } from 'ethereum-mars'
import { Address } from 'ethereum-mars/build/src/symbols'
import { FixedInterestOnlyLoans, MockToken } from '../../build/artifacts'
import { DepositController__factory, WithdrawController__factory, TransferController__factory } from '../../build/types'
import { utils } from 'ethers'

interface PortfolioParams {
  name: string,
  duration: NumberLike,
  capitalFormationPeriod: NumberLike,
  minimumSize: NumberLike,
}

const DAY = 60 * 60 * 24

export function deployPlayground({ structuredPortfolioFactory, defaultDepositController, defaultWithdrawController, defaultTransferController, protocolConfig, allowAllLenderVerifier }: CarbonDeployResult, deployer: string) {
  const usdc = contract('mockUsdc', MockToken, [6], {
    skipUpgrade: true,
  })
  const fixedInterestOnlyLoans = contract('fixedInterestOnlyLoans_proxy', FixedInterestOnlyLoans, [], {
    skipUpgrade: true,
  })
  structuredPortfolioFactory.grantRole(structuredPortfolioFactory.WHITELISTED_MANAGER_ROLE(), deployer)

  const portfolioParams: PortfolioParams = {
    name: 'Structured Portfolio',
    duration: 31 * DAY,
    capitalFormationPeriod: 7 * DAY,
    minimumSize: 0,
  }

  const trancheData = reduce(
    [defaultDepositController[Address], defaultWithdrawController[Address], defaultTransferController[Address], allowAllLenderVerifier[Address]],
    (depositControllerImplementation, withdrawControllerImplementation, transferControllerImplementation, allowAllLenderVerifierContract) => [
      {
        name: 'Equity',
        symbol: 'EQ',
        depositControllerImplementation,
        depositControllerInitData: new DepositController__factory().interface.encodeFunctionData('initialize', [deployer, allowAllLenderVerifierContract, 0, utils.parseUnits('1000000', 6)]),
        withdrawControllerImplementation,
        withdrawControllerInitData: new WithdrawController__factory().interface.encodeFunctionData('initialize', [deployer, 0, 0]),
        transferControllerImplementation,
        transferControllerInitData: new TransferController__factory().interface.encodeFunctionData('initialize', [deployer]),
        targetApy: 0,
        minSubordinateRatio: 0,
        managerFeeRate: 100,
      },
      {
        name: 'Junior',
        symbol: 'JUN',
        depositControllerImplementation,
        depositControllerInitData: new DepositController__factory().interface.encodeFunctionData('initialize', [deployer, allowAllLenderVerifierContract, 0, utils.parseUnits('1000000', 6)]),
        withdrawControllerImplementation,
        withdrawControllerInitData: new WithdrawController__factory().interface.encodeFunctionData('initialize', [deployer, 0, 0]),
        transferControllerImplementation,
        transferControllerInitData: new TransferController__factory().interface.encodeFunctionData('initialize', [deployer]),
        targetApy: 500,
        minSubordinateRatio: 1000,
        managerFeeRate: 75,
      },
      {
        name: 'Senior',
        symbol: 'SEN',
        depositControllerImplementation,
        depositControllerInitData: new DepositController__factory().interface.encodeFunctionData('initialize', [deployer, allowAllLenderVerifierContract, 0, utils.parseUnits('1000000', 6)]),
        withdrawControllerImplementation,
        withdrawControllerInitData: new WithdrawController__factory().interface.encodeFunctionData('initialize', [deployer, 0, 0]),
        transferControllerImplementation,
        transferControllerInitData: new TransferController__factory().interface.encodeFunctionData('initialize', [deployer]),
        targetApy: 300,
        minSubordinateRatio: 1000,
        managerFeeRate: 50,
      },
    ],
  )

  structuredPortfolioFactory.createPortfolio(usdc, fixedInterestOnlyLoans, portfolioParams, trancheData, { from: 200, to: 2000 })

  protocolConfig.setDefaultProtocolFeeRate(10)
}
