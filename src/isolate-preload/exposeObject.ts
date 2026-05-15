import { setupEnv } from './setupEnv'

let handler: (musicInfo: any, type: string) => Promise<string>

export const setMusicUrlHandler = (_handler: (musicInfo: any, type: string) => Promise<string>) => {
  handler = _handler
}
export const exposeObject: IPCIsolateObject = {
  async getMusicUrl(musicInfo, type) {
    // console.log('getMusicUrl', musicInfo, type)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!handler) {
      throw new Error('Handler not set')
    }
    return handler(musicInfo, type)
  },
  async setupEnv(info, rawScript) {
    setupEnv(info, rawScript)
  },
}
