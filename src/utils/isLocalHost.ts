export function isLocalhost(url: string): boolean {
  try {
    const parsedURL = new URL(url);
    return (
      parsedURL.hostname === 'localhost' ||
      parsedURL.hostname === '127.0.0.1' ||
      parsedURL.hostname === '[::1]'
    );
  } catch {
    return false; // Handle invalid URLs
  }
}