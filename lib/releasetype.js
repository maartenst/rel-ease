
const analyzer = require('@semantic-release/commit-analyzer/index');
const getCommits = require('../bin/getcommits');

module.exports = async (latestTag) => {
    let commitsSinceRelease = await getCommits(process.cwd(), process.env, latestTag, null ,console);
    return await analyzer.analyzeCommits('angular', {commits: commitsSinceRelease, logger: console});
};