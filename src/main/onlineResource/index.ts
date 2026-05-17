import { getMusicUrl } from '../isolate'
import { configuration, console, musicUtils, registerResourceAction } from '../shared/hostAPI'

export const initOnlineResource = async () => {
  registerResourceAction({
    async musicUrl(params) {
      const quality = params.quality || '128k'
      let url = await getMusicUrl(params.musicInfo, quality)
      console.log(`${params.musicInfo.name}, ${params.musicInfo.meta.source}, ${quality}: ${url}`)
      url = await musicUtils.createProxyUrl(url, {}, (await configuration.getConfigs<[boolean]>(['enabledCache']))[0])
      console.log(`proxy: ${url}`)
      return { quality, url }
    },
  })
}
