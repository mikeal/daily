const JSONStream = require('json-stream')
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

class Results {
  constructor () {
    this.data = {}
    this.byAge = []
  }

  increment (...keys) {
    let o = this.data
    while (keys.length) {
      const key = keys.shift()
      const last = !keys.length
      if (last) {
        if (!o[key]) o[key] = 0
        o[key] += 1
      } else {
        if (!o[key]) o[key] = {}
        o = o[key]
      }
    }
  }

  onEvent (event) {
    this.increment('activity', 'actor', event.type, event.actor)
    this.increment('activity', 'repo', event.type, event.repo)
    if (event.action) {
      this.increment('actions', 'actor', event.type, event.action, event.actor)
      this.increment('actions', 'repo', event.type, event.action, event.repo)
    }
    if (event.age) {
      const byAge = this.byAge
      byAge.push([new Date(event.age), event])
    }
    this.byAge = this.byAge.sort((x, y) => x[0] - y[0]).slice(0, 10)
  }

  export (o) {
    if (!o) o = this.data
    const results = {}
    const key = Object.keys(o)[0]
    if (typeof o[key] === 'number') {
      return Array.from(Object.entries(o)).sort((x, y) => y[1] - x[1]).slice(0, 10)
    } else {
      for (const [key, value] of Object.entries(o)) {
        results[key] = this.export(value)
      }
    }
    return results
  }
}

const regression = async (basepath, ts) => {
  const year = ts.getUTCFullYear()
  const month = (ts.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = ts.getUTCDate().toString().toString().padStart(2, '0')
  const results = new Results()
  for (let i = 0; i < 24; i++) {
    const filename = `${year}-${month}-${day}-${i}.json.gz`
    console.log(filename)
    const stream = fs.createReadStream(path.join(basepath, filename))
    const reader = stream.pipe(zlib.createUnzip()).pipe(JSONStream())
    for await (const event of reader) {
      results.onEvent(event)
    }
  }
  return results.export()
}

module.exports = regression
