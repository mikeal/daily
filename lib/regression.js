const JSONStream = require('json-stream')
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

const isBot = actor => {
  if (actor.endsWith('[bot]')) return true
  if (actor.endsWith('-bot')) return true
  return false
}

class Results {
  constructor () {
    this.data = {}
    this.all = {}
    this.byAge = []
  }

  increment (...keys) {
    let o = this[keys.shift()]
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
    // TODO: count unique actors and repos
    this.increment('all', 'all-activity')
    this.increment('all', 'activity', event.type)
    if (isBot(event.actor)) {
      this.increment('data', 'activity', 'bot', event.type, event.actor)
    } else {
      this.increment('data', 'activity', 'user', event.type, event.actor)
    }
    this.increment('data', 'activity', 'repo', event.type, event.repo)
    if (event.action) {
      this.increment('all', 'actions', event.type, event.action)
      if (isBot(event.actor)) {
        this.increment('data', 'actions', 'bot', event.type, event.action, event.actor)
      } else {
        this.increment('data', 'actions', 'user', event.type, event.action, event.actor)
      }
      this.increment('data', 'actions', 'repo', event.type, event.action, event.repo)
    }
    if (event.age) {
      const byAge = this.byAge
      byAge.push([new Date(event.age), event])
    }
    this.byAge = this.byAge.sort((x, y) => x[0] - y[0]).slice(0, 10)
  }

  _export (o) {
    const results = {}
    const key = Object.keys(o)[0]
    if (typeof o[key] === 'number') {
      return Array.from(Object.entries(o)).sort((x, y) => y[1] - x[1]).slice(0, 10)
    } else {
      for (const [key, value] of Object.entries(o)) {
        results[key] = this._export(value)
      }
    }
    return results
  }
  export () {
    const r = this._export(this.data)
    r.all = this.all
    return r
  }
}

const regression = async (basepath, ts) => {
  const year = ts.getUTCFullYear()
  const month = (ts.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = ts.getUTCDate().toString().toString().padStart(2, '0')
  const results = new Results()
  for (let i = 0; i < 24; i++) {
    const filename = `${year}-${month}-${day}-${i}.json.gz`
    console.log('reading', filename)
    const stream = fs.createReadStream(path.join(basepath, filename))
    const reader = stream.pipe(zlib.createUnzip()).pipe(JSONStream())
    for await (const event of reader) {
      results.onEvent(event)
    }
  }
  return results.export()
}

module.exports = regression
