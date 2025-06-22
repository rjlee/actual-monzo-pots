const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Load configuration from config.yaml, config.yml, or config.json in project root.
 * Returns an object of parsed settings or an empty object if none found.
 */
function loadConfig() {
  const cwd = process.cwd();
  for (const file of ['config.yaml', 'config.yml', 'config.json']) {
    const full = path.join(cwd, file);
    if (fs.existsSync(full)) {
      const raw = fs.readFileSync(full, 'utf8');
      try {
        return file.endsWith('.json') ? JSON.parse(raw) : yaml.load(raw);
      } catch (err) {
        throw new Error(`Failed to parse configuration file ${file}: ${err.message}`);
      }
    }
  }
  return {};
}

// Export the loaded config object, and loader for runtime/tests
const config = loadConfig();
config.loadConfig = loadConfig;
module.exports = config;
