import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";

/**
 * Checks if a given IP address is private, loopback, link-local, or cloud metadata.
 */
export function isBlockedIp(ipString: string): boolean {
  try {
    let addr = ipaddr.parse(ipString);

    // If it's an IPv4-mapped IPv6 address (e.g. ::ffff:127.0.0.1), unmap to IPv4
    if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
      addr = (addr as ipaddr.IPv6).toIPv4Address();
    }

    const range = addr.range();

    // Blocked IP ranges:
    // IPv4:
    // - loopback: 127.0.0.0/8
    // - private: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
    // - linkLocal: 169.254.0.0/16 (includes AWS / Azure / GCP metadata 169.254.169.254)
    // - carrierGradeNat: 100.64.0.0/10
    // - broadcast: 255.255.255.255/32
    // - multicast: 224.0.0.0/4
    // - reserved: 240.0.0.0/4, 0.0.0.0/8
    //
    // IPv6:
    // - loopback: ::1
    // - uniqueLocal: fc00::/7
    // - linkLocal: fe80::/10
    // - multicast: ff00::/8
    // - unspecified: ::

    const blockedRanges = [
      "loopback",
      "private",
      "linkLocal",
      "carrierGradeNat",
      "broadcast",
      "multicast",
      "reserved",
      "uniqueLocal",
      "unspecified",
    ];

    if (blockedRanges.includes(range)) {
      return true;
    }

    // Specific check for AWS / Cloud metadata IP 169.254.169.254
    const normalized = addr.toString();
    if (normalized === "169.254.169.254" || normalized === "0.0.0.0") {
      return true;
    }

    return false;
  } catch {
    // If it fails to parse as valid IP, treat as unsafe
    return true;
  }
}

/**
 * Validates a hostname by resolving DNS and checking all resolved IP addresses.
 * Throws an error if any resolved IP belongs to a blocked range.
 */
export async function validateHostForSSRF(hostname: string): Promise<string[]> {
  // Direct check for 'localhost' and '.local' or internal suffixes
  const lowerHost = hostname.toLowerCase();
  if (
    lowerHost === "localhost" ||
    lowerHost.endsWith(".localhost") ||
    lowerHost.endsWith(".local") ||
    lowerHost.endsWith(".internal") ||
    lowerHost === "127.0.0.1" ||
    lowerHost === "::1"
  ) {
    throw new Error(`SSRF Guard: Access to internal host '${hostname}' is forbidden`);
  }

  // If hostname is already an IP address
  if (ipaddr.isValid(lowerHost)) {
    if (isBlockedIp(lowerHost)) {
      throw new Error(`SSRF Guard: IP address '${lowerHost}' is in a reserved/private range`);
    }
    return [lowerHost];
  }

  // Resolve all DNS records (IPv4 & IPv6)
  let addresses: Array<{ address: string; family: number }> = [];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch (err: any) {
    throw new Error(`SSRF Guard: DNS lookup failed for '${hostname}': ${err.message}`);
  }

  if (!addresses || addresses.length === 0) {
    throw new Error(`SSRF Guard: No DNS records found for '${hostname}'`);
  }

  const resolvedIps: string[] = [];
  for (const record of addresses) {
    if (isBlockedIp(record.address)) {
      throw new Error(`SSRF Guard: Host '${hostname}' resolved to blocked IP ${record.address}`);
    }
    resolvedIps.push(record.address);
  }

  return resolvedIps;
}
