import { waffle } from 'hardhat'
import { utils } from 'ethers'
import fs from 'fs'

const init = (waffle.provider as any)._hardhatNetwork.provider._wrapped._wrapped._wrapped._init

const logFilePath = process.env.TX_LOG_FILE
const uniqueEntries = new Set<string>()
const addressFromBuf = (buf: Buffer) => utils.getAddress(utils.hexlify(buf))
const afterTxListener = (event) => {
  const tx = event.transaction
  const to = tx.to?.buf ? addressFromBuf(tx.to.buf) : undefined
  const type = to ? (tx.data?.length ? 'FunctionCall' : 'Regular') : 'ContractCreated'
  const entry: any = {
    event: type,
    gas_used: '0x' + event.gasUsed?.toString(16),
    value: '0x' + tx.value.toString(16),
  }
  if (type === 'ContractCreated') {
    entry.contract_address = addressFromBuf(event.createdAddress.buf)
  }
  if (type !== 'Regular') {
    entry.from = addressFromBuf(event.execResult.runState.caller.buf)
    entry.gas_price = '0x' + event.execResult?.gas?.toString(16)
  }
  if (to) {
    entry.to = to
  }
  if (tx.data) {
    entry.data = utils.hexlify(tx.data)
  }
  const stringified = JSON.stringify(entry, null, 2)
  if (uniqueEntries.has(stringified)) {
    return
  }
  uniqueEntries.add(stringified)
  const logFile = fs.createWriteStream(logFilePath, { flags: 'a' })
  logFile.write(stringified + '\n')
  logFile.close()
}

function recordTransactions() {
  if (!logFilePath) {
    return
  }

  if (typeof (waffle.provider as any)._hardhatNetwork.provider._wrapped._wrapped._wrapped._node._vmTracer._vm.off === 'function') {
    (waffle.provider as any)._hardhatNetwork.provider._wrapped._wrapped._wrapped._node._vmTracer._vm.off('afterTx', afterTxListener)
  }
  (waffle.provider as any)._hardhatNetwork.provider._wrapped._wrapped._wrapped._node._vmTracer._vm.on('afterTx', afterTxListener)
}

(waffle.provider as any)._hardhatNetwork.provider._wrapped._wrapped._wrapped._init = async function () {
  await init.apply(this)
  recordTransactions()
}
