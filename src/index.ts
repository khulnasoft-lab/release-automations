import App from '@octokit/app'
import octokit from '@octokit/rest'
import is from 'check-more-types'
import debugApi from 'debug'
import la from 'lazy-ass'

const debug = debugApi('@khulnasoft/set-commit-status')

/**
 * Url string, should start with "https://..."
 */
export type url = string

/**

 *
 * Note: returned decoded string should start with line
 * '-----BEGIN RSA PRIVATE KEY-----'
 */
const getAppPrivateKeyFromEnvVariable = (appKey: string) => {
  return Buffer.from(appKey, 'base64').toString('ascii')
}

/**
 * Creates GitHub client using personal API token or unauthenticated
 *
 * @param {string} [auth] Optional personal API token or function returning token
 * @see https://github.com/octokit/rest.js#authentication
 */
function _createGitHubClient(auth?: string | (() => Promise<string>)) {
  return new octokit({
    auth,
    userAgent: 'octokit/rest.js v16.23.2',
  })
}

export const getAppVeyorBuildUrl = () => {
  if (!process.env.APPVEYOR) {
    return
  }
  const {
    APPVEYOR_URL,
    APPVEYOR_ACCOUNT_NAME,
    APPVEYOR_PROJECT_SLUG,
    APPVEYOR_BUILD_ID,
  } = process.env
  if (
    !APPVEYOR_URL ||
    !APPVEYOR_ACCOUNT_NAME ||
    !APPVEYOR_BUILD_ID ||
    !APPVEYOR_PROJECT_SLUG
  ) {
    console.error('Hmm, cannot find build environment variables on AppVeyor CI')
    return
  }
  return `${APPVEYOR_URL}/project/${APPVEYOR_ACCOUNT_NAME}/${APPVEYOR_PROJECT_SLUG}/builds/${APPVEYOR_BUILD_ID}`
}

/**
 * Returns the current build job url based on built-in environment variables on various CIs
 * @see CircleCI https://circleci.com/docs/2.0/env-vars/
 * @see AppVeyor https://www.appveyor.com/docs/environment-variables/
 */
export const getTargetUrl = () =>
  process.env.CIRCLE_BUILD_URL || getAppVeyorBuildUrl()

export namespace GitHub {
  /**
   * Full commit SHA (40 hex characters, lowercase)
   */
  export type SHA = string
  /**
   * Commit status state
   */
  export enum StatusState {
    error = 'error',
    failure = 'failure',
    pending = 'pending',
    success = 'success',
  }

  export function createApp(appId: string, appKey: string) {
    const privateKey = getAppPrivateKeyFromEnvVariable(appKey)
    return new App({ id: appId, privateKey })
  }

  type InstallationParameters = {
    appId: string
    installationId: number
    appKey: string
  }

  export function getFromEnvironment(): InstallationParameters {
    la(is.unemptyString(process.env.GH_APP_ID), 'missing GH_APP_ID')
    const appId = process.env.GH_APP_ID!

    const installId = process.env.GH_INSTALLATION_ID
    la(is.unemptyString(installId), 'missing GH_INSTALLATION_ID')
    const installationId = parseInt(installId!)
    la(
      is.unemptyString(process.env.GH_PRIVATE_KEY),
      'missing env variable GH_PRIVATE_KEY'
    )
    const appKey = process.env.GH_PRIVATE_KEY!

    return {
      appId,
      installationId,
      appKey,
    }
  }

  const tokenHeader = (token: string) => `token ${token}`

  /**
   * Creates GitHub rest client for a GitHub app installation
   */
  export function createGithubAppClient(params: InstallationParameters) {
    const app = createApp(params.appId, params.appKey)
    const auth = () =>
      // @ts-ignore
      app
        .getInstallationAccessToken({ installationId: params.installationId })
        .then(tokenHeader)

    return _createGitHubClient(auth)
  }

  export type CommitStatusOptions = {
    owner: string
    repo: string
    sha: string
    state: StatusState
    context: string
    targetUrl?: url
    description?: string
  }

  export async function setCommitStatus(
    options: CommitStatusOptions,
    gh: octokit
  ) {
    debug('setting commit status %o', options)

    let targetUrl = options.targetUrl || getTargetUrl()
    const ghOptions = {
      owner: options.owner,
      repo: options.repo,
      sha: options.sha,
      state: options.state || StatusState.pending,
      target_url: targetUrl,
      description: options.description,
      context: options.context,
    }
    debug('resolved commit status options %o', ghOptions)

    // https://octokit.github.io/rest.js/#api-Repos-createStatus
    await gh.repos.createStatus(ghOptions)

    debug(
      'created commit status: %s/%s sha %s state %s',
      ghOptions.owner,
      ghOptions.repo,
      ghOptions.sha,
      ghOptions.state
    )
    if (ghOptions.target_url) {
      debug('with details at %s', ghOptions.target_url)
    }
  }
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
export async function setCommitStatus(options: GitHub.CommitStatusOptions) {
  const params = GitHub.getFromEnvironment()
  const gh = GitHub.createGithubAppClient(params)
  await GitHub.setCommitStatus(options, gh)
}