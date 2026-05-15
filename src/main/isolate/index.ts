import { createMessage2Call } from 'message2call'

import { EXTENSION } from '../shared/constants'
import { app, console, createIsolateContext, t } from '../shared/hostAPI'
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
          void app.showMessage(t('isolate.loadScriptSuccess', { name: scriptInfo.name || scriptInfo.fileName }))
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
  oInfo.types = minfo.meta.qualitys

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
  sources: Record<string, string[]> | null
  info: LXScriptInfoFull
}> = []

export const runScript = async (id: string, scriptInfo: LXScriptInfoFull, script: string) => {
  const isolate = await createIsolate(scriptInfo)
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
    get sources() {
      return isolate.sources
    },
  })
}

export const getMusicUrl = async (
  musicInfo: AnyListen_API.MusicInfoOnline,
  type: string,
  excludeIds: string[] = []
): Promise<string> => {
  const targetScript = scripts.find((s) => s.sources?.[musicInfo.meta.source]?.includes(type) && !excludeIds.includes(s.id))
  if (!targetScript) throw new Error('No script found to handle this request')
  return targetScript.getMusicUrl(musicInfo, type).catch(async (error) => {
    console.error(
      `[${targetScript.info.name || targetScript.info.fileName} - ${musicInfo.name}(${musicInfo.meta.source}, type: ${type})] ${(error as Error).message}`
    )
    return getMusicUrl(musicInfo, type, [...excludeIds, targetScript.id])
  })
}
