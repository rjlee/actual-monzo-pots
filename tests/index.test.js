// Tests for CLI entrypoint main in src/index.js
jest.mock('yargs/yargs', () => {
  const toCamel = (name) =>
    name.replace(/-([a-z])/g, (_match, char) => char.toUpperCase());

  return (args = []) => {
    const parsed = {};
    const positional = [];
    for (let i = 0; i < args.length; i += 1) {
      const token = args[i];
      if (token.startsWith('--')) {
        const key = token.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith('--')) {
          parsed[key] = next;
          i += 1;
        } else {
          parsed[key] = true;
        }
      } else {
        positional.push(token);
      }
    }
    parsed._ = positional;

    const defaults = {};
    const builder = {
      option(optionName, options = {}) {
        if (Object.prototype.hasOwnProperty.call(options, 'default')) {
          defaults[optionName] = options.default;
        }
        return builder;
      },
      help() {
        return builder;
      },
    };

    Object.defineProperty(builder, 'argv', {
      get() {
        const merged = { ...defaults, ...parsed };
        const result = {};
        for (const [key, value] of Object.entries(merged)) {
          if (key === '_') continue;
          let finalValue = value;
          if (typeof finalValue === 'string') {
            if (finalValue === 'true' || finalValue === 'false') {
              finalValue = finalValue === 'true';
            } else if (!Number.isNaN(Number(finalValue))) {
              finalValue = Number(finalValue);
            }
          }
          result[toCamel(key)] = finalValue;
        }
        result._ = merged._ ?? [];
        return result;
      },
    });

    return builder;
  };
});

jest.mock('../src/sync', () => ({
  runSync: jest.fn().mockResolvedValue(),
}));
jest.mock('../src/daemon', () => ({
  runDaemon: jest.fn().mockResolvedValue(),
}));
jest.mock('../src/logger', () => ({ info: jest.fn(), level: 'info' }));

const { main } = require('../src/index');
const { runSync } = require('../src/sync');
const { runDaemon } = require('../src/daemon');
const logger = require('../src/logger');

describe('CLI main', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logger.info.mockClear();
    logger.level = 'info';
  });

  it('runs sync mode when --mode sync is specified', async () => {
    await main(['--mode', 'sync']);
    expect(runSync).toHaveBeenCalledWith({ verbose: false });
    expect(logger.info).toHaveBeenCalledWith({ mode: 'sync' }, 'Service starting');
  });

  it('runs daemon mode when --mode daemon is specified with flags', async () => {
    await main(['--mode', 'daemon', '--verbose', '--ui', '--http-port', '1234']);
    expect(runDaemon).toHaveBeenCalledWith({ verbose: true, ui: true, httpPort: 1234 });
  });

  it('sets logger level to debug when --verbose is specified', async () => {
    await main(['--mode', 'sync', '--verbose']);
    expect(logger.level).toBe('debug');
  });
});
