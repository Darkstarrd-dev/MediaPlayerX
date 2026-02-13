import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderStartupSplashMockHtml } from '../electron/startupSplashTemplate.ts'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const outputPath = path.join(projectRoot, 'docs', 'ui', 'startup-splash-mock.html')

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, renderStartupSplashMockHtml({ bannerSrc: '../../src/assets/banner.png' }), 'utf8')

console.log(`startup splash mock written: ${outputPath}`)
