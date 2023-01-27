import { setupFixtureLoader } from './setup'
import { BigNumber, constants } from 'ethers'
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
import { extractEventArgFromTx } from 'utils/extractEventArgFromTx'

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

  describe('Single tranche', () => {
    it('create Structured portfolio', async () => {
      const {
        structuredPortfolioFactory,
        token,
        fixedInterestOnlyLoans,
        portfolioParams,
        tranchesInitData,
        expectedEquityRate,
      } = await loadFixture(structuredPortfolioLiveFixture)

      const createPortfolioTx = await structuredPortfolioFactory.createPortfolio(
        token.address,
        fixedInterestOnlyLoans.address,
        portfolioParams,
        [tranchesInitData[0]],
        expectedEquityRate,
      )

      await printGasCost(createPortfolioTx)
    })

    it('start portfolio', async () => {
      const {
        structuredPortfolioFactory,
        token,
        fixedInterestOnlyLoans,
        portfolioParams,
        tranchesInitData,
        expectedEquityRate,
        getPortfolioFromTx,
      } = await loadFixture(structuredPortfolioLiveFixture)

      const createPortfolioTx = await structuredPortfolioFactory.createPortfolio(
        token.address,
        fixedInterestOnlyLoans.address,
        portfolioParams,
        [tranchesInitData[0]],
        expectedEquityRate,
      )
      const portfolio = await getPortfolioFromTx(createPortfolioTx)

      await printGasCost(await portfolio.start())
    })

    it('create and disburse loan', async () => {
      const {
        structuredPortfolioFactory,
        token,
        fixedInterestOnlyLoans,
        portfolioParams,
        tranchesInitData,
        expectedEquityRate,
        wallet,
        other,
        loan,
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
      await depositController.setCeiling(loan.principal)
      await portfolio.start()
      await depositController.setDepositAllowed(true, PortfolioStatus.Live)
      await depositToTranche(tranche, loan.principal)

      const addLoanTx = (await portfolio.addLoan(loan))
      let totalCost = (await addLoanTx.wait()).gasUsed

      const loanId: BigNumber = await extractEventArgFromTx(addLoanTx, [portfolio.address, 'LoanAdded', 'loanId'])
      const acceptTx = await fixedInterestOnlyLoans.connect(other).acceptLoan(loanId)

      const fundLoanTx = await portfolio.fundLoan(loanId)
      totalCost = totalCost.add((await fundLoanTx.wait()).gasUsed)

      console.log('Total gas used by manager: ', numberWithCommas(totalCost.toString()))
      console.log('Gas used by borrower for loan accept: ', numberWithCommas((await acceptTx.wait()).gasUsed.toString()))
    })

    it('repay loan', async () => {
      const {
        structuredPortfolioFactory,
        token,
        fixedInterestOnlyLoans,
        portfolioParams,
        tranchesInitData,
        expectedEquityRate,
        wallet,
        other,
        loan,
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
      await depositController.setCeiling(loan.principal)
      await portfolio.start()
      await depositController.setDepositAllowed(true, PortfolioStatus.Live)
      await depositToTranche(tranche, loan.principal)

      const addLoanTx = (await portfolio.addLoan(loan))
      await addLoanTx.wait()
      const loanId: BigNumber = await extractEventArgFromTx(addLoanTx, [portfolio.address, 'LoanAdded', 'loanId'])
      await fixedInterestOnlyLoans.connect(other).acceptLoan(loanId)
      await portfolio.fundLoan(loanId)

      await token.connect(other).approve(portfolio.address, constants.MaxUint256)
      const repayLoanTx = await portfolio.connect(other).repayLoan(loanId)

      await printGasCost(await repayLoanTx)
    })

    it('change full depositController configuration on portfolio', async () => {
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

      const status = await portfolio.status()
      const value = await depositController.depositAllowed(status)
      const configureTx = await depositController.configure(
        await (await depositController.ceiling()).add(100),
        await (await depositController.depositFeeRate()).add(100),
        await depositController.lenderVerifier(),
        { status: status, value: !value },
      )

      await printGasCost(await configureTx)
    })

    it('change one field in depositController configuration on portfolio', async () => {
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

      const status = await portfolio.status()
      const value = await depositController.depositAllowed(status)
      const configureTx = await depositController.configure(
        await (await depositController.ceiling()).add(100),
        await depositController.depositFeeRate(),
        await depositController.lenderVerifier(),
        { status: status, value: value },
      )

      await printGasCost(await configureTx)
    })

    it('change full withdrawController configuration on portfolio', async () => {
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
      const withdrawControllerAddress = await tranche.withdrawController()
      const withdrawController = WithdrawController__factory.connect(withdrawControllerAddress, wallet)
      await withdrawController.setFloor(400)
      await portfolio.start()

      const status = await portfolio.status()
      const value = await withdrawController.withdrawAllowed(status)
      const configureTx = await withdrawController.configure(
        await (await withdrawController.floor()).add(100),
        await (await withdrawController.withdrawFeeRate()).add(100),
        { status: status, value: !value },
      )

      await printGasCost(await configureTx)
    })

    it('change one field in withdrawController configuration on portfolio', async () => {
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
      const withdrawControllerAddress = await tranche.withdrawController()
      const withdrawController = WithdrawController__factory.connect(withdrawControllerAddress, wallet)
      await withdrawController.setFloor(400)
      await portfolio.start()

      const status = await portfolio.status()
      const value = await withdrawController.withdrawAllowed(status)
      const configureTx = await withdrawController.configure(
        await (await withdrawController.floor()).add(100),
        await withdrawController.withdrawFeeRate(),
        { status: status, value: value },
      )

      await printGasCost(await configureTx)
    })
  })
})
