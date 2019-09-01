
const header = o => `# ${o.ts.toString().slice(0, 15)}`

const activityTables = (db, repo=false) => {
  let lines = []

  for (let [type, cells] of Object.entries(db)) {
    lines.push(`#### ${type}`)
    lines.push(`| user | count |`)
    lines.push(`| ---- | ----- |`)
    for (let cell of cells) {
      let [name, value] = cell 
      if (repo) {
        lines.push(`| [${name}](https://github.com/${name}) | ${value} |`)
      } else {
        lines.push(`| [@${name}](https://github.com/${name}) | ${value} |`)
      }
    }
    lines.push('')
  }
  return lines.join('\n')
}

const fullPage = o => `${header(o)}

## Top Charts

### Activity (Users)
${activityTables(o.reg.activity.actor)}

### Activity (repo)
${activityTables(o.reg.activity.repo, true)}
`

const create = async (reg, ts) => {
  const o = {ts, reg}
  return fullPage(o)
}

module.exports = create
