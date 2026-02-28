import {
  BrowserWindow,
  session,
  shell,
  type Session,
} from "electron";

import {
  resolveExternalAuthProvider,
  type ExternalAuthProviderDefinition,
  type ExternalAuthProviderId,
} from "./externalAuthProviders";

const EXTERNAL_AUTH_CLEAR_STORAGES = [
  "cookies",
  "localstorage",
  "indexdb",
  "cachestorage",
  "serviceworkers",
  "websql",
  "filesystem",
];

type ExternalAuthState = "connected" | "disconnected" | "error";

export interface ExternalAuthStatusResult {
  provider: ExternalAuthProviderId;
  state: ExternalAuthState;
  connected: boolean;
  message: string | null;
  checked_at_ms: number;
}

export interface ExternalAuthConnectResult {
  provider: ExternalAuthProviderId;
  opened: boolean;
  connected: boolean;
  message: string | null;
  checked_at_ms: number;
}

export interface ExternalAuthDisconnectResult {
  provider: ExternalAuthProviderId;
  disconnected: boolean;
  message: string | null;
  checked_at_ms: number;
}

export class ExternalAuthSessionManager {
  private readonly loginWindowByProvider = new Map<
    ExternalAuthProviderId,
    BrowserWindow
  >();

  private readonly configuredPartitions = new Set<string>();

  getProviderSession(providerId: ExternalAuthProviderId): Session {
    return this.resolveSession(providerId);
  }

  async getStatus(
    providerId: ExternalAuthProviderId,
  ): Promise<ExternalAuthStatusResult> {
    const provider = resolveExternalAuthProvider(providerId);
    const ses = this.resolveSession(providerId);

    try {
      const connected = await this.checkConnected(provider, ses);
      return {
        provider: provider.id,
        state: connected ? "connected" : "disconnected",
        connected,
        message: null,
        checked_at_ms: Date.now(),
      };
    } catch (error) {
      return {
        provider: provider.id,
        state: "error",
        connected: false,
        message: error instanceof Error ? error.message : "status_check_failed",
        checked_at_ms: Date.now(),
      };
    }
  }

  async connect(
    providerId: ExternalAuthProviderId,
  ): Promise<ExternalAuthConnectResult> {
    const provider = resolveExternalAuthProvider(providerId);
    const existingWindow = this.loginWindowByProvider.get(providerId);
    if (existingWindow && !existingWindow.isDestroyed()) {
      existingWindow.focus();
      const status = await this.getStatus(providerId);
      return {
        provider: provider.id,
        opened: true,
        connected: status.connected,
        message: status.message,
        checked_at_ms: status.checked_at_ms,
      };
    }

    const loginWindow = new BrowserWindow({
      width: 1100,
      height: 800,
      title: "Connect Account",
      webPreferences: {
        partition: provider.partition,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    this.loginWindowByProvider.set(providerId, loginWindow);

    loginWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (isAllowedNavigation(provider, url)) {
        return { action: "allow" };
      }
      void shell.openExternal(url);
      return { action: "deny" };
    });

    loginWindow.webContents.on("will-navigate", (event, url) => {
      if (isAllowedNavigation(provider, url)) {
        return;
      }
      event.preventDefault();
      void shell.openExternal(url);
    });

    loginWindow.on("closed", () => {
      const current = this.loginWindowByProvider.get(providerId);
      if (current === loginWindow) {
        this.loginWindowByProvider.delete(providerId);
      }
    });

    await loginWindow.loadURL(provider.loginUrl);
    const status = await this.getStatus(providerId);
    return {
      provider: provider.id,
      opened: true,
      connected: status.connected,
      message: status.message,
      checked_at_ms: status.checked_at_ms,
    };
  }

  async disconnect(
    providerId: ExternalAuthProviderId,
  ): Promise<ExternalAuthDisconnectResult> {
    const provider = resolveExternalAuthProvider(providerId);
    const ses = this.resolveSession(providerId);
    const loginWindow = this.loginWindowByProvider.get(providerId);
    if (loginWindow && !loginWindow.isDestroyed()) {
      loginWindow.close();
    }
    this.loginWindowByProvider.delete(providerId);

    for (const origin of provider.clearOrigins) {
      await ses.clearStorageData({
        origin,
        storages: EXTERNAL_AUTH_CLEAR_STORAGES,
      });
    }
    await ses.flushStorageData();

    const status = await this.getStatus(providerId);
    return {
      provider: provider.id,
      disconnected: !status.connected,
      message: status.message,
      checked_at_ms: status.checked_at_ms,
    };
  }

  private resolveSession(providerId: ExternalAuthProviderId): Session {
    const provider = resolveExternalAuthProvider(providerId);
    const ses = session.fromPartition(provider.partition);
    if (!this.configuredPartitions.has(provider.partition)) {
      ses.setPermissionRequestHandler((_webContents, _permission, callback) => {
        callback(false);
      });
      this.configuredPartitions.add(provider.partition);
    }
    return ses;
  }

  private async checkConnected(
    provider: ExternalAuthProviderDefinition,
    ses: Session,
  ): Promise<boolean> {
    const cookies = await ses.cookies.get({ url: provider.probeUrl });
    const cookieSet = new Set(
      cookies
        .map((cookie) => cookie.name.trim().toLowerCase())
        .filter((name) => name.length > 0),
    );
    return provider.requiredCookieNames.every((cookieName) =>
      cookieSet.has(cookieName.trim().toLowerCase()),
    );
  }
}

function isAllowedNavigation(
  provider: ExternalAuthProviderDefinition,
  rawUrl: string,
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }

  const normalizedHost = parsed.hostname.trim().toLowerCase();
  if (!normalizedHost) {
    return false;
  }

  return provider.allowedHosts.some((allowedHost) => {
    const normalizedAllowed = allowedHost.trim().toLowerCase();
    return (
      normalizedHost === normalizedAllowed ||
      normalizedHost.endsWith(`.${normalizedAllowed}`)
    );
  });
}
