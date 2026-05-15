import { console, request } from '../shared/hostAPI'

export const exposeObject: Partial<IPCExtensionObject> = {
  async request(options) {
    return request(options.url, {
      method: options.method,
      json: options.json,
      binary: options.binary,
      maxRedirect: options.maxRedirect,
      needRaw: options.needRaw,
      query: options.query,
      form: options.form,
      headers: options.headers,
      timeout: options.timeout,
      formdata: options.formdata,
      text: options.text,
      xml: options.xml,
    })
  },
  async log(...args) {
    console.log(...args)
  },
  async error(...args) {
    console.error(...args)
  },
}
