import { runAction } from "../action";
import * as exec from "@actions/exec";

jest.mock("@actions/exec");

test("invalid input", async () => {
  const exitCode = await runAction(
    "optic-token",
    "github-token",
    "",
    "true",
    "",
    "",
    undefined,
    "owner",
    "repo",
    "abc123"
  );
  expect(exitCode).toBe(1);
});

test("failed install", async () => {
  const assertFailedInstall = mockFailedInstall();

  const exitCode = await runAction(
    "optic-token",
    "github-token",
    "",
    "true",
    "push",
    "refs/heads/main",
    undefined,
    "owner",
    "repo",
    "abc123"
  );
  expect(exitCode).toBe(1);
  assertFailedInstall();
});

test("pull_request event", async () => {
  const assertInstall = mockInstall();
  const assertEnsureRef = mockEnsureRef("main");
  const assertDiffAll = mockDiffAll("token", "origin/main");
  const assertGitHubComment = mockGitHubComment();

  const exitCode = await runAction(
    "optic-token",
    "github-token",
    "",
    "true",
    "pull_request",
    "refs/pulls/1/merge",
    "main",
    "owner",
    "repo",
    "abc123"
  );
  expect(exitCode).toBe(0);
  assertInstall();
  assertEnsureRef();
  assertDiffAll();
  assertGitHubComment();
});

test("push event", async () => {
  const assertInstall = mockInstall();
  const assertDeepen = mockDeepen();
  const assertDiffAll = mockDiffAll("optic-token", "HEAD~1");

  const exitCode = await runAction(
    "optic-token",
    "github-token",
    "",
    "true",
    "push",
    "refs/heads/main",
    undefined,
    "owner",
    "repo",
    "abc123"
  );
  expect(exitCode).toBe(0);
  assertInstall();
  assertDeepen();
  assertDiffAll();
});

test("push event with additional-args", async () => {
  const assertInstall = mockInstall();
  const assertDeepen = mockDeepen();
  const assertDiffAll = mockDiffAll("optic-token", "HEAD~1", false, [
    "--fail-on-untracked-openapi",
  ]);

  const exitCode = await runAction(
    "optic-token",
    "github-token",
    "--fail-on-untracked-openapi",
    "true",
    "push",
    "refs/heads/main",
    undefined,
    "owner",
    "repo",
    "abc123"
  );
  expect(exitCode).toBe(0);
  assertInstall();
  assertDeepen();
  assertDiffAll();
});

test("push event with standards failure and standards_fail set to true", async () => {
  const assertInstall = mockInstall();
  const assertDeepen = mockDeepen();
  const assertDiffAll = mockDiffAll("optic-token", "HEAD~1", true);

  const exitCode = await runAction(
    "optic-token",
    "github-token",
    "",
    "true",
    "push",
    "refs/heads/main",
    undefined,
    "owner",
    "repo",
    "abc123"
  );
  expect(exitCode).toBe(1);
  assertInstall();
  assertDeepen();
  assertDiffAll();
});

test("push event with standards failure but standards_fail set to false", async () => {
  const assertInstall = mockInstall();
  const assertDeepen = mockDeepen();
  const assertDiffAll = mockDiffAll("optic-token", "HEAD~1", true);

  const exitCode = await runAction(
    "optic-token",
    "github-token",
    "",
    "false",
    "push",
    "refs/heads/main",
    undefined,
    "owner",
    "repo",
    "abc123"
  );
  expect(exitCode).toBe(0);
  assertInstall();
  assertDeepen();
  assertDiffAll();
});

function mockInstall(): () => void {
  jest.mocked(exec.exec).mockResolvedValueOnce(0);
  return () =>
    expect(jest.mocked(exec.exec)).toHaveBeenCalledWith(
      "npm",
      ["install", "--location=global", "@useoptic/optic"],
      {}
    );
}

function mockFailedInstall(): () => void {
  jest.mocked(exec.exec).mockRejectedValue(new Error("Something broke"));

  return () =>
    expect(jest.mocked(exec.exec)).toHaveBeenCalledWith(
      "npm",
      ["install", "--location=global", "@useoptic/optic"],
      {}
    );
}

function mockEnsureRef(ref: string): () => void {
  jest.mocked(exec.exec).mockResolvedValueOnce(0);
  return () =>
    expect(jest.mocked(exec.exec)).toHaveBeenCalledWith(
      "git",
      ["fetch", "--no-tags", "--depth=1", "origin", ref],
      {}
    );
}

function mockDeepen(): () => void {
  jest.mocked(exec.exec).mockResolvedValueOnce(0);
  return () =>
    expect(jest.mocked(exec.exec)).toHaveBeenCalledWith(
      "git",
      ["fetch", "--deepen=1"],
      {}
    );
}

function mockDiffAll(
  token: string,
  from: string,
  error = false,
  additionalArgs: string[] = []
): () => void {
  if (error) {
    jest.mocked(exec.exec).mockRejectedValue(new Error("Something broke"));
  } else {
    jest.mocked(exec.exec).mockResolvedValueOnce(0);
  }

  return () =>
    expect(jest.mocked(exec.exec)).toHaveBeenCalledWith(
      "optic",
      [
        "diff-all",
        "--compare-from",
        from,
        "--check",
        "--upload",
        ...additionalArgs,
      ],
      expect.objectContaining({
        env: expect.objectContaining({ OPTIC_TOKEN: "optic-token" }),
      })
    );
}

function mockGitHubComment(): () => void {
  jest.mocked(exec.exec).mockResolvedValueOnce(0);

  return () => {
    console.log(jest.mocked(exec.exec).mock.lastCall);
    expect(jest.mocked(exec.exec)).toHaveBeenCalledWith(
      "optic",
      [
        "ci",
        "comment",
        "--provider",
        "github",
        "--owner",
        "owner",
        "--repo",
        "repo",
        "--pull-request",
        "1",
        "--sha",
        "abc123",
      ],
      expect.objectContaining({
        env: expect.objectContaining({ GITHUB_TOKEN: "github-token" }),
      })
    );
  };
}
