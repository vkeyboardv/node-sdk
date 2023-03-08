const semver = require('semver');

const SPECIALS_ORDER = ['master', 'latest', 'stable'];
const PRE_ORDER = ['dev', 'alpha', 'beta', 'rc'];

function compareSpecials(a, b) {
  // Put 'master', 'latest', and 'stable' at the top, in that order.
  const aIndex = SPECIALS_ORDER.findIndex(o => o === a);
  const bIndex = SPECIALS_ORDER.findIndex(o => o === b);

  if (aIndex > -1) {
    if (bIndex < 0) return -1;
    return aIndex === bIndex ? 0 : aIndex < bIndex ? -1 : 1;
  }

  if (bIndex > -1) return 1;

  return null;
}

function compareVersionRange(v, r) {
  if (!semver.validRange(r)) return 1;

  const satisfies = semver.satisfies(v, r);

  return satisfies ? 1 : -compare(v, r.replace(/x/g, Number.MAX_SAFE_INTEGER));
}

function compareRanges(a, b) {
  const _a = a.replace(/x/g, Number.MAX_SAFE_INTEGER);
  const _b = b.replace(/x/g, Number.MAX_SAFE_INTEGER);

  const result = compare(_a, _b);

  if (result !== 0) return -result;

  const aCount = (a.match(/x/g) || []).length;
  const bCount = (b.match(/x/g) || []).length;

  return bCount - aCount;
}

function comparePre([a1, ...ar], [b1, ...br], semiRev = false) {
  if (a1 == null) {
    return b1 == null ? 0 : semiRev ? 1 : -1;
  }

  if (b1 == null) return semiRev ? -1 : 1;

  const aIndex = PRE_ORDER.findIndex(o => o === a1);
  const bIndex = PRE_ORDER.findIndex(o => o === b1);

  if (aIndex === bIndex) {
    if (aIndex === -1) {
      // Not an entry in our table, fall back on default sort.
      return semver.compareIdentifiers(a1, b1) || comparePre(ar, br, semiRev);
    } else {
      return comparePre(ar, br, semiRev);
    }
  } else {
    return aIndex < bIndex ? -1 : 1;
  }
}

function compare(a, b, semiRev = false) {
  if (a === b) return 0;

  const _a = semver.parse(a);
  const _b = semver.parse(b);

  const isPre = sv => sv.prerelease.length > 0;

  // If they are both pre-releases, we have to order them ourselves.
  if (isPre(_a) && isPre(_b)) {
    // By default SemVer.compare() sorts pre-releases alphabetically. This is
    // fine for the common categories 'alpha', 'beta', and 'rc', but we use
    // 'dev' which should come first, not third.
    const baseA = `${_a.major}.${_a.minor}.${_a.patch}`;
    const baseB = `${_b.major}.${_b.minor}.${_b.patch}`;

    return compare(baseA, baseB, semiRev) || comparePre(_a.prerelease, _b.prerelease, semiRev);
  } else {
    return _a.compare(_b);
  }
}

/**
 * Sort in the order (e.g.):
 * - latest
 * - stable
 * - beta
 * - alpha
 * - dev
 * - v1.x.x
 * - v1.2.x
 * - v1.2.2
 * - v1.2.1
 * - v1.2.1-beta.1
 * - v1.2.0
 * - v1.1.x
 * - v1.1.5
 * - etc.
 */
function compareVersions(a, b) {
  if (a === b) return 0;

  const result = compareSpecials(a, b);
  if (result != null) return result;

  const isAValid = !!semver.valid(a);
  const isBValid = !!semver.valid(b);

  if (isAValid && isBValid) {
    // Both keys are valid versions. Sort them in reverse order so we get the
    // newest at the top.
    return -compare(a, b, true);
  }

  const isARangeValid = !!semver.validRange(a);
  const isBRangeValid = !!semver.validRange(b);

  if (isAValid !== isBValid) {
    // Only one key is a valid version.
    return isAValid ? compareVersionRange(a, b) : -compareVersionRange(b, a);
  } else if (isARangeValid && isBRangeValid) {
    return compareRanges(a, b);
  }

  return -comparePre([a], [b], true);
}

module.exports = { compareVersions };
