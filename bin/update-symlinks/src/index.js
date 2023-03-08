const fs = require('fs');
const path = require('path');
const semver = require('semver');

const { compareVersions } = require('./compareVersions');
const { ln, isDir, isSL } = require('./utils');

function main() {
  const versions = {};

  const updateVersion = (oldVersion, newVersion) => {
    const _oldVersion = versions[oldVersion] || '0.0.0';

    if (semver.compare(_oldVersion, newVersion) < 0) {
      versions[oldVersion] = newVersion;
    }
  };

  const docsPath = path.join(__dirname, '../../../docs');

  process.chdir(docsPath);
  console.log(`Moved to ${docsPath}`);

  const content = fs.readdirSync(docsPath);

  for (const name of content) {
    console.log(`Checking file ${docsPath}/${name}`);

    if (isSL(name) || !isDir(name) || !semver.valid(name)) continue;

    versions[name] = name;

    const { major, minor, patch, prerelease } = semver.parse(name);

    updateVersion('latest', name);

    if (prerelease.length > 0) {
      const prType = prerelease[0];

      updateVersion(`v${major}.${minor}.${patch}-${prType}`, name);
      updateVersion(prType, name);
    } else {
      updateVersion(`v${major}.${minor}.x`, name);
      updateVersion(`v${major}.x.x`, name);
      updateVersion('stable', name);
    }
  }

  console.log('Found versions:');
  console.log(JSON.stringify(versions, null, 2));

  const versionsSorted = Object.keys(versions).sort(compareVersions);
  let versionLinks = '';

  for (const name of versionsSorted) {
    ln(versions[name], name);
    versionLinks += `\n<li><a href="${name}">${name}</a></li>`;
  }

  console.log('Updating version links in index.html...');

  let index = fs.readFileSync('./index.html', { encoding: 'utf-8' });
  index = index.replace(
    /<!-- START:VERSIONS -->[\s\S]*?<!-- END:VERSIONS -->/,
    `<!-- START:VERSIONS -->${versionLinks}\n<!-- END:VERSIONS -->`,
  );

  fs.writeFileSync('./index.html', index);
  console.log('index.html updated successfully!');
}

main();
