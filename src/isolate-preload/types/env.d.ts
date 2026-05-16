import '@any-listen/extension-kit/isolate'

declare global {
  var console: {
    log: (...args: any[]) => void
    error: (...args: any[]) => void
    warn: (...args: any[]) => void
    debug: (...args: any[]) => void
    group: (...args: any[]) => void
    groupEnd: () => void
    info: (...args: any[]) => void
    time: (label?: string) => void
    timeEnd: (label?: string) => void
    clear: () => void
    groupCollapsed: (...args: any[]) => void
    trace: (...args: any[]) => void
  }
}
