import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

function parseArgs(argv) {
  const args = new Map()
  const positional = []
  for (let i = 2; i < argv.length; i += 1) {
    const item = argv[i]
    if (!item.startsWith('--')) {
      positional.push(item)
      continue
    }
    if (!item.startsWith('--')) {
      continue
    }
    const key = item.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args.set(key, 'true')
      continue
    }
    args.set(key, next)
    i += 1
  }
  return { args, positional }
}

function requireArg(args, key, positional, positionalIndex) {
  const value = args.get(key)
  if (value && value !== 'true') {
    return value
  }
  const positionalValue = positional[positionalIndex]
  if (positionalValue && positionalValue.trim()) {
    return positionalValue
  }
  throw new Error(`missing_required_arg:${key}`)
}

function runProcess(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })

    let stderr = ''
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('error', (error) => reject(error))
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`process_failed:${command}:${code ?? -1}:${stderr.trim()}`))
    })
  })
}

async function main() {
  const { args, positional } = parseArgs(process.argv)
  const inputPath = path.resolve(requireArg(args, 'input', positional, 0))
  const modelPath = path.resolve(requireArg(args, 'model', positional, 1))
  const tokensPath = path.resolve(requireArg(args, 'tokens', positional, 2))
  const ffmpegBin = args.get('ffmpeg')?.trim() || 'ffmpeg'
  const provider = args.get('provider')?.trim() || 'cpu'
  const language = args.get('language')?.trim() || 'auto'
  const threadsValue = args.get('threads') ?? positional[3] ?? '2'
  const threads = Math.max(1, Number.parseInt(threadsValue, 10) || 2)
  const positionalProvider = positional[4]?.trim()
  const positionalFfmpeg = positional[5]?.trim()
  const effectiveProvider = positionalProvider || provider
  const effectiveFfmpeg = positionalFfmpeg || ffmpegBin

  const tempWavePath = path.join(os.tmpdir(), `mediaplayerx-subtitle-bench-${randomUUID()}.wav`)
  try {
    await runProcess(effectiveFfmpeg, [
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-ac',
      '1',
      '-ar',
      '16000',
      '-f',
      'wav',
      tempWavePath,
    ])

    const require = createRequire(import.meta.url)
    const sherpa = require('sherpa-onnx-node')
    const recognizer = new sherpa.OfflineRecognizer({
      featConfig: {
        sampleRate: 16_000,
        featureDim: 80,
      },
      modelConfig: {
        senseVoice: {
          model: modelPath,
          language,
          useInverseTextNormalization: language === 'zh' || language === 'yue' ? 1 : 0,
        },
        tokens: tokensPath,
        provider: effectiveProvider,
        numThreads: threads,
        debug: 0,
      },
    })

    const wave = sherpa.readWave(tempWavePath)
    const stream = recognizer.createStream()

    const start = Date.now()
    stream.acceptWaveform({ sampleRate: wave.sampleRate, samples: wave.samples })
    recognizer.decode(stream)
    const result = recognizer.getResult(stream)
    const elapsedSec = (Date.now() - start) / 1000
    const durationSec = wave.samples.length / wave.sampleRate
    const rtf = durationSec > 0 ? elapsedSec / durationSec : Number.NaN

    const text = typeof result?.text === 'string' ? result.text.trim() : ''
    const timestamps = Array.isArray(result?.timestamps) ? result.timestamps.length : 0
    const durations = Array.isArray(result?.durations) ? result.durations.length : 0
    const tokens = Array.isArray(result?.tokens) ? result.tokens.length : 0

    console.log(`input=${inputPath}`)
    console.log(`duration_sec=${durationSec.toFixed(3)}`)
    console.log(`elapsed_sec=${elapsedSec.toFixed(3)}`)
    console.log(`rtf=${Number.isFinite(rtf) ? rtf.toFixed(3) : 'NaN'}`)
    console.log(`tokens=${tokens} timestamps=${timestamps} durations=${durations}`)
    console.log(`provider=${effectiveProvider}`)
    console.log(`ffmpeg=${effectiveFfmpeg}`)
    console.log(`text_preview=${text.slice(0, 200)}`)
  } finally {
    await fs.rm(tempWavePath, { force: true }).catch(() => undefined)
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exitCode = 1
})
