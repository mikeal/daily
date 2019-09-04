const fs = require('fs')
const zlib = require('zlib')
const min = require('min-gharchive')
const regression = require('./regression')
const markdown = require('./markdown')
const languages = require('./languages')

const onehour = 1000 * 60 * 60
const now = Date.now() - (onehour * 3) // set back 3 hours

const fileString = ts => {
  const year = ts.getUTCFullYear()
  const month = (ts.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = ts.getUTCDate().toString().toString().padStart(2, '0')
  const hour = ts.getUTCHours()
  const name = `${year}-${month}-${day}-${hour}.json.gz`
  return name
}

const hours = function * (str) {
  for (let i = 0; i < 24; i++) {
    yield str + '-' + i
  }
}

const fileExists = async path => {
  try {
    await fs.promises.stat(path)
    return true
  } catch (e) {
    if (e.errno !== -2) throw e
  }
  return false
}

const dataDir = __dirname + '/../data/'

const pullHour = async (dt, filename) => {
  const lines = []
  const repos = new Set()
  for await (const event of min(dt)) {
    if (event.repo) repos.add(event.repo)
    lines.push(JSON.stringify(event))
  }
  fs.writeFileSync(filename, zlib.gzipSync(lines.join('\n') + '\n'))
  return repos
}

const pull = async () => {
  let start = now - ((onehour * 24) * 2)
  let skips = 0
  while (start < now) {
    const dt = new Date(start)
    const filename = dataDir + 'min/' + fileString(dt)
    if (await fileExists(filename)) {
      skips += 1
    } else {
      console.log('fetching', fileString(dt))
      const repos = await pullHour(dt, filename)
      console.log(repos.size, 'unique repos')
      const lang = languages()
      await lang.add(Array.from(repos))
      await lang.save()
    }
    start += onehour
  }
  console.log('saving langs')
  console.log('skipped', skips)
}

const checkRegression = async day => {
  const filename = dataDir + 'reg/' + day + '.json.gz'
  if (await fileExists(filename)) {
  } else {
    day = new Date(day)
    const results = await regression(dataDir + 'min', day)
    fs.writeFileSync(filename, zlib.gzipSync(JSON.stringify(results)))
  }
  return filename
}

const reg2markdown = f => f.replace('/data/reg/', '/archive/').replace('json.gz', 'mk')

const regs = async () => {
  const files = await fs.promises.readdir(dataDir + 'min')
  const days = {}
  for (const file of files) {
    const key = file.slice(0, 10)
    if (!days[key]) days[key] = []
    days[key].push(file)
  }
  const regressions = []
  for (const [day, files] of Object.entries(days)) {
    if (files.length === 24) {
      regressions.push(await checkRegression(day))
    }
  }
  let skips = 0
  for (const filename of regressions) {
    const m = reg2markdown(filename)
    if (await fileExists(m)) {
      skips += 1
    } else {
      const reg = JSON.parse(zlib.gunzipSync(fs.readFileSync(filename)).toString())
      const ts = new Date(filename.slice(filename.length - 18, filename.length - '.json.gz'.length))
      const mk = await markdown(reg, ts)
      console.log('writing', m)
      fs.writeFileSync(m, mk)
    }
  }
}

const ensureLatest = async () => {
  const archive = __dirname + '/../archive'
  const files = (await fs.promises.readdir(archive)).sort()
  const last = files[files.length - 1]
  fs.writeFileSync(__dirname + '/../README.md', fs.readFileSync(archive + '/' + last))
}

const main = async () => {
  await pull()
  await regs()
  await ensureLatest()
}

module.exports = main
