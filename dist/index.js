"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("@octokit/app"));
const rest_1 = __importDefault(require("@octokit/rest"));
const check_more_types_1 = __importDefault(require("check-more-types"));
const debug_1 = __importDefault(require("debug"));
const lazy_ass_1 = __importDefault(require("lazy-ass"));
const debug = debug_1.default('@khulnasoft/set-commit-status');
/**

 *
 * Note: returned decoded string should start with line
 * '-----BEGIN RSA PRIVATE KEY-----'
 */
const getAppPrivateKeyFromEnvVariable = (appKey) => {
    return Buffer.from(appKey, 'base64').toString('ascii');
};
/**
 * Creates GitHub client using personal API token or unauthenticated
 *
 * @param {string} [auth] Optional personal API token or function returning token
 * @see https://github.com/octokit/rest.js#authentication
 */
function _createGitHubClient(auth) {
    return new rest_1.default({
        auth,
        userAgent: 'octokit/rest.js v16.23.2',
    });
}
exports.getAppVeyorBuildUrl = () => {
    if (!process.env.APPVEYOR) {
        return;
    }
    const { APPVEYOR_URL, APPVEYOR_ACCOUNT_NAME, APPVEYOR_PROJECT_SLUG, APPVEYOR_BUILD_ID, } = process.env;
    if (!APPVEYOR_URL ||
        !APPVEYOR_ACCOUNT_NAME ||
        !APPVEYOR_BUILD_ID ||
        !APPVEYOR_PROJECT_SLUG) {
        console.error('Hmm, cannot find build environment variables on AppVeyor CI');
        return;
    }
    return `${APPVEYOR_URL}/project/${APPVEYOR_ACCOUNT_NAME}/${APPVEYOR_PROJECT_SLUG}/builds/${APPVEYOR_BUILD_ID}`;
};
/**
 * Returns the current build job url based on built-in environment variables on various CIs
 * @see CircleCI https://circleci.com/docs/2.0/env-vars/
 * @see AppVeyor https://www.appveyor.com/docs/environment-variables/
 */
exports.getTargetUrl = () => process.env.CIRCLE_BUILD_URL || exports.getAppVeyorBuildUrl();
var GitHub;
(function (GitHub) {
    /**
     * Commit status state
     */
    let StatusState;
    (function (StatusState) {
        StatusState["error"] = "error";
        StatusState["failure"] = "failure";
        StatusState["pending"] = "pending";
        StatusState["success"] = "success";
    })(StatusState = GitHub.StatusState || (GitHub.StatusState = {}));
    function createApp(appId, appKey) {
        const privateKey = getAppPrivateKeyFromEnvVariable(appKey);
        return new app_1.default({ id: appId, privateKey });
    }
    GitHub.createApp = createApp;
    function getFromEnvironment() {
        lazy_ass_1.default(check_more_types_1.default.unemptyString(process.env.GH_APP_ID), 'missing GH_APP_ID');
        const appId = process.env.GH_APP_ID;
        const installId = process.env.GH_INSTALLATION_ID;
        lazy_ass_1.default(check_more_types_1.default.unemptyString(installId), 'missing GH_INSTALLATION_ID');
        const installationId = parseInt(installId);
        lazy_ass_1.default(check_more_types_1.default.unemptyString(process.env.GH_PRIVATE_KEY), 'missing env variable GH_PRIVATE_KEY');
        const appKey = process.env.GH_PRIVATE_KEY;
        return {
            appId,
            installationId,
            appKey,
        };
    }
    GitHub.getFromEnvironment = getFromEnvironment;
    const tokenHeader = (token) => `token ${token}`;
    /**
     * Creates GitHub rest client for a GitHub app installation
     */
    function createGithubAppClient(params) {
        const app = createApp(params.appId, params.appKey);
        const auth = () => 
        // @ts-ignore
        app
            .getInstallationAccessToken({ installationId: params.installationId })
            .then(tokenHeader);
        return _createGitHubClient(auth);
    }
    GitHub.createGithubAppClient = createGithubAppClient;
    function setCommitStatus(options, gh) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('setting commit status %o', options);
            let targetUrl = options.targetUrl || exports.getTargetUrl();
            const ghOptions = {
                owner: options.owner,
                repo: options.repo,
                sha: options.sha,
                state: options.state || StatusState.pending,
                target_url: targetUrl,
                description: options.description,
                context: options.context,
            };
            debug('resolved commit status options %o', ghOptions);
            // https://octokit.github.io/rest.js/#api-Repos-createStatus
            yield gh.repos.createStatus(ghOptions);
            debug('created commit status: %s/%s sha %s state %s', ghOptions.owner, ghOptions.repo, ghOptions.sha, ghOptions.state);
            if (ghOptions.target_url) {
                debug('with details at %s', ghOptions.target_url);
            }
        });
    }
    GitHub.setCommitStatus = setCommitStatus;
})(GitHub = exports.GitHub || (exports.GitHub = {}));
/**
 * Top level API method for getting GitHub settings from the environment,
 * creating the client and creating the status.
 * @example
  ```
  import {setCommitStatus} from '@khulnasoft/set-commit-status'

  await setCommitStatus({
    owner: 'organization',
    repo: 'name',
    sha: '40 character commit sha',
    // state can be "error", "pending", "failure" or "success"
    state: 'pending',
    // optional properties
    targetUrl: 'http://...',
    description: 'my status message',
    context: 'short context'
  })
  ```
 */
function setCommitStatus(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const params = GitHub.getFromEnvironment();
        const gh = GitHub.createGithubAppClient(params);
        yield GitHub.setCommitStatus(options, gh);
    });
}
exports.setCommitStatus = setCommitStatus;