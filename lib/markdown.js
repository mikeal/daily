const header = o => `# ${o.ts.toString().slice(0, 15)}`

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
  return `${count} users watched [${repo}](https://github.com/${repo})`
}

const fullPage = o => `${header(o)}

Across all of GitHub ${o.reg.unique.actions.user.watch.started.toLocaleString()} users watched 
${o.reg.unique.actions.repo.watch.started.toLocaleString()} repositories. 
${o.reg.activity.repo.watch.slice(0, 4).map(watchers).join(', ')}, and 
${watchers(o.reg.activity.repo.watch[4])}.

There were ${summarySentence(o.reg, 'comments on issues', 'icomment', 'created')}.
${summarySentence(o.reg, 'new issues were opened', 'issue', 'opened')}.
${summarySentence(o.reg, 'issues were closed', 'issue', 'closed')}.

An additional ${summarySentence(o.reg, 'comments were made on pull requests', 'prcomment', 'created')}.
${summarySentence(o.reg, 'new pull requests were opened', 'pr', 'opened')}.
${summarySentence(o.reg, 'pull requests were closed', 'pr', 'closed')}.

## Top Charts

### Activity (Users)
${activityTables(o.reg.activity.user, 'user')}

### Activity (Bots)
${activityTables(o.reg.activity.bot, 'bot')}

### Activity (Repos)
${activityTables(o.reg.activity.repo, 'repo')}
`

const create = async (reg, ts) => {
  const o = { ts, reg }
  return fullPage(o)
}

module.exports = create
