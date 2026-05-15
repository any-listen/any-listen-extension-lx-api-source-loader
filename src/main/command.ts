import { command, console, app, t, request, configuration } from './shared/hostAPI'
import { addScript, getScript } from './shared/lxSourceManage'

const addLocalSource = async () => {
  await app
    .showOpenDialog({
      title: t('command.addLocalSourceDialogTitle'),
      canSelectFiles: true,
      canSelectMany: true,
      filters: {
        JavaScript: ['js'],
      },
    })
    .then(async (result) => {
      if (!result.length) return
      // console.log('Selected files to add as local sources: ', result)
      for (const path of result) {
        const content = await app.readOpenDialogFile(path, 'utf-8')
        // console.log('Content of file ', path, ': ', content)
        const fileName = path.split(/[/\\]/).pop() ?? path
        await addScript(fileName, content).catch((error) => {
          console.error(t('error.addLocalSourceFailed', { name: fileName, message: (error as Error).message }))
          void app.showMessage(t('error.addLocalSourceFailed', { name: fileName, message: (error as Error).message }), {
            type: 'error',
          })
        })
      }
    })
}

const addRemoteSource = async () => {
  await app
    .showInputDialog({
      title: t('command.addRemoteSourceDialogTitle'),
      placeholder: t('command.addRemoteSourceDialogPlaceholder'),
    })
    .then(async (result) => {
      if (!result || !/^https?:\/\//.test(result)) {
        void app.showMessage(t('error.invalidRemoteSource'), { type: 'error' })
        return
      }
      try {
        // console.log('Entered URL to add as remote source: ' + JSON.stringify(result))
        const data = await request<string>(result)
        if (typeof data.body !== 'string') {
          // console.error('Failed to fetch remote source, response is not a string: ', data)
          void app.showMessage(t('error.invalidRemoteSource'), { type: 'error' })
        }
        const urlParts = result.split('/')
        let fileName = urlParts[urlParts.length - 1] || 'remote_source.js'
        if (!fileName.endsWith('.js')) {
          fileName += '.js'
        }
        await addScript(fileName, data.body)
      } catch (error) {
        console.error(t('error.addRemoteSourceFailed', { message: (error as Error).message }))
        void app.showMessage(t('error.addRemoteSourceFailed', { message: (error as Error).message }), {
          type: 'error',
        })
      }
    })
}

const fileNameRxp = /[\\/:*?#"<>|]/g
const filterFileName = (name: string): string => name.replace(fileNameRxp, '')
const exportSources = async () => {
  const [infos = []] = await configuration.getConfigs<[LXScriptInfoFull[]]>(['importedScriptSources'])
  if (!infos.length) {
    void app.showMessage(t('command.exportSourcesNoSources'), { type: 'info' })
    return
  }
  const savePath = await app.showSaveDialog({
    title: t('command.exportSourcesDialogTitle'),
    saveLabel: t('command.exportSourcesDialogSaveLabel'),
  })
  if (!savePath) return
  for (const info of infos) {
    const script = await getScript(info.id)
    let name = filterFileName(info.name || '').trim()
    name = name ? `${name}.js` : info.fileName
    await app.writeSaveDialogFile(savePath, name, script).catch((error) => {
      console.error(t('error.exportSourcesFailed', { name: info.name || info.fileName, message: (error as Error).message }))
      void app.showMessage(
        t('error.exportSourcesFailed', { name: info.name || info.fileName, message: (error as Error).message }),
        {
          type: 'error',
        }
      )
    })
  }
}

export const initCommand = async () => {
  await Promise.all([
    command.registerCommand('addLocalSource', addLocalSource),
    command.registerCommand('addRemoteSource', addRemoteSource),
    command.registerCommand('exportSources', exportSources),
  ])
}
