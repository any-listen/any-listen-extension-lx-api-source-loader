import { createMessage2Call } from 'message2call'

import { EXTENSION } from '../shared/constants'
import { app, console, createIsolateContext, t } from '../shared/hostAPI'
import { verifyUrl } from '../shared/utils'
import { exposeObject } from './exposeObject'

const createIsolate = async (scriptInfo: LXScriptInfoFull) => {
  let sources: Record<string, string[]> | null = null
  const msg2call = createMessage2Call<IPCIsolateObject>({
    exposeObj: {
      ...exposeObject,
      async inited(info: Record<string, string[]> | null, status: boolean, errorMessage?: string) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
        if (status === true || status == null) {
          sources = info
          console.log(
            `[${scriptInfo.name}]Init successfully: ${Object.entries(info || {})
              .map(([k, v]) => `${k}: ${v.join('|')}`)
              .join('; ')}`
          )
          // void app.showMessage(t('isolate.loadScriptSuccess', { name: scriptInfo.name || scriptInfo.fileName }))
        } else {
          console.error(
            `[${scriptInfo.name}]Init failed: ${JSON.stringify(info)}${errorMessage ? `\nError: ${errorMessage}` : ''}`
          )
          void app.showMessage(t('error.initScriptsFailed', { message: errorMessage || 'Unknown error' }), {
            type: 'error',
          })
        }
      },
      async showUpdateAlert(log: string, url?: string) {
        void app.showMessage(
          t('isolate.updateAvailable', {
            name: scriptInfo.name || scriptInfo.fileName,
            log: typeof log === 'string' ? log : JSON.stringify(log),
          }),
          {
            type: 'info',
          }
        )
        console.log(`Update available:\n${log}${url ? `\nUpdate URL: ${url}` : ''}`)
      },
    },
    sendMessage(data) {
      void isolate.sendMessage(data)
    },
    isSendErrorStack: true,
    timeout: 0,
  })
  const isolate = await createIsolateContext((data) => {
    msg2call.message(data)
  })

  await isolate.runFile(`${EXTENSION.extensionDir}/resources/isolate-preload.js`)

  return {
    runScript: async (code: string) => isolate.run(code),
    destroy: async () => isolate.destroy(),
    remote: msg2call.remote,
    get sources() {
      return sources
    },
  }
}

const toLXMusicInfo = (minfo: AnyListen_API.MusicInfoOnline): unknown => {
  const oInfo: Record<string, any> = {
    name: minfo.name,
    singer: minfo.singer,
    source: minfo.meta.source,
    songmid: minfo.meta.musicId,
    interval: minfo.interval,
    albumName: minfo.meta.albumName,
    typeUrl: {},
  }
  oInfo.albumId = minfo.meta.albumId
  oInfo.types = Object.fromEntries(
    (Object.entries(minfo.meta.qualitys ?? {}) as Array<[string, { sizeStr?: string; [key: string]: unknown }]>).map(
      ([key, { sizeStr, ...val }]) => [key, sizeStr == null ? val : { ...val, size: sizeStr }]
    )
  )

  switch (minfo.meta.source) {
    case 'kg':
      oInfo.hash = minfo.meta.hash
      break
    case 'tx':
      oInfo.strMediaMid = minfo.meta.strMediaMid
      oInfo.albumMid = minfo.meta.albumMid
      oInfo.songId = minfo.meta.songId
      break
    case 'mg':
      oInfo.copyrightId = minfo.meta.copyrightId
      oInfo.lrcUrl = minfo.meta.lrcUrl
      oInfo.mrcUrl = minfo.meta.mrcUrl
      oInfo.trcUrl = minfo.meta.trcUrl
      break
  }

  return oInfo
}

export const scripts: Array<{
  id: string
  destroy: () => Promise<void>
  getMusicUrl: (musicInfo: AnyListen_API.MusicInfoOnline, type: string) => Promise<string>
  setEnabledSourceLogout: (enabled: boolean) => Promise<void>
  sources: Record<string, string[]> | null
  info: LXScriptInfoFull
}> = []

export const runScript = async (id: string, scriptInfo: LXScriptInfoFull, script: string, enabledSourceLogout: boolean) => {
  const isolate = await createIsolate(scriptInfo)
  await isolate.remote.setEnabledSourceLogout(enabledSourceLogout)
  await isolate.remote.setupEnv(scriptInfo, script)
  await isolate.runScript(script)

  scripts.push({
    id,
    info: scriptInfo,
    destroy: async () => {
      scripts.splice(
        scripts.findIndex((s) => s.id === id),
        1
      )
      await isolate.destroy()
    },
    getMusicUrl: async (musicInfo: AnyListen_API.MusicInfoOnline, type: string) => {
      return isolate.remote.getMusicUrl(toLXMusicInfo(musicInfo), type)
    },
    setEnabledSourceLogout: async (enabled) => {
      await isolate.remote.setEnabledSourceLogout(enabled)
    },
    get sources() {
      return isolate.sources
    },
  })
}

const types: AnyListen_API.Quality[] = ['128k', '192k', '320k', 'wav', 'flac', 'flac24bit', 'dolby', 'master']
const getTargetScriptByQuality = (musicInfo: AnyListen_API.MusicInfoOnline, type: string, excludeIds: string[] = []) => {
  let targetScript = scripts.find((s) => s.sources?.[musicInfo.meta.source]?.includes(type) && !excludeIds.includes(s.id))
  if (targetScript) return [targetScript, type] as const
  const idx = types.indexOf(type as AnyListen_API.Quality) - 1
  if (idx < 0) throw new Error('No script found to handle this request')
  return getTargetScriptByQuality(musicInfo, types[idx], excludeIds)
}
export const getMusicUrl = async (
  musicInfo: AnyListen_API.MusicInfoOnline,
  type: string,
  excludeIds: string[] = []
): Promise<string> => {
  const [targetScript, targetType] = getTargetScriptByQuality(musicInfo, type, excludeIds)
  return targetScript
    .getMusicUrl(musicInfo, targetType)
    .then(async (url) => {
      url = await verifyUrl(url)
      return url
    })
    .catch(async (error) => {
      console.error(
        `[${targetScript.info.name || targetScript.info.fileName} - ${musicInfo.name}(${musicInfo.meta.source}, type: ${targetType})] ${(error as Error).message}`
      )
      return getMusicUrl(musicInfo, type, [...excludeIds, targetScript.id])
    })
}

export const updateEnabledSourceLogout = async (enabled: boolean) => {
  for (const script of scripts) {
    await script.setEnabledSourceLogout(enabled)
  }
}
