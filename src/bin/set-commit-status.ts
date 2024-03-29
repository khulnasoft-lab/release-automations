#!/usr/bin/env node

import arg from 'arg'
import { GitHub } from '../'

const args = arg({
  // repo info
  '--owner': String,
  '--repo': String,
  '--sha': String,
  // status info
  '--state': String,
  '--description': String,
  '--url': String,
  '--context': String,
})

if (!args['--owner']) {
  console.error('Missing --owner name')
  process.exit(1)
}

if (!args['--repo']) {
  console.error('Missing --repo name')
  process.exit(1)
}

if (!args['--sha']) {
  console.error('Missing --sha')
  process.exit(1)
}

async function setCommitStatus() {
  const params = GitHub.getFromEnvironment()
  const gh = GitHub.createGithubAppClient(params)

  const state =
    (args['--state'] as GitHub.StatusState) || GitHub.StatusState.pending

  await GitHub.setCommitStatus(
    {
      owner: args['--owner']!,
      repo: args['--repo']!,
      sha: args['--sha']!,
      context: args['--context']!,
      description: args['--description'],
      targetUrl: args['--url'],
      state,
    },
    gh
  )
}

setCommitStatus().catch((e) => {
  console.error(e.message)
  process.exit(2)
})