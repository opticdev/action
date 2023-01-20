import { promisify } from "util";
import { exec as callbackExec } from "child_process";
import { nanoid } from "nanoid";
import { mkdir } from "node:fs/promises";

const exec = promisify(callbackExec);

async function runAction(token: string) {
  const cwd = process.cwd();
  const execId = nanoid();
  const execDir = `./tmp/${execId}`;

  // set up a specific execution directory for this run so it's sandboxed
  await mkdir(execDir);

  // run the command in the exec directory
  return await exec(`${cwd}/node_modules/.bin/ts-node ${cwd}/src/index.ts`, {
    cwd: execDir,
    env: { ...process.env, INPUT_TOKEN: token },
  });
}

beforeAll(async () => {
  // clean up tmp before runs. Keep between runs for debugging
  await exec(`rm -rf tmp/*`);
});

// TODO - figure out how to run tests in isolation with sandboxed npm

// eslint-disable-next-line jest/no-disabled-tests
test.skip("basic run", async () => {
  const out = await runAction("test-token");
  expect(out.stdout).toEqual("test-token\n");
});
