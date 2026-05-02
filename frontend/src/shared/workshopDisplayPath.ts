export function workshopFolderDisplayPath(absPath: string): string {
  const needle = '.local/share';
  const i = absPath.indexOf(needle);
  if (i >= 0) {
    return absPath.slice(i);
  }
  const u = absPath.match(/^\/(?:Users|home)\/[^/]+\/(.*)$/i);
  if (u) {
    return u[1];
  }
  const win = absPath.match(/^[A-Za-z]:\\Users\\[^\\]+\\(.*)$/);
  if (win) {
    return win[1].replace(/\\/g, '/');
  }
  return absPath;
}
