import { StructuredPortfolio__factory, MockToken__factory, TrancheVault__factory } from 'build/types'
import { deployMockContract } from 'ethereum-waffle'
import { BigNumberish, Wallet, utils } from 'ethers'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import { deployProtocolConfig } from './deployProtocolConfig'
import { deployControllers } from 'fixtures/deployControllers'
import { PortfolioStatus } from './structuredPortfolioFixture'

export async function trancheVaultFixture([wallet, protocol]: Wallet[]) {
  const { depositController, withdrawController, transferController } = await deployControllers(wallet)

  const { protocolConfig, protocolConfigParams } = await deployProtocolConfig(wallet, protocol)

  const tokenDecimals = 6
  const token = await new MockToken__factory(wallet).deploy(tokenDecimals)
  await token.mint(wallet.address, 1e10)

  const waterfallIndex = 1
  const trancheFloor = utils.parseUnits('1', tokenDecimals)
  const trancheCeiling = utils.parseUnits('100', tokenDecimals)
  const managerFeeRate = 0

  const defaultDeployParams = {
    name: 'Tranche',
    symbol: 'TRNCH',
    token: token.address,
    depositController: depositController.address,
    withdrawController: withdrawController.address,
    transferController: transferController.address,
    protocolConfig: protocolConfig.address,
    waterfallIndex,
    manager: wallet.address,
    managerFeeRate,
  }

  const deployTranche = (paramsOverrides?: Partial<typeof defaultDeployParams>) => {
    const deployParams = { ...defaultDeployParams, ...paramsOverrides }
    return deployBehindProxy(new TrancheVault__factory(wallet),
      deployParams.name,
      deployParams.symbol,
      deployParams.token,
      deployParams.depositController,
      deployParams.withdrawController,
      deployParams.transferController,
      deployParams.protocolConfig,
      deployParams.waterfallIndex,
      deployParams.manager,
      deployParams.managerFeeRate,
    )
  }

  const tranche = await deployTranche()

  const portfolio = await deployMockContract(wallet, StructuredPortfolio__factory.abi)
  await portfolio.mock.status.returns(PortfolioStatus.CapitalFormation)
  await portfolio.mock.paused.returns(false)
  await tranche.setPortfolio(portfolio.address)

  async function depositToTranche(amount: BigNumberish, receiver = wallet.address) {
    await token.approve(tranche.address, amount)
    await tranche.deposit(amount, receiver)
  }

  return {
    tranche,
    token,
    depositToTranche,
    depositController,
    portfolio,
    trancheFloor,
    trancheCeiling,
    withdrawController,
    waterfallIndex,
    protocolConfig,
    protocolConfigParams,
    deployTranche,
    transferController,
  }
}
