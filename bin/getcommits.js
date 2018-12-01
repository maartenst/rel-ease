const gitLogParser = require('git-log-parser');
const getStream = require('get-stream');

/**
 * Retrieve the list of commits on the current branch since the commit sha associated with the last release, or all the commits of the current branch if there is no last released version.
 *
 * @param {Object} context semantic-release context.
 *
 * @return {Promise<Array<Object>>} The list of commits on the branch `branch` since the last release.
 *
 * LICENSE: MIT
 * Contains code from https://github.com/semantic-release/ from the file /lib/get-commits.js, with slight adjustments
 */
module.exports = async (cwd, env, from, to=null , logger) => {
  if (from) {
    console.log('Use gitHead: %s', from);
  } else {
    logger.log('No previous release found, retrieving all commits');
  }

  Object.assign(gitLogParser.fields, {hash: 'H', message: 'B', gitTags: 'd', committerDate: {key: 'ci', type: Date}});
  const commits = (await getStream.array(
    gitLogParser.parse({_: `${from ? from + '..' : ''}${to ? to  : 'HEAD'}`}, {cwd, env: {...process.env, ...env}})
  )).map(commit => {
    commit.message = commit.message.trim();
    commit.gitTags = commit.gitTags.trim();
    return commit;
  });
  logger.log(`Found ${commits.length} commits`);
  return commits;
};
