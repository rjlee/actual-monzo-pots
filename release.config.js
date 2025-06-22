/**
 * Semantic-release configuration.
 * Automatically determines next version, updates changelog, commits, and creates GitHub release.
 */
module.exports = {
  branches: ['main'],
  repositoryUrl: process.env.REPOSITORY_URL || 'https://github.com/robl/actual-monzo-pots.git',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    // Update package.json version (without publishing to npm)
    ['@semantic-release/npm', { npmPublish: false }],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    '@semantic-release/github',
  ],
};
