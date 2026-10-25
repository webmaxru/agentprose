import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({ api: { projectId: 'agentprs', dataset: 'production' }, deployment: { autoUpdates: false } })
