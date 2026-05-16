import { ipc } from './extensionObject'

let enabledSourceLogout = false
let scriptInfo: Omit<LXScriptInfo, 'id'> | null = null

export const setEnabledSourceLogout = (enabled: boolean) => {
  enabledSourceLogout = enabled
}
export const setScriptInfo = (info: Omit<LXScriptInfo, 'id'> | null) => {
  scriptInfo = info
}

export const createConsole = () => {
  const buildPrefix = () => {
    return `[${scriptInfo?.name || 'unknown'}]`
  }
  return {
    log: (...args: unknown[]) => {
      if (enabledSourceLogout) {
        void ipc.log(buildPrefix(), ...args)
      }
    },
    error: (...args: unknown[]) => {
      if (enabledSourceLogout) {
        void ipc.error(buildPrefix(), ...args)
      }
    },
    warn: (...args: unknown[]) => {
      if (enabledSourceLogout) {
        void ipc.warn(buildPrefix(), ...args)
      }
    },
    debug: (...args: unknown[]) => {
      if (enabledSourceLogout) {
        void ipc.debug(buildPrefix(), ...args)
      }
    },
    group: (...args: unknown[]) => {
      if (enabledSourceLogout) {
        void ipc.log(buildPrefix(), ...args)
      }
    },
    groupEnd: (...args: unknown[]) => {
      if (enabledSourceLogout) {
        void ipc.log(buildPrefix(), ...args)
      }
    },
    info: (...args: unknown[]) => {
      if (enabledSourceLogout) {
        void ipc.log(buildPrefix(), ...args)
      }
    },
    time: (...args: unknown[]) => {
      if (enabledSourceLogout) {
        void ipc.log(buildPrefix(), ...args)
      }
    },
    timeEnd: (...args: unknown[]) => {
      if (enabledSourceLogout) {
        void ipc.log(buildPrefix(), ...args)
      }
    },
    clear: (...args: unknown[]) => {
      if (enabledSourceLogout) {
        void ipc.log(buildPrefix(), ...args)
      }
    },
    groupCollapsed: (...args: unknown[]) => {
      if (enabledSourceLogout) {
        void ipc.log(buildPrefix(), ...args)
      }
    },
    trace: (...args: unknown[]) => {
      if (enabledSourceLogout) {
        void ipc.log(buildPrefix(), ...args)
      }
    },
  }
}
