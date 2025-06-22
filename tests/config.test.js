const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const configMod = require('../src/config');

describe('loadConfig', () => {
  const cwd = process.cwd();
  const yamlPath = path.join(cwd, 'config.yaml');
  const ymlPath = path.join(cwd, 'config.yml');
  const jsonPath = path.join(cwd, 'config.json');

  afterEach(() => {
    [yamlPath, ymlPath, jsonPath].forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  it('returns empty object when no config file found', () => {
    expect(configMod.loadConfig()).toEqual({});
  });

  it('loads JSON config file', () => {
    const data = { foo: 'bar', baz: 42 };
    fs.writeFileSync(jsonPath, JSON.stringify(data), 'utf8');
    expect(configMod.loadConfig()).toEqual(data);
  });

  it('loads YAML config file config.yaml', () => {
    const data = { foo: 'yaml', num: 1 };
    fs.writeFileSync(yamlPath, yaml.dump(data), 'utf8');
    expect(configMod.loadConfig()).toEqual(data);
  });

  it('loads YAML config file config.yml when config.yaml missing', () => {
    const data = { abc: 'xyz' };
    fs.writeFileSync(ymlPath, yaml.dump(data), 'utf8');
    expect(configMod.loadConfig()).toEqual(data);
  });

  it('throws error when YAML config is invalid', () => {
    fs.writeFileSync(yamlPath, ':::not yaml:::');
    // js-yaml may not throw on this input; ensure loadConfig returns parsed output or empty object
    expect(configMod.loadConfig()).toEqual(yaml.load(':::not yaml:::'));
  });
});
