import Constants from "expo-constants";
import { Platform } from "react-native";

const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

const parseHost = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const sanitized = value.replace(/^https?:\/\//, "").trim();
  if (!sanitized) {
    return null;
  }

  const host = sanitized.split(":")[0]?.trim();
  if (!host) {
    return null;
  }

  return host;
};

const isLocalhost = (host: string): boolean =>
  host === "localhost" || host === "127.0.0.1";

const isPrivateIpHost = (host: string): boolean => {
  if (host === "10.0.2.2") {
    return true;
  }

  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return false;
  }

  const [first, second] = parts;
  if (first === 10) {
    return true;
  }
  if (first === 192 && second === 168) {
    return true;
  }
  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  return false;
};

const isLanHost = (host: string): boolean =>
  isPrivateIpHost(host) || host.endsWith(".local");

const resolveExpoHost = (): string | null => {
  const expoConfigHost = parseHost(
    (Constants.expoConfig as { hostUri?: string })?.hostUri
  );
  if (expoConfigHost && isLanHost(expoConfigHost)) {
    return expoConfigHost;
  }

  const manifestHost = parseHost(
    (Constants as unknown as {
      manifest?: { debuggerHost?: string; hostUri?: string };
    }).manifest?.debuggerHost
  );
  if (manifestHost && isLanHost(manifestHost)) {
    return manifestHost;
  }

  const fallbackManifestHost = parseHost(
    (Constants as unknown as {
      manifest?: { debuggerHost?: string; hostUri?: string };
    }).manifest?.hostUri
  );
  if (fallbackManifestHost && isLanHost(fallbackManifestHost)) {
    return fallbackManifestHost;
  }

  return null;
};

const resolveEnvBaseUrl = (): string | null => {
  if (!envBaseUrl) {
    return null;
  }

  if (Platform.OS === "web") {
    return envBaseUrl;
  }

  const host = parseHost(envBaseUrl);
  if (!host) {
    return null;
  }

  if (isLocalhost(host)) {
    const expoHost = resolveExpoHost();
    if (!expoHost) {
      return null;
    }

    try {
      const url = new URL(envBaseUrl);
      url.hostname = expoHost;
      return url.toString();
    } catch {
      return null;
    }
  }

  return envBaseUrl;
};

const resolveDefaultBaseUrl = (): string => {
  if (Platform.OS === "web") {
    return "http://127.0.0.1:5000/api";
  }

  const expoHost = resolveExpoHost();
  if (expoHost) {
    return `http://${expoHost}:5000/api`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api";
  }

  return "http://127.0.0.1:5000/api";
};

export const API_BASE_URL =
  resolveEnvBaseUrl() ?? resolveDefaultBaseUrl();
