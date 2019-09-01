
const header = o => `# ${o.ts.toString().slice(0, 15)}`

const activityTable = (db, repo=false) => {
  let lines = []
  let types = Object.keys(db)
  lines.push('| ' + types.join(' | ') + ' |')
  lines.push('| ' + types.map(() => '---').join(' | ') + ' |')

  for (let i = 0; i < 10; i++) {
    let line = '|'
    for (let key of Object.keys(db)) {
      let [name, value] = db[key][i]
      if (repo) {
        line += ` [${name}](https://github.com/${name}) (${value})`
      } else {
        line += ` @${name} (${value}) |`
      }
    }
    lines.push(line)
  }
  return lines.join('\n')
}

const fullPage = o => `${header(o)}

## Top Charts

### Activity (Users)
${activityTable(o.reg.activity.actor)}

### Activity (repo)
${activityTable(o.reg.activity.repo, true)}
`

const create = async (reg, ts) => {
  const o = {ts, reg}
  return fullPage(o)
}

module.exports = create
