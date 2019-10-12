const { graphql } = require('@octokit/graphql')


const query = async repos => {
  const qs = repos.map(r => `repo:${r}`).join(' ')
  const response = await graphql(
    `{
      search(query: "${qs} fork:true", type: REPOSITORY, first: 100) {
        repositoryCount
        nodes {
          ... on Repository {
            createdAt
            description
            forkCount
            primaryLanguage {
              name
            }
            nameWithOwner
            stargazers {
              totalCount
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
  return response.search.nodes
}

module.exports = query
