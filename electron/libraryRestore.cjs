const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pulseLibraryRestore', {
  load: () => ipcRenderer.invoke('pulse:load-library-backup'),
});
