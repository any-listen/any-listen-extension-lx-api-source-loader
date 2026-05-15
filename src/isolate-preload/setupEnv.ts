import { setMusicUrlHandler } from './exposeObject'
import { ipc } from './extensionObject'
import { fromUint8Array, toUint8Array } from './vendors/base64'
import md5 from './vendors/md5'

declare global {
  var lx: unknown
}

export const setupEnv = (scriptInfo: Omit<LXScriptInfo, 'id'>, rawScript: string) => {
  const EVENT_NAMES = {
    request: 'request',
    inited: 'inited',
    updateAlert: 'updateAlert',
  }
  let isInitedApi = false
  let isShowedUpdateAlert = false
  const eventNames = Object.values(EVENT_NAMES)
  const allSources = ['kw', 'kg', 'tx', 'wy', 'mg']
  const supportQualitys = {
    kw: ['128k', '320k', 'flac', 'flac24bit'],
    kg: ['128k', '320k', 'flac', 'flac24bit'],
    tx: ['128k', '320k', 'flac', 'flac24bit'],
    wy: ['128k', '320k', 'flac', 'flac24bit'],
    mg: ['128k', '320k', 'flac', 'flac24bit'],
  }

  const handleInit = (info?: { sources: Record<string, any> }) => {
    if (!info) {
      void ipc.inited(null, false, 'Missing required parameter init info')
      return
    }
    const sourceInfo = {
      sources: {} as unknown as Record<string, string[]>,
    }
    try {
      for (const source of allSources) {
        const userSource = info.sources[source]
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (userSource?.type !== 'music') continue
        const qualitys = supportQualitys[source as keyof typeof supportQualitys]
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        sourceInfo.sources[source] = qualitys.filter((q) => userSource.qualitys.includes(q))
      }
    } catch (error) {
      // console.log(error)
      void ipc.inited(null, false, (error as Error).message)
      return
    }
    void ipc.inited(sourceInfo.sources, true)
  }
  const handleShowUpdateAlert = async (data?: { log: string; updateUrl?: string }) => {
    if (!data || typeof data != 'object') throw new Error('parameter format error.')
    if (!data.log || typeof data.log != 'string') throw new Error('log is required.')
    if (data.updateUrl && !/^https?:\/\/[^\s$.?#].[^\s]*$/.test(data.updateUrl) && data.updateUrl.length > 1024) {
      delete data.updateUrl
    }
    if (data.log.length > 1024) data.log = `${data.log.substring(0, 1024)}...`
    await ipc.showUpdateAlert(data.log, data.updateUrl)
  }

  // 将字节数组解码为字符串（UTF-8）
  function bytesToString(bytes: number[]) {
    let result = ''
    let i = 0
    while (i < bytes.length) {
      const byte = bytes[i]
      if (byte < 128) {
        result += String.fromCharCode(byte)
        i++
      } else if (byte >= 192 && byte < 224) {
        result += String.fromCharCode(((byte & 31) << 6) | (bytes[i + 1] & 63))
        i += 2
      } else {
        result += String.fromCharCode(((byte & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63))
        i += 3
      }
    }
    return result
  }
  // 将字符串编码为字节数组（UTF-8）
  function stringToBytes(inputString: string) {
    const bytes: number[] = []
    for (let i = 0; i < inputString.length; i++) {
      const charCode = inputString.charCodeAt(i)
      if (charCode < 128) {
        bytes.push(charCode)
      } else if (charCode < 2048) {
        bytes.push((charCode >> 6) | 192)
        bytes.push((charCode & 63) | 128)
      } else {
        bytes.push((charCode >> 12) | 224)
        bytes.push(((charCode >> 6) & 63) | 128)
        bytes.push((charCode & 63) | 128)
      }
    }
    return bytes
  }
  const utils = {
    crypto: {
      // aesEncrypt(buffer: Uint8Array | string, mode: string, key: Uint8Array | string, iv: Uint8Array | string) {
      //   // // console.log('aesEncrypt', buffer, mode, key, iv)
      //   // switch (mode) {
      //   //   case 'aes-128-cbc': {
      //   //     const textBytes = typeof buffer === 'string' ? new Uint8Array(stringToBytes(buffer)) : buffer
      //   //     const ivBytes = typeof iv === 'string' ? new Uint8Array(stringToBytes(iv)) : iv
      //   //     const keyBytes = typeof key === 'string' ? new Uint8Array(stringToBytes(key)) : key
      //   //     const aesCbc = new CBC(keyBytes, ivBytes)
      //   //     const encryptedBytes = new Uint8Array(textBytes.length)
      //   //     aesCbc.encrypt(textBytes, encryptedBytes)
      //   //     return fromUint8Array(encryptedBytes)
      //   //   }
      //   //   case 'aes-128-ecb': {
      //   //     const textBytes = typeof buffer === 'string' ? new Uint8Array(stringToBytes(buffer)) : buffer
      //   //     const keyBytes = typeof key === 'string' ? new Uint8Array(stringToBytes(key)) : key
      //   //     const aesEcb = new ECB(keyBytes)
      //   //     const encryptedBytes = new Uint8Array(textBytes.length)
      //   //     aesEcb.encrypt(textBytes, encryptedBytes)
      //   //     return fromUint8Array(encryptedBytes)
      //   //   }
      //   //   default:
      //   //     throw new Error('Binary encoding is not supported for input strings')
      //   // }
      //   throw new Error('AES encryption is not supported')
      // },
      // rsaEncrypt(buffer: string | Uint8Array, key: string) {
      //   throw new Error('RSA encryption is not supported')
      // },
      randomBytes(size: number) {
        const byteArray = new Uint8Array(size)
        for (let i = 0; i < size; i++) {
          byteArray[i] = Math.floor(Math.random() * 256) // 随机生成一个字节的值（0-255）
        }
        return byteArray
      },
      md5(str: string) {
        if (typeof str !== 'string') throw new Error('param required a string')
        return md5(str)
      },
    },
    buffer: {
      from(input: string | Uint8Array | number[], encoding?: 'binary' | 'hex' | 'base64' | 'utf8' | 'utf-8') {
        // console.log('buffer.from', input, encoding)
        if (typeof input === 'string') {
          switch (encoding) {
            case 'binary':
              throw new Error('Binary encoding is not supported for input strings')
            case 'base64':
              return toUint8Array(input)
            case 'hex':
              return new Uint8Array(input.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)))
            default:
              return new Uint8Array(stringToBytes(input))
          }
        } else if (Array.isArray(input)) {
          return new Uint8Array(input)
        } else {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          throw new Error(`Unsupported input type: ${input} encoding: ${encoding}`)
        }
      },
      bufToString(buf: Uint8Array | number[], format: 'binary' | 'hex' | 'base64' | 'utf8' | 'utf-8') {
        // console.log('buffer.bufToString', buf, format)
        if (Array.isArray(buf) || ArrayBuffer.isView(buf)) {
          switch (format) {
            case 'binary':
              // return new TextDecoder('latin1').decode(new Uint8Array(buf))
              return buf
            case 'hex':
              return new Uint8Array(buf).reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')
            case 'base64':
              return fromUint8Array(buf)
            case 'utf8':
            case 'utf-8':
              return bytesToString(Array.from(buf))
          }
        } else {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          throw new Error(`Input is not a valid buffer: ${buf} format: ${format}`)
        }
      },
    },
  }
  globalThis.lx = {
    EVENT_NAMES,

    request(
      url: string,
      {
        method = 'GET',
        timeout,
        headers = {},
        body,
        form,
        formData,
        binary,
      }: {
        method?: IPCEXtensionRequestOptions['method']
        timeout?: IPCEXtensionRequestOptions['timeout']
        headers?: IPCEXtensionRequestOptions['headers']
        body?: string | Uint8Array | Record<string, unknown>
        form?: IPCEXtensionRequestOptions['form']
        formData?: IPCEXtensionRequestOptions['formdata']
        binary?: boolean
      },
      callback: (
        err: Error | null,
        resp: {
          statusCode?: number
          statusMessage?: string
          headers: Record<string, string | string[] | undefined>
          body: unknown
        } | null,
        body: unknown
      ) => void
    ) {
      const options: IPCEXtensionRequestOptions = { headers, url, method, form, formdata: formData }
      if (timeout && typeof timeout == 'number' && timeout > 0) options.timeout = Math.min(timeout, 60_000)
      if (!headers.accept) options.headers!.accept = '*/*'
      if (binary) options.binary = body as Uint8Array
      else if (typeof body === 'string') options.text = body
      else if (typeof body === 'object') options.json = body as Record<string, unknown>

      const promise = ipc.request(options)

      promise
        .then((resp) => {
          // console.log(resp.body)
          callback(
            null,
            {
              statusCode: resp.statusCode,
              statusMessage: '',
              headers: resp.headers,
              body: resp.body,
            },
            resp.body
          )
        })
        .catch((err) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          callback(err, null, null)
        })

      return () => {}
    },

    async send(eventName: string, data: unknown) {
      if (!eventNames.includes(eventName)) throw new Error(`The event is not supported: ${eventName}`)
      switch (eventName) {
        case EVENT_NAMES.inited:
          if (isInitedApi) throw new Error('Script is inited')
          isInitedApi = true
          handleInit(data as { sources: Record<string, { actions: string[]; qualitys: string[] }> })
          break
        case EVENT_NAMES.updateAlert:
          if (isShowedUpdateAlert) throw new Error('The update alert can only be called once.')
          isShowedUpdateAlert = true
          await handleShowUpdateAlert(data as { log: string; updateUrl?: string })
          break
        default:
          throw new Error(`Unknown event name: ${eventName}`)
      }
    },

    async on(eventName: string, handler: (data: unknown) => Promise<unknown>) {
      if (!eventNames.includes(eventName)) throw new Error(`The event is not supported: ${eventName}`)
      switch (eventName) {
        case EVENT_NAMES.request:
          setMusicUrlHandler(async (musicInfo: any, type: string) => {
            return (
              handler
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                .call(globalThis.lx, { source: musicInfo.source, action: 'musicUrl', info: { type, musicInfo } })
                .then((response) => {
                  if (typeof response != 'string' || response.length > 2048 || !/^https?:/.test(response)) {
                    throw new Error('Invalid response')
                  }
                  return response
                })
            )
          })
          break
        default:
          throw new Error(`The event is not supported: ${eventName}`)
      }
    },

    utils,
    currentScriptInfo: {
      name: scriptInfo.name || '',
      description: scriptInfo.description || '',
      version: scriptInfo.version || '',
      author: scriptInfo.author || '',
      homepage: scriptInfo.homepage || '',
      rawScript,
    },
    version: '2.0.0',
    env: 'desktop',
  }

  const freezeObject = (obj: any) => {
    if (typeof obj != 'object') return
    Object.freeze(obj)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    for (const subObj of Object.values(obj)) freezeObject(subObj)
  }
  freezeObject(globalThis.lx)

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const _toString = Function.prototype.toString

  // eslint-disable-next-line no-extend-native
  Function.prototype.toString = function () {
    return Object.getOwnPropertyDescriptors(this).name.configurable
      ? _toString.apply(this)
      : `function ${this.name}() { [native code] }`
  }

  // eslint-disable-next-line no-eval
  globalThis.eval = function () {
    throw new Error('eval is not available')
  }
  const proxyFunctionConstructor = new Proxy(Function.prototype.constructor, {
    apply() {
      throw new Error('Dynamic code execution is not allowed.')
    },
    construct() {
      throw new Error('Dynamic code execution is not allowed.')
    },
  })

  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Function.prototype, 'constructor', {
    value: proxyFunctionConstructor,
    writable: false,
    configurable: false,
    enumerable: false,
  })
  // @ts-expect-error override Function constructor
  globalThis.Function = proxyFunctionConstructor
  // globalThis.Function = function() {
  //   throw new Error('Function is not available')
  // }

  // eslint-disable-next-line @typescript-eslint/unbound-method
  const excludes = [Function.prototype.toString, Function.prototype.toLocaleString, Object.prototype.toString]
  const freezeObjectProperty = (obj: any, freezedObj = new Set()) => {
    if (obj == null) return
    switch (typeof obj) {
      case 'object':
      case 'function':
        if (freezedObj.has(obj)) return
        // Object.freeze(obj)
        freezedObj.add(obj)
        for (const [name, { ...config }] of Object.entries(Object.getOwnPropertyDescriptors(obj))) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          if (!excludes.includes(config.value)) {
            config.writable &&= false
            config.configurable &&= false
            Object.defineProperty(obj, name, config)
          }
          freezeObjectProperty(config.value, freezedObj)
        }
        break
      default:
        break
    }
  }
  freezeObjectProperty(globalThis)
}
