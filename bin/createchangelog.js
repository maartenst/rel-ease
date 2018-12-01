#!/usr/bin/env node

const Changelog = require('generate-changelog');
const Fs = require('fs');
const pkg = require('package-json-utils');
const Bluebird = require('bluebird');
const CP = Bluebird.promisifyAll(require('child_process'));

async function createchangelog () {
    console.log('🦁 release all the things, a 🍝 solution to the manual release work');

    let packageJson = pkg.getPackageJson();
    let tagsRaw = await getTagsRaw();
    let firstCommitHash = await getFirstCommit();
    let allTags = tagsRaw.split('\n').filter((tag) =>  tag.trim() !== '' ).map((tag) => {
        const tagArray = tag.split(/\s+refs\/tags\//);
        return { hash: tagArray[0], version: tagArray[1]};
    });
    let giturl = packageJson.repository.url.match(/^.*(http.*?)(?:\.git)?$/);
    let options = {repoUrl: giturl[1]};

    // if there is only one tag
    if (allTags.length === 1) {
        // now write the combined contents
        options.date = await getDateForTag(allTags[0].version);
        options.tag = firstCommitHash.trim() + '  ' + allTags[0].version;
        console.log(options.tag);
        options.semver = allTags[0].version;
        // first read the previous contents
        let previousChangelog = '';
        try {
            previousChangelog = Fs.readFileSync('./CHANGELOG.md').toString();
        } catch (e) {
            console.log('No changelog file found, creating file');
        }
        await Changelog.generate(options)
            .then(function (changelog) {
                Fs.writeFileSync('./CHANGELOG.md', changelog + previousChangelog);
            });
    } else {
        // make sure to start from the start by adding the start of the commit log
        allTags.unshift({hash: firstCommitHash, version: firstCommitHash});

        // iterate through tags to create the changelog
        for (var index = 0; index < allTags.length; index++) {
            // do not handle last tag, we already looked forward to that in the previous iteration
            if ((index + 1) === allTags.length) {
                continue;
            }

            // now write the combined contents
            options.date = await getDateForTag(allTags[index + 1].version);
            if (index === 0) {
                options.tag = firstCommitHash.trim() + '  ' + allTags[1].version;
            } else if (index !== allTags.length - 1) {
                options.tag = `${allTags[index].version}..${allTags[index + 1].version}`;
            } else {
                options.tag = `${allTags[index - 1].hash}..${allTags[index].version}`;
            }
            options.semver = allTags[index + 1].version;
            options = resetSemanticOption(options);
            options[isMajorMinorPatch(allTags[index + 1].version)] = true;

            // first read the previous contents @todo this is in both parts, can we make this smarter
            let previousChangelog = '';
            try {
                previousChangelog = Fs.readFileSync('./CHANGELOG.md').toString();
            } catch (e) {
                console.log('No changelog file found, creating file');
            }
            await Changelog.generate(options)
                .then(function (changelog) {
                    Fs.writeFileSync('./CHANGELOG.md', changelog + previousChangelog);
                });
        }
    }
    process.exit();

    async function getDateForTag(tag) {
        return new Bluebird(async (resolve) => {
            const completeDate = await CP.execAsync(`git log -1 --format=%aI ${tag} --date=short`);
            return resolve(completeDate.split('T')[0]);
        })
    }

    function resetSemanticOption(options) {
        delete options.major;
        delete options.minor;
        delete options.patch;
        return options;
    }

    function isMajorMinorPatch(version) {
        let [major, minor, patch] = version.split('.').map(item => item * 1);
        if (major !== 0 && minor === 0 && patch === 0) {
            return 'major';
        } else if (minor !== 0 && patch === 0) {
            return 'minor';
        } else {
            return 'patch';
        }
    }

    async function getTagsRaw() {
        return new Bluebird(function (resolve) {
            return resolve(CP.execAsync('git show-ref --tags | grep -v develop'));
        })
    }

    async function getFirstCommit() {
        return new Bluebird(function (resolve) {
            return resolve(CP.execAsync('git rev-list --max-parents=0 HEAD'));
        })
    }
}
createchangelog();
