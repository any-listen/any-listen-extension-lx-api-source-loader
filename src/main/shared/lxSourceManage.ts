import { configuration, crypto, storage, t } from './hostAPI'

const INFO_NAMES = {
  name: 24,
  description: 36,
  author: 56,
  homepage: 1024,
  version: 36,
} as const
type INFO_NAMES_Type = typeof INFO_NAMES
const matchInfo = (scriptInfo: string) => {
  const infoArr = scriptInfo.split(/\r?\n/)
  const rxp = /^\s?\*\s?@(\w+)\s(.+)$/
  const infos: Partial<Record<keyof typeof INFO_NAMES, string>> = {}
  for (const info of infoArr) {
    const result = rxp.exec(info)
    if (!result) continue
    const key = result[1] as keyof typeof INFO_NAMES
    if (INFO_NAMES[key] == null) continue
    infos[key] = result[2].trim()
  }

  for (const [key, len] of Object.entries(INFO_NAMES) as Array<
    { [K in keyof INFO_NAMES_Type]: [K, INFO_NAMES_Type[K]] }[keyof INFO_NAMES_Type]
  >) {
    infos[key] ||= ''
    if (infos[key] == null) infos[key] = ''
    else if (infos[key].length > len) infos[key] = `${infos[key].substring(0, len)}...`
  }

  return infos as Record<keyof typeof INFO_NAMES, string>
}
const parseScriptInfo = (script: string) => {
  const result = /^\/\*[\S|\s]+?\*\//.exec(script)
  if (!result) throw new Error(t('error.parseScriptInfoFailed'))

  const scriptInfo = matchInfo(result[0])
  return scriptInfo
}

const parseScript = async (fileName: string, scriptRaw: string): Promise<LXScriptInfoFull> => {
  const scriptInfo = parseScriptInfo(scriptRaw)
  const md5 = await crypto.md5(scriptRaw.trim())
  scriptInfo.name ||= fileName
  const desc = `${scriptInfo.version ? `${scriptInfo.version.startsWith('v') ? '' : 'v'}${scriptInfo.version}` : ''}${scriptInfo.author ? `@${scriptInfo.author}` : ''}`
  const apiInfo: LXScriptInfoFull = {
    id: md5,
    ...scriptInfo,
    allowShowUpdateAlert: true,
    fileName,
    fileDesc: `${desc ? `[${desc}]` : ''}${scriptInfo.description ? ` ${scriptInfo.description}` : ''}`.trim(),
  }
  return apiInfo
}

const SCRIPTS_DIR = 'scripts'
export const addScript = async (fileName: string, scriptRaw: string) => {
  const apiInfo = await parseScript(fileName, scriptRaw)
  const infos = (await configuration.getConfigs<[LXScriptInfoFull[]]>(['importedScriptSources']))[0] ?? []
  const targetInfo = infos.find((info) => info.id === apiInfo.id)
  if (targetInfo) throw new Error(t('error.duplicateScript', { fileName, name: targetInfo.name }))
  infos.push(apiInfo)
  await storage.writeFile(`${SCRIPTS_DIR}/${apiInfo.id}`, scriptRaw)
  await configuration.setConfigs({ importedScriptSources: infos })
}
export const removeScript = async (id: string) => {
  const infos = (await configuration.getConfigs<[LXScriptInfoFull[]]>(['importedScriptSources']))[0] ?? []
  const index = infos.findIndex((info) => info.id === id)
  if (index === -1) return
  const [removedInfo] = infos.splice(index, 1)
  await storage.removeFile(`${SCRIPTS_DIR}/${removedInfo.id}`).catch(() => {})
  await configuration.setConfigs({ importedScriptSources: infos })
}

export const getScript = async (id: string) => {
  return storage.readFile(`${SCRIPTS_DIR}/${id}`, 'utf-8')
}

export const checkFiles = async (infos: LXScriptInfoFull[]) => {
  const files = await storage.listFiles(SCRIPTS_DIR).catch(() => [] as string[])
  const ids = infos.map((info) => info.id)
  const removedFiles = files.filter((f) => !ids.includes(f))
  for (const file of removedFiles) {
    await storage.removeFile(`${SCRIPTS_DIR}/${file}`).catch(() => {})
  }
}

// export const setAllowShowUpdateAlert = (id: string, enable: boolean) => {
//   const targetApi = userApis?.find((api) => api.id == id)
//   if (!targetApi) return
//   targetApi.allowShowUpdateAlert = enable
//   saveData()
// }
