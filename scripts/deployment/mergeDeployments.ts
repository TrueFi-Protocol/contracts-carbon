import { safeReadJsonFile, writeJsonFile } from '../utils'
import { existsSync, mkdirSync, readdirSync } from 'fs'

function mergeDeployments() {
  if (!existsSync('./build')) {
    mkdirSync('./build')
  }
  const deploymentsFiles = readdirSync('./').map(e => e.match(/^deployments-(.+)\.json$/)).filter(Boolean)
  const merged = deploymentsFiles.reduce((prev, [file, network]) => ({...prev, [network]:safeReadJsonFile(file)[network]}), {})
  writeJsonFile('build/deployments.json', merged)
}

mergeDeployments()
