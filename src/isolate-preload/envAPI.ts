const onmessage = globalThis.onmessage!
const postMessage = globalThis.postMessage!
delete globalThis.onmessage
delete globalThis.postMessage

export { onmessage, postMessage }
