import { initCommand } from './command'
import { runScript, scripts, updateEnabledSourceLogout } from './isolate'
import { initOnlineResource } from './onlineResource'
import { app, configuration, console, t } from './shared/hostAPI'
import { checkFiles, getScript } from './shared/lxSourceManage'

void initOnlineResource()

const initScripts = async () => {
  let [config = [], infos = [], enabledSourceLogout = false] = await configuration.getConfigs<
    [string[], LXScriptInfoFull[], boolean]
  >(['enabledScripts', 'importedScriptSources', 'enabledSourceLogout'])

  void checkFiles(infos)

  // const validInfos = infos.filter((info) => files.includes(info.id))
  // if (validInfos.length !== infos.length) {
  //   console.log('Some script infos are invalid, updating...')
  //   void storage.writeFile('scriptInfos.json', JSON.stringify(validInfos))
  // }

  const infoMap = new Map(infos.map((info) => [info.id, info]))
  for (const id of config) {
    const info = infoMap.get(id)
    if (!info) {
      console.error(`No script info found for id ${id}`)
      continue
    }
    try {
      const script = await getScript(info.id)
      await runScript(info.id, info, script, enabledSourceLogout)
    } catch (error) {
      console.error(t('error.loadScriptFailed', { name: info.name || info.id, message: (error as Error).message }))
      void app.showMessage(t('error.loadScriptFailed', { name: info.name || info.id, message: (error as Error).message }), {
        type: 'error',
      })
    }
  }

  configuration.onConfigChanged(async (keys, newConfig) => {
    if (keys.includes('enabledSourceLogout')) {
      enabledSourceLogout = (newConfig.enabledSourceLogout as boolean) || false
      await updateEnabledSourceLogout(enabledSourceLogout)
    }
    if (keys.includes('enabledScripts')) {
      const newEnabledIds = (newConfig.enabledScripts as string[] | null) || []
      const enabledIds: string[] = []
      for (const script of scripts) {
        if (newEnabledIds.includes(script.id)) {
          enabledIds.push(script.id)
          continue
        }
        await script.destroy().catch(() => {})
      }
      const infos = (await configuration.getConfigs<[LXScriptInfoFull[]]>(['importedScriptSources']))[0] ?? []
      for (const id of newEnabledIds) {
        if (enabledIds.includes(id)) continue
        const targetInfo = infos.find((info) => info.id === id)
        if (!targetInfo) {
          console.error(`No script info found for id ${id}`)
          continue
        }
        try {
          const script = await getScript(id)
          await runScript(targetInfo.id, targetInfo, script, enabledSourceLogout)
          // console.log(`Loaded script ${targetInfo.name || targetInfo.id} successfully`)
        } catch (error) {
          console.error(
            t('error.loadScriptFailed', { name: targetInfo.name || targetInfo.id, message: (error as Error).message })
          )
          void app.showMessage(
            t('error.loadScriptFailed', { name: targetInfo.name || targetInfo.id, message: (error as Error).message }),
            {
              type: 'error',
            }
          )
        }
      }
    }
  })
}

initScripts().catch((error) => {
  console.error(t('error.initScriptsFailed', { message: (error as Error).message }))
})

initCommand().catch((error) => {
  console.error(`Failed to initialize commands: ${(error as Error).message}`)
})
