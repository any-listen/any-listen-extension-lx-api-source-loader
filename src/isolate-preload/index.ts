import { createMessage2Call } from 'message2call'

import { onmessage, postMessage } from './envAPI'
import { exposeObject } from './exposeObject'
import { setExtensionObject } from './extensionObject'

// globalThis.console = {
//   log: (...args) => ipc.log(...args),
//   error: (...args) => ipc.error(...args),
// }
globalThis.console = {
  log: () => {},
  error: () => {},
}
const msg2call = createMessage2Call<IPCExtensionObject>({
  exposeObj: {
    ...exposeObject,
  },
  sendMessage(data) {
    postMessage(data)
  },
  isSendErrorStack: true,
  timeout: 0,
})

onmessage((data) => {
  msg2call.message(data)
})

setExtensionObject(msg2call.remote)
