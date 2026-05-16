declare global {
  interface LXScriptInfo {
    name?: string
    description?: string
    author?: string
    homepage?: string
    version?: string
  }
  interface LXScriptInfoFull extends LXScriptInfo {
    id: string
    allowShowUpdateAlert: boolean
    fileName: string
    fileDesc: string
  }

  interface IPCIsolateObject {
    setupEnv: (scriptInfo: LXScriptInfo, rawScript: string) => Promise<void>
    getMusicUrl: (musicInfo: unknown, type: string) => Promise<string>
    setEnabledSourceLogout: (enabled: boolean) => Promise<void>
  }
  interface IPCEXtensionRequestOptions {
    url: string
    method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'PATCH'
    query?: Record<string, string | number | null | undefined | boolean>
    headers?: Record<string, string>
    timeout?: number
    maxRedirect?: number
    json?: Record<string, unknown>
    form?: Record<string, string | number | null | undefined | boolean>
    binary?: Uint8Array
    text?: string
    formdata?: Record<string, string | Uint8Array>
    xml?: string
    needRaw?: boolean
  }
  interface IPCExtensionObject {
    request: (options: IPCEXtensionRequestOptions) => Promise<{
      statusCode?: number
      // statusMessage?: string
      headers: Record<string, string | string[] | undefined>
      body: unknown
    }>
    log: (...args: unknown[]) => Promise<void>
    error: (...args: unknown[]) => Promise<void>
    warn: (...args: unknown[]) => Promise<void>
    debug: (...args: unknown[]) => Promise<void>

    inited: (info: Record<string, string[]> | null, status: boolean, errorMessage?: string) => Promise<void>
    showUpdateAlert: (log: string, updateUrl?: string) => Promise<void>
  }
}

export {}
