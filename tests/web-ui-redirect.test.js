const fs = require('fs');
const path = require('path');

describe('Web UI 401 redirect logic in index.ejs', () => {
  let template;
  beforeAll(() => {
    template = fs.readFileSync(path.join(__dirname, '../src/views/index.ejs'), 'utf8');
  });

  it('guards auto-redirect with hadRefreshToken check', () => {
    // Ensure redirect to /auth on 401 is only inside the hadRefreshToken conditional
    const pattern =
      /if \(res\.status === 401\) \{\s*\/\/ Only auto-redirect to Monzo auth if a refresh token existed[\s\S]*?if \(hadRefreshToken\) \{\s*window\.location\.href = '\/auth';[\s\S]*?\}\s*return;/;
    expect(template).toMatch(pattern);
  });
});
