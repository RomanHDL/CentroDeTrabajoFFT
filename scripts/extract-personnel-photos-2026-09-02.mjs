// Extracts ~115 employee headshot photos embedded as Excel 365 "image in cell"
// (rich-value) objects in `LAYOUT FFT (1).xlsx`, sheet "BASE " (column FOTO / C),
// and saves them as public/personnel-photos/base-N.jpg.
//
// Why not SheetJS: rich-value embedded images are NOT plain cell values or
// legacy floating drawings, so `xlsx` (SheetJS) returns null for those cells.
// Why no new npm dependency: an .xlsx file is a standard ZIP. `tar` on this
// Windows box is GNU tar 1.35, which (verified) cannot read zip archives
// ("This does not look like a tar archive"), so this script parses the ZIP
// central directory by hand and inflates entries with Node's built-in zlib
// (`zlib.inflateRawSync`, since ZIP DEFLATE entries have no zlib/gzip header).
//
// Resolution chain per data row N (see task spec for full rationale):
//   sheet2.xml  C{N+1} vm="X"
//     -> metadata.xml <valueMetadata> bk[X-1].v = V          (1-based index)
//     -> metadata.xml <futureMetadata name="XLRICHVALUE"> bk[V].rvb.i = I  (0-based)
//     -> rdrichvalue.xml rv[I] first <v> text = K            (0-based)
//     -> richValueRel.xml rel[K].r:id = rIdX                 (0-based)
//     -> richValueRel.xml.rels Relationship[Id=rIdX].Target = ../media/imageNN.jpeg

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import path from 'node:path';

const XLSX_PATH = 'C:\\Users\\roman\\Downloads\\LAYOUT FFT (1).xlsx';
const SNAPSHOT_PATH = path.resolve(
  'src/data/production/realPersonnelSnapshot.js'
);
const OUT_DIR = path.resolve('public/personnel-photos');
const MAX_N = 116; // see report: original numbering went up to base-116

// ---------------------------------------------------------------------------
// Minimal ZIP reader (central directory + local headers), zero dependencies.
// ---------------------------------------------------------------------------

function readZipEntries(buf) {
  // Find End Of Central Directory record (search from the end; comment can be
  // up to 65535 bytes so scan the last 65557 bytes).
  const EOCD_SIG = 0x06054b50;
  const searchStart = Math.max(0, buf.length - (22 + 65535));
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= searchStart; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error('EOCD record not found - not a valid zip?');

  const cdEntryCount = buf.readUInt16LE(eocdOffset + 10);
  const cdSize = buf.readUInt32LE(eocdOffset + 12);
  const cdOffset = buf.readUInt32LE(eocdOffset + 16);

  const entries = new Map(); // name -> { compressionMethod, compressedSize, localHeaderOffset }
  let p = cdOffset;
  const CD_SIG = 0x02014b50;
  for (let i = 0; i < cdEntryCount; i++) {
    if (buf.readUInt32LE(p) !== CD_SIG) {
      throw new Error(`Bad central directory entry signature at offset ${p}`);
    }
    const compressionMethod = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localHeaderOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    entries.set(name, { compressionMethod, compressedSize, localHeaderOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  if (p - cdOffset > cdSize + 4) {
    // sanity check only; not fatal
  }
  return entries;
}

function readZipEntryData(buf, entry) {
  const LFH_SIG = 0x04034b50;
  const off = entry.localHeaderOffset;
  if (buf.readUInt32LE(off) !== LFH_SIG) {
    throw new Error(`Bad local file header signature at offset ${off}`);
  }
  const nameLen = buf.readUInt16LE(off + 26);
  const extraLen = buf.readUInt16LE(off + 28);
  const dataStart = off + 30 + nameLen + extraLen;
  const compressed = buf.subarray(dataStart, dataStart + entry.compressedSize);
  if (entry.compressionMethod === 0) return Buffer.from(compressed); // stored
  if (entry.compressionMethod === 8) return inflateRawSync(compressed); // deflate
  throw new Error(`Unsupported compression method ${entry.compressionMethod}`);
}

function readZipFile(buf, entries, name) {
  const entry = entries.get(name);
  if (!entry) throw new Error(`Zip entry not found: ${name}`);
  return readZipEntryData(buf, entry);
}

// ---------------------------------------------------------------------------
// XML helpers (lightweight regex parsing - the structures involved are
// simple, machine-generated, single-line-ish XML, so full DOM parsing is
// unnecessary).
// ---------------------------------------------------------------------------

function matchAll(regex, str) {
  const out = [];
  let m;
  const re = new RegExp(regex, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  while ((m = re.exec(str)) !== null) out.push(m);
  return out;
}

function extractBlock(xml, openTagRegex, closeTag) {
  const openMatch = xml.match(openTagRegex);
  if (!openMatch) return null;
  const start = openMatch.index + openMatch[0].length;
  const end = xml.indexOf(closeTag, start);
  if (end === -1) return null;
  return xml.slice(start, end);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log(`Reading xlsx: ${XLSX_PATH}`);
  const xlsxBuf = readFileSync(XLSX_PATH);
  const entries = readZipEntries(xlsxBuf);
  console.log(`Zip entries found: ${entries.size}`);

  const sheet2Xml = readZipFile(xlsxBuf, entries, 'xl/worksheets/sheet2.xml').toString('utf8');
  const metadataXml = readZipFile(xlsxBuf, entries, 'xl/metadata.xml').toString('utf8');
  const rdrichvalueXml = readZipFile(xlsxBuf, entries, 'xl/richData/rdrichvalue.xml').toString('utf8');
  const richValueRelXml = readZipFile(xlsxBuf, entries, 'xl/richData/richValueRel.xml').toString('utf8');
  const richValueRelRelsXml = readZipFile(
    xlsxBuf,
    entries,
    'xl/richData/_rels/richValueRel.xml.rels'
  ).toString('utf8');

  // --- Step 1: sheet2.xml -> map of row number (C column) -> vm ---
  const cCellVm = new Map(); // rowNum -> vm (number)
  for (const m of matchAll(/<c r="C(\d+)"([^>]*)>/g, sheet2Xml)) {
    const rowNum = Number(m[1]);
    const attrs = m[2];
    const vmMatch = attrs.match(/\bvm="(\d+)"/);
    if (vmMatch) cCellVm.set(rowNum, Number(vmMatch[1]));
  }
  console.log(`Rows with a FOTO vm reference: ${cCellVm.size}`);

  // --- Step 2: metadata.xml <valueMetadata> bk list (1-based index by vm) ---
  const valueMetadataBlock = extractBlock(
    metadataXml,
    /<valueMetadata[^>]*>/,
    '</valueMetadata>'
  );
  if (!valueMetadataBlock) throw new Error('valueMetadata block not found in metadata.xml');
  const valueMetadataV = []; // index 0 == vm 1
  for (const m of matchAll(/<bk>(.*?)<\/bk>/gs, valueMetadataBlock)) {
    const vMatch = m[1].match(/\bv="(\d+)"/);
    valueMetadataV.push(vMatch ? Number(vMatch[1]) : null);
  }
  console.log(`valueMetadata bk entries: ${valueMetadataV.length}`);

  // --- Step 3: metadata.xml <futureMetadata name="XLRICHVALUE"> bk list (0-based index by V) ---
  const futureMetadataBlock = extractBlock(
    metadataXml,
    /<futureMetadata\s+name="XLRICHVALUE"[^>]*>/,
    '</futureMetadata>'
  );
  if (!futureMetadataBlock) throw new Error('futureMetadata XLRICHVALUE block not found');
  const futureMetadataI = []; // index 0 == V 0
  for (const m of matchAll(/<bk>(.*?)<\/bk>/gs, futureMetadataBlock)) {
    const iMatch = m[1].match(/(?:\w+:)?rvb[^>]*\bi="(\d+)"/);
    futureMetadataI.push(iMatch ? Number(iMatch[1]) : null);
  }
  console.log(`futureMetadata(XLRICHVALUE) bk entries: ${futureMetadataI.length}`);

  // --- Step 4: rdrichvalue.xml <rv> list (0-based index by I), first <v> child = K ---
  const rdrichvalueK = [];
  for (const m of matchAll(/<rv[^>]*>(.*?)<\/rv>/gs, rdrichvalueXml)) {
    const vMatch = m[1].match(/<v>([^<]*)<\/v>/);
    rdrichvalueK.push(vMatch ? Number(vMatch[1]) : null);
  }
  console.log(`rdrichvalue rv entries: ${rdrichvalueK.length}`);

  // --- Step 5: richValueRel.xml <rel r:id="rIdX"/> list (0-based index by K) ---
  const richValueRelIds = [];
  for (const m of matchAll(/<(?:\w+:)?rel\b[^>]*\br:id="(rId\d+)"/g, richValueRelXml)) {
    richValueRelIds.push(m[1]);
  }
  console.log(`richValueRel rel entries: ${richValueRelIds.length}`);

  // --- Step 6: richValueRel.xml.rels Relationship map Id -> Target ---
  const relIdToTarget = new Map();
  for (const m of matchAll(/<Relationship\s+Id="(rId\d+)"[^>]*\bTarget="([^"]+)"/g, richValueRelRelsXml)) {
    relIdToTarget.set(m[1], m[2]);
  }
  console.log(`richValueRel.xml.rels Relationship entries: ${relIdToTarget.size}`);

  // --- Resolve each row N = 1..MAX_N ---
  mkdirSync(OUT_DIR, { recursive: true });

  const results = { success: [], noVm: [], errors: [] };

  for (let n = 1; n <= MAX_N; n++) {
    const sheetRow = n + 1; // header is row 1
    const vm = cCellVm.get(sheetRow);
    if (vm === undefined) {
      results.noVm.push(n);
      continue;
    }
    try {
      const V = valueMetadataV[vm - 1];
      if (V === undefined || V === null) throw new Error(`no valueMetadata entry for vm=${vm}`);

      const I = futureMetadataI[V];
      if (I === undefined || I === null) throw new Error(`no futureMetadata entry for V=${V}`);

      const K = rdrichvalueK[I];
      if (K === undefined || K === null) throw new Error(`no rdrichvalue entry for I=${I}`);

      const rIdX = richValueRelIds[K];
      if (!rIdX) throw new Error(`no richValueRel entry for K=${K}`);

      const target = relIdToTarget.get(rIdX);
      if (!target) throw new Error(`no Relationship found for Id=${rIdX}`);

      // Target is relative to xl/richData/, e.g. "../media/image42.jpeg"
      const mediaPath = 'xl/' + target.replace(/^(\.\.\/)+/, '');

      const imgBuf = readZipFile(xlsxBuf, entries, mediaPath);
      const isJpeg = imgBuf.length >= 2 && imgBuf[0] === 0xff && imgBuf[1] === 0xd8;
      const isPng =
        imgBuf.length >= 8 &&
        imgBuf[0] === 0x89 &&
        imgBuf[1] === 0x50 &&
        imgBuf[2] === 0x4e &&
        imgBuf[3] === 0x47;
      if (!isJpeg && !isPng) {
        throw new Error(`resolved file ${mediaPath} is not a recognizable JPEG/PNG (bad magic bytes)`);
      }

      // Output is always named base-N.jpg per the required convention (a few
      // source images are actually PNG - see report; browsers render by
      // sniffing magic bytes, not extension, so this is harmless for <img>).
      const outPath = path.join(OUT_DIR, `base-${n}.jpg`);
      writeFileSync(outPath, imgBuf);
      results.success.push({ n, mediaPath, size: imgBuf.length, format: isJpeg ? 'jpeg' : 'png' });
    } catch (err) {
      results.errors.push({ n, vm, error: err.message });
    }
  }

  // --- Report ---
  console.log('\n=== SUMMARY ===');
  console.log(`Rows checked: 1..${MAX_N}`);
  console.log(`Photos extracted: ${results.success.length}`);
  const nonJpeg = results.success.filter((s) => s.format !== 'jpeg');
  if (nonJpeg.length) {
    console.log(
      `Note: ${nonJpeg.length} extracted file(s) are actually PNG format saved with .jpg extension: ` +
        nonJpeg.map((s) => `base-${s.n} (${s.mediaPath})`).join(', ')
    );
  }
  console.log(`Rows with no vm (no photo, expected/skip): ${results.noVm.join(', ') || '(none)'}`);
  if (results.errors.length) {
    console.log(`Rows with vm but resolution FAILED (${results.errors.length}):`);
    for (const e of results.errors) console.log(`  base-${e.n} (vm=${e.vm}): ${e.error}`);
  }

  let totalBytes = 0;
  for (const s of results.success) totalBytes += s.size;
  console.log(`Total bytes written: ${totalBytes} (~${(totalBytes / 1024 / 1024).toFixed(1)} MB)`);
}

main();
