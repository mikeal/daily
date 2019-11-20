const header = o => `# ${o.ts.toString().slice(0, 15)}`
const _ago = require('s-ago')
const getRepoInfo = require('./get-repo-info')
const ago = (...args) => _ago(...args).replace(' ago', ' old')

const activityTables = (db, group) => {
  const lines = []

  for (const [type, cells] of Object.entries(db)) {
    if (type === 'public' && group === 'repo') continue
    if (cells.length < 10) continue
    lines.push(`#### ${type}`)
    lines.push(`| ${group} | count |`)
    lines.push('| ---- | ----- |')
    for (const cell of cells) {
      const [name, value] = cell
      if (group === 'repo') {
        lines.push(`| [${name}](https://github.com/${name}) | ${value} |`)
      } else {
        lines.push(`| [@${name}](https://github.com/${name}) | ${value} |`)
      }
    }
    lines.push('')
  }
  return lines.join('\n')
}

/* sample of o.reg.unique.actions
actions: {
  icomment: { created: 95418 },
  issue: { opened: 25731, closed: 16806, reopened: 731 },
  pr: { opened: 74553, closed: 56629, reopened: 550 },
  prcomment: { created: 30438 },
  watch: { started: 119295 },
  release: { published: 6521 },
  member: { added: 4587 }
}
*/

const summarySentence = (reg, part, ...keys) => {
  const _get = o => {
    for (const key of keys) {
      o = o[key]
    }
    return o
  }
  const count = _get(reg.all.actions).toLocaleString()
  const userCount = _get(reg.unique.actions.user).toLocaleString()
  const botCount = _get(reg.unique.actions.bot).toLocaleString()
  const repoCount = _get(reg.unique.actions.repo).toLocaleString()

  return `${count} ${part} by ${userCount} users and ${botCount} bots in ${repoCount} repositories`
}

const watchers = w => {
  const [repo, count] = w
  return `${count} users starred [${repo}](https://github.com/${repo})`
}

const starString = (stars, info) => {
  const increase = Math.round((stars / (info.stargazers.totalCount - stars)) * 100)
  return `**:star:${ stars }(+${ increase }%)**`
}
const starsTable = watches => detailTable(watches, ':page_with_curl:', starString)

const detailTable = async (watches, emoji, starString=s=>`**${s}**`) => {
  let results = await getRepoInfo(watches.map(([repo]) => repo))
  const db = {}
  for (let result of results) {
    db[result.nameWithOwner] = result
  }

  let lines = [`| ${ emoji } | :calendar: | :page_with_curl: |`]
  lines.push(`| :--- | :--- | :--- |`)
  for (const [repo, stars] of watches) {
    /*
    {
      createdAt: '2019-08-13T22:51:31Z',
      description: 'A High-Quality Real Time Upscaler for Anime Video',
      forkCount: 635,
      primaryLanguage: { name: 'GLSL' },
      nameWithOwner: 'bloc97/Anime4K',
      stargazers: { totalCount: 7937 }
    }
    */
    const info = db[repo]

    if (!info) continue
    let line = ''
    line += `| ${ starString(stars, info) }<br>:twisted_rightwards_arrows:${ info.forkCount } `
    line += `| **${ info.primaryLanguage ? info.primaryLanguage.name : 'Not Code' }**<br>`
    line += `${ ago(new Date(info.createdAt)) } `
    line += `| **[${ repo }](https://github.com/${ repo })**<br>`
    line += `${ info.description } `
    line += `|`
    lines.push(line)
  }
  return lines.join('\n')
}

const fullPage = async o => `${header(o)}

Across all of GitHub ${o.reg.unique.actions.user.watch.started.toLocaleString()} users stared 
${o.reg.unique.actions.repo.watch.started.toLocaleString()} repositories. 

${await starsTable(o.reg.activity.repo.watch)}

There were ${summarySentence(o.reg, 'comments on issues', 'icomment', 'created')}.
${summarySentence(o.reg, 'new issues were opened', 'issue', 'opened')}.
${summarySentence(o.reg, 'issues were closed', 'issue', 'closed')}.

${ await detailTable(o.reg.activity.repo.icomment, ':speech_balloon:') }

There were ${summarySentence(o.reg, 'comments made on pull requests', 'prcomment', 'created')}.
${summarySentence(o.reg, 'new pull requests were opened', 'pr', 'opened')}.
${summarySentence(o.reg, 'pull requests were closed', 'pr', 'closed')}.

${ await detailTable(o.reg.activity.repo.prcomment, ':speech_balloon:') }

There were ${ o.reg.all.activity.ccomment } commit comments on ${ o.reg.unique.activity.repo.ccomment } repos.

${ await detailTable(o.reg.activity.repo.prcomment, ':speech_balloon:') }

`

const create = async (reg, ts) => {
  const o = { ts, reg }
  return fullPage(o)
}

module.exports = create
