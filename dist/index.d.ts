import App from '@octokit/app';
import octokit from '@octokit/rest';
/**
 * Url string, should start with "https://..."
 */
export declare type url = string;
export declare const getAppVeyorBuildUrl: () => string | undefined;
/**
 * Returns the current build job url based on built-in environment variables on various CIs
 * @see CircleCI https://circleci.com/docs/2.0/env-vars/
 * @see AppVeyor https://www.appveyor.com/docs/environment-variables/
 */
export declare const getTargetUrl: () => string | undefined;
export declare namespace GitHub {
    /**
     * Full commit SHA (40 hex characters, lowercase)
     */
    type SHA = string;
    /**
     * Commit status state
     */
    enum StatusState {
        error = "error",
        failure = "failure",
        pending = "pending",
        success = "success"
    }
    function createApp(appId: string, appKey: string): App;
    type InstallationParameters = {
        appId: string;
        installationId: number;
        appKey: string;
    };
    function getFromEnvironment(): InstallationParameters;
    /**
     * Creates GitHub rest client for a GitHub app installation
     */
    function createGithubAppClient(params: InstallationParameters): octokit;
    type CommitStatusOptions = {
        owner: string;
        repo: string;
        sha: string;
        state: StatusState;
        context: string;
        targetUrl?: url;
        description?: string;
    };
    function setCommitStatus(options: CommitStatusOptions, gh: octokit): Promise<void>;
}
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
export declare function setCommitStatus(options: GitHub.CommitStatusOptions): Promise<void>;