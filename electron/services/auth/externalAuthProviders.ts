export const EXTERNAL_AUTH_PROVIDER_IDS = ["ehentai"] as const;

export type ExternalAuthProviderId =
  (typeof EXTERNAL_AUTH_PROVIDER_IDS)[number];

export interface ExternalAuthProviderDefinition {
  id: ExternalAuthProviderId;
  partition: string;
  loginUrl: string;
  probeUrl: string;
  allowedHosts: string[];
  requiredCookieNames: string[];
  clearOrigins: string[];
}

const EXTERNAL_AUTH_PROVIDERS: Record<
  ExternalAuthProviderId,
  ExternalAuthProviderDefinition
> = {
  ehentai: {
    id: "ehentai",
    partition: "persist:ext-auth:ehentai",
    loginUrl: "https://forums.e-hentai.org/index.php?act=Login&CODE=00",
    probeUrl: "https://e-hentai.org/",
    allowedHosts: [
      "e-hentai.org",
      "forums.e-hentai.org",
      "api.e-hentai.org",
      "exhentai.org",
    ],
    requiredCookieNames: ["ipb_member_id", "ipb_pass_hash"],
    clearOrigins: [
      "https://e-hentai.org",
      "https://forums.e-hentai.org",
      "https://api.e-hentai.org",
      "https://exhentai.org",
    ],
  },
};

export function resolveExternalAuthProvider(
  providerId: ExternalAuthProviderId,
): ExternalAuthProviderDefinition {
  return EXTERNAL_AUTH_PROVIDERS[providerId];
}
