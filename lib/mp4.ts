/** Duration in seconds from an MP4/MOV `moov/mvhd` box, or null if absent.
 * The server measures uploads itself so the allowance can't be under-reported. */
export function mp4Duration(bytes: Uint8Array): number | null {
 const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
 const type = (at: number) => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
 function walk(start: number, end: number): number | null {
  let at = start;
  while (at + 8 <= end) {
   let size = view.getUint32(at);
   let header = 8;
   if (size === 1) {
    if (at + 16 > end) return null;
    size = Number(view.getBigUint64(at + 8));
    header = 16;
   } else if (size === 0) size = end - at;
   if (size < header || at + size > end) return null;
   const name = type(at + 4);
   if (name === 'moov') return walk(at + header, at + size);
   if (name === 'mvhd') {
    const body = at + header;
    const version = bytes[body];
    const timescale = view.getUint32(body + (version === 1 ? 20 : 12));
    const duration = version === 1 ? Number(view.getBigUint64(body + 24)) : view.getUint32(body + 16);
    return timescale > 0 ? duration / timescale : null;
   }
   at += size;
  }
  return null;
 }
 return walk(0, bytes.byteLength);
}
