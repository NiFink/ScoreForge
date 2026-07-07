const STORAGE_KEY = "scoreforge:clientId";

export function getClientId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  let clientId = window.localStorage.getItem(STORAGE_KEY);

  if (!clientId) {
    clientId = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, clientId);
  }

  return clientId;
}
