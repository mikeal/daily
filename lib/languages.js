const fs = require('fs')
const csv = require('csv-parser')
const { stringify } = require('csv-string')

const dbfile = __dirname + '/../data/languages.csv'

const { graphql } = require('@octokit/graphql')
const { inspect } = require('util')

const sleep = i => new Promise(resolve => setTimeout(resolve, i))

const sum = (x, y) => x + y

const query = async repos => {
  const qs = repos.map(r => `repo:${r}`).join(' ')
  const response = await graphql(
    `{ 
      search(query: "${qs} fork:true", type: REPOSITORY, first: 100) {
        repositoryCount
        nodes {
          ... on Repository {
            nameWithOwner
            languages (first: 100) {
              edges {
                node {
                  name
                }
                size
              }
            }
          }
        }
      }
      rateLimit {
        limit
        cost
        remaining
        resetAt
      }
    }
    `,
    {
      headers: {
        authorization: `token ${process.env.GHTOKEN || process.env.GITHUB_TOKEN}`
      }
    }
  )

  const { remaining, cost, resetAt } = response.rateLimit
  if ((remaining - cost) < 0) {
    console.log('sleeping')
    await sleep(((new Date(resetAt)).getTime() - Date.now()) + 1000)
  }
  // console.log(response.rateLimit)
  const results = {}

  const nodes = response.search.nodes
  for (const node of nodes) {
    const total = node.languages.edges.map(e => e.size).reduce(sum, 0)
    const value = {}
    for (const edge of node.languages.edges) {
      value[edge.node.name] = parseFloat((edge.size / total).toFixed(2))
      if (!value[edge.node.name]) delete value[edge.node.name]
    }
    results[node.nameWithOwner] = value
  }
  // console.log(inspect(nodes, { depth: Infinity }))
  return results
}

class Languages {
  constructor () {
    this.loaded = this.load()
    this.db = {}
    this.pending = {}
  }

  async load () {
    /*
     * it occurs to me that a better way to do this
     * given the usage and the size of the data,
     * is to never load it into memory and to simply
     * accept a list of repos to add, and a list of
     * repos to query. Instead of an in-memory object or
     * map/set just do a full scan before adding and
     * only support retrieval in bulk.
     */
    const reader = fs.createReadStream(dbfile).pipe(csv())
    for await (const entry of reader) {
      this.db[entry.REPO] = entry.LANG
    }
  }

  async get (keys) {
    await this.loaded
    const results = {}
    for (const key of keys) {
      const value = this.pending[key] || this.db[key] || null
      const lang = {}
      for (const entry of value.split('/')) {
        let [k, v] = entry.split(':')
        v = parseInt(v)
        lang[k] = v
      }
      results[key] = lang
    }
    return results
  }

  async add (repos) {
    await this.loaded
    const _repos = []
    for (const repo of new Set(repos)) {
      if (!this.db[repo] && !this.pending[repo]) _repos.push(repo)
    }
    while (_repos.length) {
      const bulk = _repos.splice(0, 100)
      const results = await query(bulk)
      let i = 0
      for (const [key, value] of Object.entries(results)) {
        // console.log({key, value})
        this.pending[key] = value
        i++
      }
      // TODO: check bulk for entries that didnt' return and set to null
      await this.save()
      console.log(_repos.length, 'remaining', i, 'found')
    }
  }

  async save () {
    await this.loaded
    const pending = Array.from(Object.entries(this.pending)).map(p => {
      p = p.slice()
      p[1] = Array.from(Object.entries((p[1]))).map(x => `${x[0]}:${x[1]}`).join('/')
      p[1] = p[1] || 'n:0'
      return p
    })
    const str = stringify(pending)
    // str = str.slice(0, str.length - 2)
    const fd = fs.openSync(dbfile, 'a')
    fs.writeSync(fd, str)
    fs.closeSync(fd)
    this.db = Object.assign(this.db, this.pending)
    this.pending = {}
  }
}

module.exports = () => new Languages()
