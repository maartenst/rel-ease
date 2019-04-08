#!/usr/bin/env node

const pkg = require('package-json-utils');
const Bluebird = require('bluebird');
const CP = Bluebird.promisifyAll(require('child_process'));


async function tag () {
    let version = pkg.getVersion('./package.json');
    await tagVersion();
    await pushTag();

    async function tagVersion() {
        return new Bluebird(function (resolve) {
            CP.execAsync(`git tag -a ${version} -m "${version}"`).then(() => {
                resolve(console.log(`Tagged version ${version}`));
            }).catch((e) => {
                console.log(`Something went wrong tagging version ${version}`);
            });
        })
    }
    async function pushTag() {
        return new Bluebird(function (resolve) {
            CP.execAsync(`git push origin ${version}`).then(() => {
                resolve(console.log(`Pushed tag ${version}`));
            }).catch((e) => {
                console.log(`Something went wrong pushing tag ${version}\n`);
            });
        })
    }

}
tag();
