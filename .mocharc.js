module.exports = {
    require: ['ts-node/register', 'should', 'test/spec-helper.ts'],
    extension: ['.spec.ts'],
    spec: 'test/**/*.spec.ts',
    recursive: true,
    slow: 10000,
    timeout: 30000,
    reporter: 'mocha-multi-reporters',
    reporterOptions: ['configFile=.mocha-reporters.json'],
};
