/**
 * Semantic-release configuration.
 * Automatically determines next version, updates changelog, commits, and creates GitHub release.
 */
module.exports = {
  branches: ['main'],
  // Automatically inferred from package.json.repository or git remote; can be overridden with REPOSITORY_URL
  repositoryUrl: process.env.REPOSITORY_URL,
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
