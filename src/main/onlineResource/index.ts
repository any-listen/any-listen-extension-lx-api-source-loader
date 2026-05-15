import { getMusicUrl } from '../isolate'
import { configuration, musicUtils, registerResourceAction } from '../shared/hostAPI'

export const initOnlineResource = async () => {
  registerResourceAction({
    async musicUrl(params) {
      const quality = params.quality || '128k'
      let url = await getMusicUrl(params.musicInfo, quality)
      url = await musicUtils.createProxyUrl(url, {}, (await configuration.getConfigs<[boolean]>(['enabledCache']))[0])
      return { quality, url }
    },
  })
}
