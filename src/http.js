'use strict'

/**
 * Minimal HTTP client replacing request-promise (deprecated + vulnerable: pulls in
 * request/tough-cookie/qs/uuid with known CVEs). Uses Node's native https/http —
 * zero dependencies. Because it is Node http (not a browser fetch/XHR), it does NOT
 * trigger CORS in an Electron renderer, preserving the original library's behaviour.
 *
 * Implements only the subset of request-promise(options) that opentimestamps uses:
 *   options.url      string | URL
 *   options.method   'GET' | 'POST'        (default GET)
 *   options.headers  object
 *   options.body     Buffer | string
 *   options.timeout  milliseconds
 *   options.encoding null  -> resolve a Buffer (binary); otherwise resolve a string
 *   options.json     true  -> JSON.parse the response and resolve the object
 *
 * Errors are shaped like request-promise's (err.statusCode, err.error) so existing
 * .catch handlers (e.g. `err.statusCode === 404`, `err.error.toString()`) keep working.
 */

const https = require('https')
const http = require('http')
const { URL } = require('url')

module.exports = function requestPromise (options) {
  return new Promise((resolve, reject) => {
    let url
    try {
      url = new URL(options.url.toString())
    } catch (e) {
      return reject(e)
    }
    const lib = url.protocol === 'http:' ? http : https
    const headers = Object.assign({}, options.headers)

    let bodyBuf
    if (options.body !== undefined && options.body !== null) {
      bodyBuf = Buffer.isBuffer(options.body) ? options.body : Buffer.from(options.body)
      if (headers['Content-Length'] === undefined) {
        headers['Content-Length'] = bodyBuf.length
      }
    }

    const req = lib.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        const buf = Buffer.concat(chunks)
        const status = res.statusCode || 0
        if (status >= 400) {
          const err = new Error('HTTP ' + status)
          err.statusCode = status
          err.error = buf.toString()
          return reject(err)
        }
        if (options.encoding === null) {
          return resolve(buf) // binary (calendar proofs)
        }
        const text = buf.toString('utf8')
        if (options.json) {
          try {
            return resolve(JSON.parse(text))
          } catch (e) {
            return reject(e)
          }
        }
        return resolve(text)
      })
    })

    req.on('error', err => {
      if (err.error === undefined) {
        err.error = err.message
      }
      reject(err)
    })

    if (options.timeout) {
      req.setTimeout(options.timeout, () => {
        req.destroy(new Error('ETIMEDOUT'))
      })
    }

    if (bodyBuf) {
      req.write(bodyBuf)
    }
    req.end()
  })
}
