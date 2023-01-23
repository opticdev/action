import { runAction } from "../action";
import * as exec from "@actions/exec";

jest.mock("@actions/exec");

test("invalid input", async () => {
  const exitCode = await runAction("token", "", "");
  expect(exitCode).toBe(1);
});

test("failed install", async () => {
  const assertInstall = mockFailedInstall();

  const exitCode = await runAction("token", "push", "refs/heads/main");
  expect(exitCode).toBe(1);
  assertInstall;
});

test("pull_request event", async () => {
  const ref = "refs/pulls/1/merge";
  const assertInstall = mockInstall();
  const assertEnsureRef = mockEnsureRef(ref);
  const assertDiffAll = mockDiffAll("token", ref);

  const exitCode = await runAction("token", "pull_request", ref);
  expect(exitCode).toBe(0);
  assertInstall();
  assertEnsureRef();
  assertDiffAll();
});

test("push event", async () => {
  const assertInstall = mockInstall();
  const assertDeepen = mockDeepen();
  const assertDiffAll = mockDiffAll("token", "HEAD~1");

  const exitCode = await runAction("token", "push", "refs/heads/main");
  expect(exitCode).toBe(0);
  assertInstall();
  assertDeepen();
  assertDiffAll();
});

function mockInstall(): () => void {
  jest.mocked(exec.exec).mockResolvedValueOnce(0);
  return () =>
    expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("npm", [
      "install",
      "--location=global",
      "@useoptic/optic",
    ]);
}

function mockFailedInstall(): () => void {
  jest.mocked(exec.exec).mockRejectedValue(new Error("Something broke"));

  return () =>
    expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("npm", [
      "install",
      "--location=global",
      "@useoptic/optic",
    ]);
}

function mockEnsureRef(ref: string): () => void {
  jest.mocked(exec.exec).mockResolvedValueOnce(0);
  return () =>
    expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("git", [
      "fetch",
      "--no-tags",
      "--depth=1",
      "origin",
      ref,
    ]);
}

function mockDeepen(): () => void {
  jest.mocked(exec.exec).mockResolvedValueOnce(0);
  return () =>
    expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("git", [
      "fetch",
      "--deepen=1",
    ]);
}

function mockDiffAll(token: string, from: string): () => void {
  jest.mocked(exec.exec).mockResolvedValueOnce(0);
  return () =>
    expect(jest.mocked(exec.exec)).toHaveBeenCalledWith(
      "optic",
      ["diff-all", "--compare-from", from, "--check"],
      expect.objectContaining({ env: expect.anything() })
    );
}
