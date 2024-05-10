import { readFile } from 'node:fs/promises'
import builtinDefaults from '../../model-defaults.json'
import { log } from './log.js'

const account = await readJSON('google-account.json')
const defaults = await readDefaults()
const { apiLocation, apiEndpoint, geminiDefaults, bisonDefaults } = defaults

async function readJSON(file, force) {
  try {
    log('read %s', file)
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT' && force) {
      log('%s not found', file)
      return {}
    }
    throw err
  }
}

async function readDefaults() {
  const json = await readJSON('model-defaults.json', true)
  return {
    ...builtinDefaults,
    ...json,
    geminiDefaults: {
      ...builtinDefaults.geminiDefaults,
      ...json.geminiDefaults,
      generationConfig: {
        ...builtinDefaults.geminiDefaults.generationConfig,
        ...json.geminiDefaults?.generationConfig
      },
      safetySettings: json.geminiDefaults?.safetySettings || builtinDefaults.geminiDefaults.safetySettings,
    },
    bisonDefaults: {
      ...builtinDefaults.bisonDefaults,
      ...json.bisonDefaults,
      parameters: {
        ...builtinDefaults.bisonDefaults.parameters,
        ...json.bisonDefaults?.parameters
      }
    }
  }
}

export { account, apiLocation, apiEndpoint, geminiDefaults, bisonDefaults }
