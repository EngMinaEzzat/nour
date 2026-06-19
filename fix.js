const fs = require('fs');
const filepath = 'artifacts/api-server/src/routes/ai-import.ts';

let content = fs.readFileSync(filepath, 'utf8');

const searchBlock = `function isPrivateIp(ip: string): boolean {
  if (net.isIPv6(ip)) {
    const lowerIp = ip.toLowerCase();

    // Check for IPv4-mapped IPv6 address
    const ipv4MappedMatch = lowerIp.match(/^(?:::|(?:0{1,4}:){5})ffff:(.+)$/);

    if (ipv4MappedMatch) {
      const ipv4Part = ipv4MappedMatch[1];
      if (net.isIPv4(ipv4Part!)) {
        return isPrivateIp(ipv4Part!);
      } else {
        // Handle hex encoded IPv4-mapped IPv6 (e.g., ::ffff:7f00:1)
        const hexParts = ipv4Part!.split(':');
        if (hexParts.length <= 2) {
          let hexString = '';
          for (let i = 0; i < hexParts.length; i++) {
            hexString += hexParts[i]!.padStart(4, '0');
          }
          if (hexString.length <= 8) {
            hexString = hexString.padStart(8, '0');
            const p1 = parseInt(hexString.substring(0, 2), 16);
            const p2 = parseInt(hexString.substring(2, 4), 16);
            const p3 = parseInt(hexString.substring(4, 6), 16);
            const p4 = parseInt(hexString.substring(6, 8), 16);
            if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3) && !isNaN(p4)) {
              return isPrivateIp(\`\${p1}.\${p2}.\${p3}.\${p4}\`);
            }
          }
        }
        // If it's a IPv4 mapped address but not a valid standard/hex IPv4, it's malformed/unsafe.
        return true;
      }
    }

    return (
      lowerIp === "::1" ||
      lowerIp === "::" ||
      lowerIp === "0:0:0:0:0:0:0:1" ||
      lowerIp.startsWith("fc") ||
      lowerIp.startsWith("fd") ||
      lowerIp.startsWith("fe8") ||
      lowerIp.startsWith("0000:0000:0000:0000:0000:0000:0000:0001")
    );
  }`;

const replaceBlock = `function isPrivateIp(ip: string): boolean {
  if (net.isIPv6(ip)) {
    // Normalize the IPv6 address by expanding compressed segments
    let expandedIp = ip.toLowerCase();

    // Check if it's an IPv4-mapped IPv6 address directly from Node.js parsing (if node parsed it)
    // To handle all valid mappings, we expand :: to 0 blocks.
    if (expandedIp.includes("::")) {
      const parts = expandedIp.split("::");
      const left = parts[0] === "" ? [] : parts[0]!.split(":");
      const right = parts[1] === "" ? [] : parts[1]!.split(":");
      // We need to insert enough "0"s so that we have 8 parts in total
      // Exception: if the last part is an IPv4 string, it counts as 2 parts.
      let numParts = left.length + right.length;
      if (right.length > 0 && right[right.length - 1]!.includes(".")) {
        numParts += 1;
      }
      const missing = 8 - numParts;
      const zeros = Array(missing).fill("0");
      expandedIp = [...left, ...zeros, ...right].join(":");
    }

    // Now the IP is fully expanded like 0:0:0:0:0:ffff:127.0.0.1 or 0:0:0:0:0:ffff:7f00:1
    const ipv4MappedMatch = expandedIp.match(/^(?:0{1,4}:){5}ffff:(.+)$/);

    if (ipv4MappedMatch) {
      const ipv4Part = ipv4MappedMatch[1];
      if (net.isIPv4(ipv4Part!)) {
        return isPrivateIp(ipv4Part!);
      } else {
        // Handle hex encoded IPv4-mapped IPv6 (e.g., ::ffff:7f00:1)
        const hexParts = ipv4Part!.split(':');
        if (hexParts.length <= 2) {
          let hexString = '';
          for (let i = 0; i < hexParts.length; i++) {
            hexString += hexParts[i]!.padStart(4, '0');
          }
          if (hexString.length <= 8) {
            hexString = hexString.padStart(8, '0');
            const p1 = parseInt(hexString.substring(0, 2), 16);
            const p2 = parseInt(hexString.substring(2, 4), 16);
            const p3 = parseInt(hexString.substring(4, 6), 16);
            const p4 = parseInt(hexString.substring(6, 8), 16);
            if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3) && !isNaN(p4)) {
              return isPrivateIp(\`\${p1}.\${p2}.\${p3}.\${p4}\`);
            }
          }
        }
        // If it's a IPv4 mapped address but not a valid standard/hex IPv4, it's malformed/unsafe.
        return true;
      }
    }

    const lowerIp = ip.toLowerCase();
    return (
      lowerIp === "::1" ||
      lowerIp === "::" ||
      lowerIp === "0:0:0:0:0:0:0:1" ||
      lowerIp.startsWith("fc") ||
      lowerIp.startsWith("fd") ||
      lowerIp.startsWith("fe8") ||
      lowerIp.startsWith("0000:0000:0000:0000:0000:0000:0000:0001")
    );
  }`;

content = content.replace(searchBlock, replaceBlock);
fs.writeFileSync(filepath, content);
console.log('Modified');
