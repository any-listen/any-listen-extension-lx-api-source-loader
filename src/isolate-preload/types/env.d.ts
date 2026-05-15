import '@any-listen/extension-kit/isolate'

declare global {
  var console: {
    log: (...args: any[]) => void
    error: (...args: any[]) => void
  }
}
