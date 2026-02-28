import { useCallback, useEffect, useState } from 'react'

import type {
  AudioGaplessModeDto,
  AudioEngineModeDto,
  AudioOutputDeviceDto,
  AudioReplayGainModeDto,
  ReadAudioEngineStateResponseDto,
} from '../../contracts/backend'
import type { SettingsSection } from './renderSettingsMainSection'

interface UseAudioEngineStateParams {
  settingsOpen: boolean
  activeSection: SettingsSection
}

interface UseAudioEngineStateResult {
  audioEngineLoading: boolean
  audioEngineUpdating: boolean
  audioEngineError: string | null
  audioEngineState: ReadAudioEngineStateResponseDto | null
  mpvBinDirectoryDraft: string
  mpvBinVerifyPending: boolean
  mpvBinVerifyMessage: string | null
  audioOutputDevicesLoading: boolean
  audioOutputDevices: AudioOutputDeviceDto[]
  refreshAudioEngineState: () => void
  refreshAudioOutputDevices: () => void
  setMpvBinDirectoryDraft: (value: string) => void
  pickMpvBinDirectory: () => Promise<void>
  verifyMpvBinDirectory: () => Promise<void>
  setAudioEngineMode: (mode: AudioEngineModeDto) => Promise<void>
  setAudioOutputDevice: (deviceId: string) => Promise<void>
  setAudioExclusive: (enabled: boolean) => Promise<void>
  setAudioGaplessMode: (mode: AudioGaplessModeDto) => Promise<void>
  setAudioReplayGainMode: (mode: AudioReplayGainModeDto) => Promise<void>
}

const AUDIO_ENGINE_MODE_CHANGED_EVENT = 'mpx:audio-engine-mode-changed'

function publishAudioEngineMode(mode: AudioEngineModeDto): void {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(
    new CustomEvent<{ mode: AudioEngineModeDto }>(AUDIO_ENGINE_MODE_CHANGED_EVENT, {
      detail: { mode },
    }),
  )
}

export function useAudioEngineState({
  settingsOpen,
  activeSection,
}: UseAudioEngineStateParams): UseAudioEngineStateResult {
  const [audioEngineLoading, setAudioEngineLoading] = useState(false)
  const [audioEngineUpdating, setAudioEngineUpdating] = useState(false)
  const [audioEngineError, setAudioEngineError] = useState<string | null>(null)
  const [audioEngineState, setAudioEngineState] =
    useState<ReadAudioEngineStateResponseDto | null>(null)
  const [mpvBinDirectoryDraft, setMpvBinDirectoryDraft] = useState('')
  const [mpvBinVerifyPending, setMpvBinVerifyPending] = useState(false)
  const [mpvBinVerifyMessage, setMpvBinVerifyMessage] = useState<string | null>(null)
  const [audioOutputDevicesLoading, setAudioOutputDevicesLoading] = useState(false)
  const [audioOutputDevices, setAudioOutputDevices] = useState<AudioOutputDeviceDto[]>([])
  const [stateRefreshNonce, setStateRefreshNonce] = useState(0)
  const [devicesRefreshNonce, setDevicesRefreshNonce] = useState(0)

  const refreshAudioEngineState = useCallback(() => {
    setStateRefreshNonce((value) => value + 1)
  }, [])

  const refreshAudioOutputDevices = useCallback(() => {
    setDevicesRefreshNonce((value) => value + 1)
  }, [])

  useEffect(() => {
    const mpvBinPath = audioEngineState?.mpv_bin_path?.trim() ?? ''
    if (!mpvBinPath) {
      return
    }

    const normalized = mpvBinPath.replace(/[\\/]+$/, '')
    const separatorIndex = Math.max(
      normalized.lastIndexOf('/'),
      normalized.lastIndexOf('\\'),
    )
    if (separatorIndex <= 0) {
      return
    }

    const directoryPath = normalized.slice(0, separatorIndex)
    setMpvBinDirectoryDraft((previous) =>
      previous.trim().length > 0 ? previous : directoryPath,
    )
  }, [audioEngineState?.mpv_bin_path])

  useEffect(() => {
    if (!settingsOpen || activeSection !== 'system') {
      return
    }

    const backendApi =
      typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (!backendApi || typeof backendApi.readAudioEngineState !== 'function') {
      setAudioEngineLoading(false)
      setAudioEngineError('当前运行环境不支持音频引擎增强模式')
      setAudioEngineState(null)
      return
    }

    let active = true
    setAudioEngineLoading(true)
    setAudioEngineError(null)
    void backendApi
      .readAudioEngineState()
      .then((response) => {
        if (!active) {
          return
        }
        setAudioEngineState(response)
        publishAudioEngineMode(response.mode)
      })
      .catch((error) => {
        if (!active) {
          return
        }
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : '读取音频引擎状态失败'
        setAudioEngineError(message)
      })
      .finally(() => {
        if (!active) {
          return
        }
        setAudioEngineLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeSection, settingsOpen, stateRefreshNonce])

  useEffect(() => {
    if (!settingsOpen || activeSection !== 'system') {
      return
    }

    const backendApi =
      typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (!backendApi || typeof backendApi.listAudioOutputDevices !== 'function') {
      setAudioOutputDevicesLoading(false)
      setAudioOutputDevices([])
      return
    }

    let active = true
    setAudioOutputDevicesLoading(true)
    void backendApi
      .listAudioOutputDevices()
      .then((response) => {
        if (!active) {
          return
        }
        setAudioOutputDevices(response.devices)
      })
      .catch(() => {
        if (!active) {
          return
        }
        setAudioOutputDevices([])
      })
      .finally(() => {
        if (!active) {
          return
        }
        setAudioOutputDevicesLoading(false)
      })

    return () => {
      active = false
    }
  }, [activeSection, settingsOpen, devicesRefreshNonce, stateRefreshNonce])

  const setAudioEngineMode = useCallback(async (mode: AudioEngineModeDto) => {
    const backendApi =
      typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (!backendApi || typeof backendApi.setAudioEngineMode !== 'function') {
      setAudioEngineError('当前运行环境不支持切换音频引擎')
      return
    }

    setAudioEngineUpdating(true)
    setAudioEngineError(null)
    try {
      const response = await backendApi.setAudioEngineMode({ mode })
      setAudioEngineState(response)
      publishAudioEngineMode(response.mode)
      refreshAudioOutputDevices()
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '切换音频引擎失败'
      setAudioEngineError(message)
    } finally {
      setAudioEngineUpdating(false)
    }
  }, [refreshAudioOutputDevices])

  const pickMpvBinDirectory = useCallback(async () => {
    const backendApi =
      typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (!backendApi || typeof backendApi.pickDirectoryPath !== 'function') {
      setMpvBinVerifyMessage('当前运行环境不支持目录选择')
      return
    }

    try {
      const response = await backendApi.pickDirectoryPath({
        title: '选择 MPV 可执行文件目录 (MPX_MPV_BIN)',
        default_path: mpvBinDirectoryDraft.trim() || undefined,
      })
      const pickedPath = response.path?.trim() ?? ''
      if (!response.canceled && pickedPath) {
        setMpvBinDirectoryDraft(pickedPath)
        setMpvBinVerifyMessage(null)
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '选择 MPV 目录失败'
      setMpvBinVerifyMessage(message)
    }
  }, [mpvBinDirectoryDraft])

  const verifyMpvBinDirectory = useCallback(async () => {
    const backendApi =
      typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (!backendApi || typeof backendApi.verifyAudioEngineMpvBin !== 'function') {
      setMpvBinVerifyMessage('当前运行环境不支持 MPX_MPV_BIN 验证')
      return
    }

    const directoryPath = mpvBinDirectoryDraft.trim()
    if (!directoryPath) {
      setMpvBinVerifyMessage('请先选择 MPV 目录')
      return
    }

    setMpvBinVerifyPending(true)
    setMpvBinVerifyMessage(null)
    try {
      const response = await backendApi.verifyAudioEngineMpvBin({
        directory_path: directoryPath,
      })
      setAudioEngineState(response.state)
      publishAudioEngineMode(response.state.mode)
      if (response.ok) {
        setAudioEngineError(null)
      } else if (response.message) {
        setAudioEngineError(response.message)
      }
      setMpvBinVerifyMessage(response.message ?? (response.ok ? '验证成功' : '验证失败'))
      refreshAudioOutputDevices()
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '验证 MPX_MPV_BIN 失败'
      setMpvBinVerifyMessage(message)
    } finally {
      setMpvBinVerifyPending(false)
    }
  }, [mpvBinDirectoryDraft, refreshAudioOutputDevices])

  const setAudioOutputDevice = useCallback(async (deviceId: string) => {
    const backendApi =
      typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (!backendApi || typeof backendApi.setAudioOutputDevice !== 'function') {
      setAudioEngineError('当前运行环境不支持设置输出设备')
      return
    }

    setAudioEngineUpdating(true)
    setAudioEngineError(null)
    try {
      const response = await backendApi.setAudioOutputDevice({
        device_id: deviceId,
      })
      if (!response.ok && response.message) {
        setAudioEngineError(response.message)
      }
      refreshAudioEngineState()
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '设置输出设备失败'
      setAudioEngineError(message)
    } finally {
      setAudioEngineUpdating(false)
    }
  }, [refreshAudioEngineState])

  const setAudioExclusive = useCallback(async (enabled: boolean) => {
    const backendApi =
      typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (!backendApi || typeof backendApi.setAudioExclusive !== 'function') {
      setAudioEngineError('当前运行环境不支持设置独占输出')
      return
    }

    setAudioEngineUpdating(true)
    setAudioEngineError(null)
    try {
      const response = await backendApi.setAudioExclusive({ enabled })
      if (!response.ok && response.message) {
        setAudioEngineError(response.message)
      }
      refreshAudioEngineState()
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '设置独占输出失败'
      setAudioEngineError(message)
    } finally {
      setAudioEngineUpdating(false)
    }
  }, [refreshAudioEngineState])

  const setAudioGaplessMode = useCallback(async (mode: AudioGaplessModeDto) => {
    const backendApi =
      typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (!backendApi || typeof backendApi.setAudioGaplessMode !== 'function') {
      setAudioEngineError('当前运行环境不支持设置 Gapless 模式')
      return
    }

    setAudioEngineUpdating(true)
    setAudioEngineError(null)
    try {
      const response = await backendApi.setAudioGaplessMode({ mode })
      if (!response.ok && response.message) {
        setAudioEngineError(response.message)
      }
      refreshAudioEngineState()
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '设置 Gapless 模式失败'
      setAudioEngineError(message)
    } finally {
      setAudioEngineUpdating(false)
    }
  }, [refreshAudioEngineState])

  const setAudioReplayGainMode = useCallback(async (mode: AudioReplayGainModeDto) => {
    const backendApi =
      typeof window !== 'undefined' ? window.mediaPlayerBackend : undefined
    if (!backendApi || typeof backendApi.setAudioReplayGainMode !== 'function') {
      setAudioEngineError('当前运行环境不支持设置 ReplayGain 模式')
      return
    }

    setAudioEngineUpdating(true)
    setAudioEngineError(null)
    try {
      const response = await backendApi.setAudioReplayGainMode({ mode })
      if (!response.ok && response.message) {
        setAudioEngineError(response.message)
      }
      refreshAudioEngineState()
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : '设置 ReplayGain 模式失败'
      setAudioEngineError(message)
    } finally {
      setAudioEngineUpdating(false)
    }
  }, [refreshAudioEngineState])

  return {
    audioEngineLoading,
    audioEngineUpdating,
    audioEngineError,
    audioEngineState,
    mpvBinDirectoryDraft,
    mpvBinVerifyPending,
    mpvBinVerifyMessage,
    audioOutputDevicesLoading,
    audioOutputDevices,
    refreshAudioEngineState,
    refreshAudioOutputDevices,
    setMpvBinDirectoryDraft,
    pickMpvBinDirectory,
    verifyMpvBinDirectory,
    setAudioEngineMode,
    setAudioOutputDevice,
    setAudioExclusive,
    setAudioGaplessMode,
    setAudioReplayGainMode,
  }
}
