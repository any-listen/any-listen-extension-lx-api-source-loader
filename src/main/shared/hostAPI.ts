// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require('any-listen')

export const console = {
  log: api.logcat.info,
  error: api.logcat.error,
  warn: api.logcat.warn,
  debug: api.logcat.debug,
}

export const registerResourceAction = api.registerResourceAction

export const request = api.request!
export const t = api.t

export const crypto = api.utils.crypto
export const iconv = api.utils.iconv
export const zlib = api.utils.zlib
export const dataConverter = api.utils.dataConverter

export const createIsolateContext = api.utils.createIsolateContext!

export const storage = api.storage
export const configuration = api.configuration
export const musicUtils = api.musicUtils
export const command = api.command
export const app = api.app
