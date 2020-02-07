const bent = require('bent')
const qs = require('querystring')

const defaultToken = process.env.MAILCHIMP_TOKEN

const send = async (title, body, token = defaultToken) => {
  const auth = 'Basic ' + Buffer.from('mikealrogers0' + ':' + token).toString('base64')
  const opts = ['json', 'https://us4.api.mailchimp.com/3.0', { Authorization: auth }]
  const post = bent('POST', ...opts)
  const postString = bent('POST', 204, 'string', ...opts.slice(1))
  const put = bent('PUT', ...opts)
  const data = {
    recipients: {
      list_id: 'a6986c3a9d'
      // , segment_opts: {
      //   segment_id: 1638111
      // }
    },
    type: 'regular',
    settings: {
      subject_line: title,
      reply_to: 'mikeal.rogers+ossdaily@gmail.com',
      from_name: 'Daily OSS'
    }
  }
  let resp
  resp = await post('/campaigns', data)
  const id = resp.id

  const content = {
    html: body
  }
  resp = await put(`/campaigns/${id}/content`, content)
  resp = await postString(`/campaigns/${id}/actions/send`, {})
  return true
}

module.exports = send
