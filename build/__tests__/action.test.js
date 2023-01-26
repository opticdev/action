"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const action_1 = require("../action");
const exec = __importStar(require("@actions/exec"));
jest.mock("@actions/exec");
test("invalid input", async () => {
    const exitCode = await (0, action_1.runAction)("optic-token", "github-token", "true", "", "", undefined, "owner", "repo", "abc123");
    expect(exitCode).toBe(1);
});
test("failed install", async () => {
    const assertFailedInstall = mockFailedInstall();
    const exitCode = await (0, action_1.runAction)("optic-token", "github-token", "true", "push", "refs/heads/main", undefined, "owner", "repo", "abc123");
    expect(exitCode).toBe(1);
    assertFailedInstall();
});
test("pull_request event", async () => {
    const assertInstall = mockInstall();
    const assertEnsureRef = mockEnsureRef("main");
    const assertDiffAll = mockDiffAll("token", "origin/main");
    const assertGitHubComment = mockGitHubComment();
    const exitCode = await (0, action_1.runAction)("optic-token", "github-token", "true", "pull_request", "refs/pulls/1/merge", "main", "owner", "repo", "abc123");
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
    const exitCode = await (0, action_1.runAction)("optic-token", "github-token", "true", "push", "refs/heads/main", undefined, "owner", "repo", "abc123");
    expect(exitCode).toBe(0);
    assertInstall();
    assertDeepen();
    assertDiffAll();
});
test("push event with standards failure and standards_fail set to true", async () => {
    const assertInstall = mockInstall();
    const assertDeepen = mockDeepen();
    const assertDiffAll = mockDiffAll("optic-token", "HEAD~1", true);
    const exitCode = await (0, action_1.runAction)("optic-token", "github-token", "true", "push", "refs/heads/main", undefined, "owner", "repo", "abc123");
    expect(exitCode).toBe(1);
    assertInstall();
    assertDeepen();
    assertDiffAll();
});
test("push event with standards failure but standards_fail set to false", async () => {
    const assertInstall = mockInstall();
    const assertDeepen = mockDeepen();
    const assertDiffAll = mockDiffAll("optic-token", "HEAD~1", true);
    const exitCode = await (0, action_1.runAction)("optic-token", "github-token", "false", "push", "refs/heads/main", undefined, "owner", "repo", "abc123");
    expect(exitCode).toBe(0);
    assertInstall();
    assertDeepen();
    assertDiffAll();
});
function mockInstall() {
    jest.mocked(exec.exec).mockResolvedValueOnce(0);
    return () => expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("npm", ["install", "--location=global", "@useoptic/optic"], {});
}
function mockFailedInstall() {
    jest.mocked(exec.exec).mockRejectedValue(new Error("Something broke"));
    return () => expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("npm", ["install", "--location=global", "@useoptic/optic"], {});
}
function mockEnsureRef(ref) {
    jest.mocked(exec.exec).mockResolvedValueOnce(0);
    return () => expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("git", ["fetch", "--no-tags", "--depth=1", "origin", ref], {});
}
function mockDeepen() {
    jest.mocked(exec.exec).mockResolvedValueOnce(0);
    return () => expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("git", ["fetch", "--deepen=1"], {});
}
function mockDiffAll(token, from, error = false) {
    if (error) {
        jest.mocked(exec.exec).mockRejectedValue(new Error("Something broke"));
    }
    else {
        jest.mocked(exec.exec).mockResolvedValueOnce(0);
    }
    return () => expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("optic", ["diff-all", "--compare-from", from, "--check"], expect.objectContaining({
        env: expect.objectContaining({ OPTIC_TOKEN: "optic-token" }),
    }));
}
function mockGitHubComment() {
    jest.mocked(exec.exec).mockResolvedValueOnce(0);
    return () => {
        console.log(jest.mocked(exec.exec).mock.lastCall);
        expect(jest.mocked(exec.exec)).toHaveBeenCalledWith("optic", [
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
        ], expect.objectContaining({
            env: expect.objectContaining({ GITHUB_TOKEN: "github-token" }),
        }));
    };
}
//# sourceMappingURL=action.test.js.map