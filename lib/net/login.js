import jwt from 'jsonwebtoken'
import { promisify } from 'node:util'
import { sendForm } from './request.js'
import { log } from '../util/log.js'

const createJWT = promisify(jwt.sign)

let accessToken
let accessType
let accessExpires

function getAuthUrl(account) {
  return account.auth_uri || 'https://www.googleapis.com/oauth2/v4/token'
}

async function createGoogleJWT(account) {
  const options = {
    algorithm: 'RS256',
    keyid: account.private_key_id
  }
  const now = Math.trunc(Date.now() / 1000)
  const payload = {
    iat: now,
    exp: now + 3600,
    scope: account.scope || 'https://www.googleapis.com/auth/cloud-platform',
    aud: getAuthUrl(account),
    iss: account.client_email,
    sub: account.client_email
  }
  log('> authenticate with %d characters private key\n and header %O\n and payload %O',
    account.private_key.length, { ...options, keyid: `${options.keyid.length} characters` }, payload)
  const signedToken = await createJWT(payload, account.private_key, options)
  return signedToken
}

export async function refreshAccessToken(account) {
  const signedToken = await createGoogleJWT(account);
  ({ access_token: accessToken, token_type: accessType, expires_in: accessExpires } =
    await sendForm('POST', getAuthUrl(account), {
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedToken
    }))
  accessExpires = Date.now() + (accessExpires - 60) * 1000
  log('< access with %d characters %s', accessToken.length, accessType)
  return { accessToken, accessType }
}

export function useAccessToken(account) {
  if (accessExpires && Date.now() < accessExpires) {
    return { accessToken, accessType }
  }
  return refreshAccessToken(account)
}
