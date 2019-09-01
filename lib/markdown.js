const header = o => `# ${o.ts.toString().slice(0, 15)}`

const activityTables = (db, group) => {
  let lines = []

  for (let [type, cells] of Object.entries(db)) {
    if (type === 'public' && group === 'repo') continue
    if (cells.length < 10) continue
    lines.push(`#### ${type}`)
    lines.push(`| ${group} | count |`)
    lines.push(`| ---- | ----- |`)
    for (let cell of cells) {
      let [name, value] = cell 
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

const fullPage = o => `${header(o)}



## Top Charts

### Activity (Users)
${activityTables(o.reg.activity.user, 'user')}

### Activity (Bots)
${activityTables(o.reg.activity.bot, 'bot')}

### Activity (Repos)
${activityTables(o.reg.activity.repo, 'repo')}
`

const create = async (reg, ts) => {
  const o = {ts, reg}
  console.log(reg.all)
  return fullPage(o)
}

module.exports = create
