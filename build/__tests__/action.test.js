"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const child_process_1 = require("child_process");
const nanoid_1 = require("nanoid");
const promises_1 = require("node:fs/promises");
jest.setTimeout(30000);
const exec = (0, util_1.promisify)(child_process_1.exec);
async function runAction(token, eventName) {
    const cwd = process.cwd();
    const execId = (0, nanoid_1.nanoid)();
    const execDir = `./tmp/${execId}`;
    // set up a specific execution directory for this run so it's sandboxed
    await (0, promises_1.mkdir)(execDir);
    // run the command in the exec directory
    return await exec(`${cwd}/node_modules/.bin/ts-node ${cwd}/src/index.ts`, {
        cwd: execDir,
        shell: process.env.SHELL,
        env: Object.assign(Object.assign({}, process.env), { INPUT_TOKEN: token, GITHUB_EVENT_NAME: eventName }),
    });
}
beforeAll(async () => {
    // clean up tmp before runs. Keep between runs for debugging
    await exec(`rm -rf tmp/*`);
});
// TODO - figure out how to run tests in isolation with sandboxed npm
// eslint-disable-next-line jest/no-disabled-tests
test.skip("basic run", async () => {
    try {
        const out = await runAction("test-token", "push");
        expect(out.stdout).toEqual("test-token\n");
    }
    catch (e) {
        console.log(e);
    }
});
//# sourceMappingURL=action.test.js.map