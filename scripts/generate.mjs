import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { join } from 'node:path';
import { domainToASCII } from 'node:url';

const categories = new Set(['cloudflare', 'github', 'youtube', 'ru-available-only-inside', 'aws', 'aws-cn', 'kakao']);
const [geositePath, cloudflarePath, output = 'lists', ruPath, cloudfrontPath] = process.argv.slice(2);
if (!geositePath || !cloudflarePath) {
  throw new Error('Usage: node scripts/generate.mjs geosite.dat cloudflare.txt [output] [ru.txt] [cloudfront.txt]');
}

// GeoSiteList, GeoSite and Domain are nested protobuf messages.
function* fields(bytes) {
  let offset = 0;
  function varint() {
    let value = 0;
    for (let shift = 0; shift <= 28 && offset < bytes.length; shift += 7) {
      const byte = bytes[offset++];
      value += (byte & 127) * 2 ** shift;
      if (byte < 128 && value <= 0xffffffff) return value;
    }
    throw new Error('Invalid protobuf varint');
  }

  while (offset < bytes.length) {
    const tag = varint();
    const number = tag >>> 3;
    const wire = tag & 7;
    if (!number) throw new Error('Invalid protobuf field number');
    if (wire === 0) {
      yield [number, varint()];
    } else if (wire === 2) {
      const length = varint();
      if (length > bytes.length - offset) throw new Error('Truncated protobuf field');
      yield [number, bytes.subarray(offset, offset + length)];
      offset += length;
    } else {
      throw new Error(`Unexpected protobuf wire type ${wire}`);
    }
  }
}

const lists = new Map();
for (const [field, site] of fields(readFileSync(geositePath))) {
  if (field !== 1) continue;
  const siteFields = fields(site);
  let category;
  const domains = [];
  for (const [number, value] of siteFields) {
    if (number === 1) category = value.toString('utf8').toLowerCase();
    if (number === 2) domains.push(value);
  }
  if (!categories.has(category)) continue;

  const lines = new Set();
  const unsupported = { keyword: 0, regexp: 0 };
  for (const entry of domains) {
    let type = 0;
    let value;
    for (const [number, data] of fields(entry)) {
      if (number === 1) type = data;
      if (number === 2) value = data.toString('utf8');
    }
    if (type === 0 || type === 1) {
      unsupported[type === 0 ? 'keyword' : 'regexp']++;
      continue;
    }
    if (type !== 2 && type !== 3) throw new Error(`Unknown GeoSite rule type ${type}`);
    if (!value || /[\s/:#?@%\\]/u.test(value)) throw new Error(`Invalid domain in ${category}: ${value}`);
    const domain = domainToASCII(value).replace(/\.$/, '').toLowerCase();
    if (domain.length > 253 || !domain.split('.').every(label => /^[a-z0-9_][a-z0-9_-]{0,62}$/.test(label))) {
      throw new Error(`Invalid domain in ${category}: ${value}`);
    }
    lines.add(type === 3 ? `^${domain}` : domain);
  }
  if (unsupported.keyword || unsupported.regexp) {
    console.warn(`${category}: skipped ${unsupported.keyword} keyword and ${unsupported.regexp} regexp rules`);
    if (category === 'ru-available-only-inside') {
      throw new Error('Cannot publish a partial exclusion list');
    }
  }
  if (lists.has(category)) throw new Error(`Duplicate GeoSite category: ${category}`);
  lists.set(category, lines);
}

for (const category of categories) {
  if (!lists.get(category)?.size) throw new Error(`Missing or empty GeoSite category: ${category}`);
}

const aws = lists.get('aws');
for (const domain of lists.get('aws-cn')) aws.add(domain);
lists.delete('aws-cn');

function readCidrs(path, category) {
  const cidrs = new Set(readFileSync(path, 'utf8').split(/\r?\n/).map(line => line.trim()).filter(Boolean));
  if (!cidrs.size) throw new Error(`Empty ${category} GeoIP list`);
  for (const line of cidrs) {
    const match = /^([^/]+)\/(0|[1-9][0-9]{0,2})$/.exec(line);
    const version = match && isIP(match[1]);
    if (!version || Number(match[2]) > (version === 4 ? 32 : 128)) {
      throw new Error(`Invalid ${category} CIDR: ${line}`);
    }
  }
  return cidrs;
}

lists.set('cloudflare-ip', readCidrs(cloudflarePath, 'Cloudflare'));
if (ruPath) lists.set('ru-ip', readCidrs(ruPath, 'RU'));
if (cloudfrontPath) lists.set('cloudfront-ip', readCidrs(cloudfrontPath, 'CloudFront'));

mkdirSync(output, { recursive: true });
for (const [category, lines] of lists) {
  const filename = `${category}.list`;
  writeFileSync(join(output, filename), [...lines].sort().join('\n') + '\n');
  console.log(`${filename}: ${lines.size} entries`);
}
