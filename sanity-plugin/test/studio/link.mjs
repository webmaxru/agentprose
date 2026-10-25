// The test Studio uses the plugin's own dependencies: make test/studio/node_modules a link to ../../node_modules.
import { existsSync, symlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const link = fileURLToPath(new URL('./node_modules', import.meta.url))
if (!existsSync(link)) symlinkSync('../../node_modules', link, 'dir')
