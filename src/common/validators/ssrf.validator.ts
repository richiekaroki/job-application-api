import { isIP } from 'net';
import { URL } from 'url';

const PRIVATE_RANGES = [
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  { start: '127.0.0.0', end: '127.255.255.255' },
  { start: '169.254.0.0', end: '169.254.255.255' },
  { start: '0.0.0.0', end: '0.255.255.255' },
];

function ipToNumber(ip: string): number {
  return (
    ip
      .split('.')
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

function isInPrivateRange(ip: string): boolean {
  const ipNum = ipToNumber(ip);
  return PRIVATE_RANGES.some(
    (range) =>
      ipNum >= ipToNumber(range.start) && ipNum <= ipToNumber(range.end),
  );
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === '::1' ||
    lower === '::' ||
    lower.startsWith('fc') ||
    lower.startsWith('fd') ||
    lower.startsWith('fe80')
  );
}

export function isUnsafeUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);

    // Block non-HTTP(S)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return true;
    }

    const hostname = parsed.hostname;

    // Block raw IP addresses in private ranges
    const ip = isIP(hostname);
    if (ip !== 0) {
      if (ip === 4) return isInPrivateRange(hostname);
      if (ip === 6) return isPrivateIPv6(hostname);
    }

    // Block localhost variants
    const blockedHostnames = [
      'localhost',
      '0.0.0.0',
      '[::1]',
      '[::]',
      'metadata.google.internal',
      'instance-data',
      '169.254.169.254',
    ];
    if (blockedHostnames.includes(hostname.toLowerCase())) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}
