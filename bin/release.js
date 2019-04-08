#!/usr/bin/env node

const Changelog = require('generate-changelog');
const Fs = require('fs');
const pkg = require('package-json-utils');
const changelogPkg = require('generate-changelog/lib/package');
const Bluebird = require('bluebird');
const CP = Bluebird.promisifyAll(require('child_process'));
const getReleaseType = require('../lib/releasetype');
const semver = require('semver');


/* @TODO check version in package.json with latest tag. If they differ the previous release
   was not tagged, and thus we do not want to create new release yet */

async function release () {
    console.log('🦁 release all the things, a solution to the manual release work');

    let tagsRaw = await getTagsRaw();
    let allTags = [];
    if (tagsRaw) {
        allTags = tagsRaw.split('\n').filter((tag) => tag.trim() !== '').map((tag) => {
            const tagArray = tag.split(/\s+refs\/tags\//);
            return {hash: tagArray[0], version: tagArray[1]};
        });
    }
    // make sure to start from the start by adding the start of the commit log
    if (allTags.length > 0) {
        allTags.unshift({hash: `${allTags[0].version}^@`, version: `${allTags[0].version}^@`});
    }
    allTags.sort(function (a, b) {
        return semver.gt(a.version, b.version);
    });
    // create a new release
    // @todo maybe compare latest tag from log and version in package.json to make sure we don't make a bigger mess
    // get latest tag
    const latestTag = allTags.length > 0 ? allTags[allTags.length-1].version : null;

    let releaseType = await getReleaseType(latestTag);
    if(!releaseType) {
        console.log('No release was created');
        process.exit();
    }
    var packageJson = pkg.getPackageJson();
    let giturl = packageJson.repository.url.match(/^.*(http.*?)(?:\.git)?$/);
    if(!giturl) {
        console.error('No git repository url found or no http(s) in the url');
        process.exit();
    }
    let options = {repoUrl: giturl[1]};
    options.tag = latestTag;
    options[releaseType] = true;
    let newVersion = await changelogPkg.calculateNewVersion(options);
    options.semver = newVersion;
    pkg.setVersion(newVersion, './package.json');

    // first read the previous contents
    let previousChangelog = '';
    try {
        previousChangelog = Fs.readFileSync('./CHANGELOG.md').toString();
    } catch (e) {
        console.log('No previous changelog found, will create one');
    }

    // now write the combined contents
    await Changelog.generate(options)
        .then(function (changelog) {
            Fs.writeFileSync('./CHANGELOG.md', changelog + previousChangelog);
        });
    await commitChangedFiles();
    console.log(`Release ${newVersion} has been created ✅`);

    async function commitChangedFiles() {
        return new Bluebird(function (resolve) {
            CP.execAsync('git add package.json CHANGELOG.md && git commit -m "Created release ' + newVersion + '"').then(() => {
                console.log('Committed package.json + CHANGELOG.md')
            }).catch((e) => {
                console.log('Something went wrong committing package.json + CHANGELOG.md');
            });
        })
    }

    async function getTagsRaw() {
        return new Bluebird(function (resolve) {
            CP.execAsync('git show-ref --tags | grep -v develop').then((gitTags) => {
                resolve(gitTags);
            }).catch((e) => {
                console.log('No tags could be found, using regular commits');
                resolve('');
            });
        })
    }

}
release();
