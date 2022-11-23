import { StructuredPortfolioFactory, StructuredPortfolio, TrancheVault, DepositController, WithdrawController, TransferController, AllowAllLenderVerifier } from '../../build/artifacts'
import { contract, ExecuteOptions } from 'ethereum-mars'
import { deployProtocolConfig } from './deployProtocolConfig'

export type CarbonDeployResult = ReturnType<typeof deployCarbon>

export function deployCarbon(_: string, { networkName }: ExecuteOptions) {
  const structuredPortfolio = contract(StructuredPortfolio)
  const tranche = contract(TrancheVault)
  const protocolConfig = deployProtocolConfig(networkName, 'carbon_')
  const structuredPortfolioFactory = contract(StructuredPortfolioFactory, [structuredPortfolio, tranche, protocolConfig])
  const defaultDepositController = contract('carbon_defaultDepositController', DepositController)
  const defaultWithdrawController = contract('carbon_defaultWithdrawController', WithdrawController)
  const defaultTransferController = contract('carbon_defaultTransferController', TransferController)
  const allowAllLenderVerifier = contract(AllowAllLenderVerifier)

  return {
    structuredPortfolioFactory,
    defaultDepositController,
    defaultWithdrawController,
    defaultTransferController,
    protocolConfig,
    allowAllLenderVerifier
  }
}
