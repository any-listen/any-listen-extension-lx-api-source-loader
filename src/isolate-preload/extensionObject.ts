let ipc: IPCExtensionObject

export const setExtensionObject = (obj: IPCExtensionObject) => {
  ipc = obj
}

const _ipc = new Proxy(
  {},
  {
    get(target, property) {
      return ipc[property as keyof IPCExtensionObject]
    },
  }
) as IPCExtensionObject

export { _ipc as ipc }
