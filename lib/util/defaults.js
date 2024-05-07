import { readFile } from 'node:fs/promises'
import builtinDefaults from '../../model-defaults.json'
import { log } from './log.js'

const account = await readJSON('google-account.json')
const defaults = await readJSON('model-defaults.json', builtinDefaults)
const { apiLocation, apiEndpoint, geminiDefaults, bisonDefaults } = defaults

async function readJSON(file, defaults) {
  let text
  try {
    log('read %s', file)
    text = await readFile(file, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT' && defaults) {
      log('%s not found', file)
      return defaults
    }
    throw err
  }
  return JSON.parse(text)
}

export { account, apiLocation, apiEndpoint, geminiDefaults, bisonDefaults }
