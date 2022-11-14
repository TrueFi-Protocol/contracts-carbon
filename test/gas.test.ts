import { setupFixtureLoader } from './setup'
import { structuredPortfolioFactoryFixture } from 'fixtures/structuredPortfolioFactoryFixture'
import { ContractTransaction } from 'ethers'
import { DepositController__factory, WithdrawController__factory } from 'contracts'
import {
  PortfolioStatus,
  structuredPortfolioFixture,
  structuredPortfolioLiveFixture,
} from 'fixtures/structuredPortfolioFixture'
import { depositControllerFixture } from 'fixtures/depositControllerFixture'
import { withdrawControllerFixture } from 'fixtures/withdrawControllerFixture'

const numberWithCommas = (x: string) => x.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const printGasCost = async (tx: ContractTransaction) => {
  console.log('Gas used: ', numberWithCommas((await tx.wait()).gasUsed.toString()))
}

describe('Gas cost', () => {
  const loadFixture = setupFixtureLoader()

  it('set ceiling in DepositController', async () => {
    const { depositController } = await loadFixture(depositControllerFixture)
    await printGasCost(await depositController.setCeiling(100))
  })

  it('set floor in WithdrawController', async () => {
    const { withdrawController } = await loadFixture(withdrawControllerFixture)
    await printGasCost(await withdrawController.setFloor(100))
  })

  it('create Structured portfolio with 3 tranches', async () => {
    const { createPortfolioTx } = await loadFixture(structuredPortfolioFactoryFixture)
    await printGasCost(createPortfolioTx)
  })

  it('create Structured portfolio with 3 tranches plus setup', async () => {
    const {
      structuredPortfolioFactory,
      token,
      fixedInterestOnlyLoans,
      portfolioParams,
      tranchesInitData,
      expectedEquityRate,
      wallet,
      getTranchesFromTx,
    } = await loadFixture(structuredPortfolioFactoryFixture)

    const createPortfolioTx = await structuredPortfolioFactory.createPortfolio(
      token.address,
      fixedInterestOnlyLoans.address,
      portfolioParams,
      tranchesInitData,
      expectedEquityRate,
    )
    const tranches = await getTranchesFromTx(createPortfolioTx)

    let totalCost = (await createPortfolioTx.wait()).gasUsed
    for (let i = 0; i < tranches.length; i++) {
      const depositControllerAddress = await tranches[i].depositController()
      const withdrawControllerAddress = await tranches[i].withdrawController()
      const depositController = DepositController__factory.connect(depositControllerAddress, wallet)
      const withdrawController = WithdrawController__factory.connect(withdrawControllerAddress, wallet)
      const setCeilingTx = await depositController.setCeiling(100)
      const setFloorTx = await withdrawController.setFloor(100)
      totalCost = totalCost.add((await setCeilingTx.wait()).gasUsed)
      totalCost = totalCost.add((await setFloorTx.wait()).gasUsed)
    }
    console.log('Total gas used: ', numberWithCommas(totalCost.toString()))
  })

  it('senior tranche live deposit (w/o approve)', async () => {
    const { depositToTranche, seniorTranche } = await loadFixture(structuredPortfolioLiveFixture)
    await printGasCost(await depositToTranche(seniorTranche, 100))
  })

  it('equity tranche live deposit (w/o approve)', async () => {
    const { depositToTranche, equityTranche } = await loadFixture(structuredPortfolioLiveFixture)
    await printGasCost(await depositToTranche(equityTranche, 100))
  })

  it('senior tranche live withdraw', async () => {
    const { depositToTranche, withdrawFromTranche, seniorTranche } = await loadFixture(structuredPortfolioLiveFixture)
    await depositToTranche(seniorTranche, 100)
    await printGasCost(await withdrawFromTranche(seniorTranche, 100))
  })

  it('equity tranche live withdraw', async () => {
    const { depositToTranche, withdrawFromTranche, equityTranche } = await loadFixture(structuredPortfolioLiveFixture)
    await depositToTranche(equityTranche, 100)
    await printGasCost(await withdrawFromTranche(equityTranche, 100))
  })

  it('live deposit with 3 tranches (first deposit)', async () => {
    const {
      structuredPortfolioFactory,
      token,
      fixedInterestOnlyLoans,
      portfolioParams,
      tranchesInitData,
      expectedEquityRate,
      wallet,
      getTranchesFromTx,
      depositToTranche,
      parseTokenUnits,
      getPortfolioFromTx,
    } = await loadFixture(structuredPortfolioFactoryFixture)

    const createPortfolioTx = await structuredPortfolioFactory.createPortfolio(
      token.address,
      fixedInterestOnlyLoans.address,
      portfolioParams,
      tranchesInitData,
      expectedEquityRate,
    )
    const tranches = await getTranchesFromTx(createPortfolioTx)

    for (let i = 0; i < tranches.length; i++) {
      const depositControllerAddress = await tranches[i].depositController()
      const withdrawControllerAddress = await tranches[i].withdrawController()
      const depositController = DepositController__factory.connect(depositControllerAddress, wallet)
      const withdrawController = WithdrawController__factory.connect(withdrawControllerAddress, wallet)
      await depositController.setCeiling(parseTokenUnits(1e10))
      await withdrawController.setFloor(1)
      await depositController.setDepositAllowed(true, PortfolioStatus.Live)
      await withdrawController.setWithdrawAllowed(true, PortfolioStatus.Live)
    }

    const portfolio = await getPortfolioFromTx(createPortfolioTx)
    await portfolio.start()

    await printGasCost(await depositToTranche(tranches[0], 300))
  })

  it('live deposit with single tranche (first deposit)', async () => {
    const {
      structuredPortfolioFactory,
      token,
      fixedInterestOnlyLoans,
      portfolioParams,
      tranchesInitData,
      expectedEquityRate,
      wallet,
      getTranchesFromTx,
      getPortfolioFromTx,
      depositToTranche,
    } = await loadFixture(structuredPortfolioLiveFixture)

    const createPortfolioTx = await structuredPortfolioFactory.createPortfolio(
      token.address,
      fixedInterestOnlyLoans.address,
      portfolioParams,
      [tranchesInitData[0]],
      expectedEquityRate,
    )
    const portfolio = await getPortfolioFromTx(createPortfolioTx)
    const [tranche] = await getTranchesFromTx(createPortfolioTx)
    const depositControllerAddress = await tranche.depositController()
    const depositController = DepositController__factory.connect(depositControllerAddress, wallet)
    await depositController.setCeiling(400)
    await portfolio.start()
    await depositController.setDepositAllowed(true, PortfolioStatus.Live)

    await printGasCost(await depositToTranche(tranche, 100))
  })

  it('live deposit with single tranche (second deposit)', async () => {
    const {
      structuredPortfolioFactory,
      token,
      fixedInterestOnlyLoans,
      portfolioParams,
      tranchesInitData,
      expectedEquityRate,
      wallet,
      getTranchesFromTx,
      getPortfolioFromTx,
      depositToTranche,
    } = await loadFixture(structuredPortfolioLiveFixture)

    const createPortfolioTx = await structuredPortfolioFactory.createPortfolio(
      token.address,
      fixedInterestOnlyLoans.address,
      portfolioParams,
      [tranchesInitData[0]],
      expectedEquityRate,
    )
    const portfolio = await getPortfolioFromTx(createPortfolioTx)
    const [tranche] = await getTranchesFromTx(createPortfolioTx)
    const depositControllerAddress = await tranche.depositController()
    const depositController = DepositController__factory.connect(depositControllerAddress, wallet)
    await depositController.setCeiling(400)
    await portfolio.start()
    await depositController.setDepositAllowed(true, PortfolioStatus.Live)

    await depositToTranche(tranche, 100)
    await printGasCost(await depositToTranche(tranche, 100))
  })

  it('capital formation first (and second) deposits', async () => {
    const { depositToTranche, seniorTranche } = await loadFixture(structuredPortfolioFixture)
    await printGasCost(await depositToTranche(seniorTranche, 100))
    await printGasCost(await depositToTranche(seniorTranche, 100))
  })

  it('withdraw from closed portfolio', async () => {
    const { withdrawFromTranche, depositToTranche, seniorTranche, startAndClosePortfolio } = await loadFixture(structuredPortfolioFixture)
    await depositToTranche(seniorTranche, 100)
    await startAndClosePortfolio()
    await printGasCost(await withdrawFromTranche(seniorTranche, 100))
  })
})
