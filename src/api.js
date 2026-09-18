// -----------------------------------------------------------------------
// XML helpers
// -----------------------------------------------------------------------

/** Escape special characters so a raw value is safe to embed in XML text content. */
export function escapeXml(value) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Render a single XML element. An empty/undefined value produces a
 * self-closing tag (e.g. <trans_no/>), matching the sample payload.
 */
function tag(name, value) {
  const str = value === null || value === undefined ? '' : String(value)
  if (str === '') return `<${name}/>`
  return `<${name}>${escapeXml(str)}</${name}>`
}

/**
 * Build the <params>...</params> XML body for
 * create_genius_terminal_transaction from a plain fields object.
 */
export function buildCreateTransactionXml(fields) {
  const order = [
    'company_id',
    'cashier_code',
    'amt',
    'customer_code',
    'customer_id',
    'trans_no',
    'trans_bk',
    'tax_amt',
    'invoke_manual_entry',
    'trans_code',
    'host_id',
    'source_application'
  ]
  const body = order.map((key) => tag(key, fields[key])).join('   ')
  return `<params>   ${body} </params>`
}

/**
 * Very small generic XML -> JS object parser. Good enough for the flat/
 * shallow response shapes these two APIs return. Elements that repeat
 * under the same parent become an array.
 */
export function parseXml(xmlString) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')

  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    throw new Error('Could not parse XML response: ' + parserError.textContent.trim())
  }

  function elementToObject(el) {
    const children = Array.from(el.children)
    if (children.length === 0) {
      return el.textContent.trim()
    }
    const result = {}
    for (const child of children) {
      const value = elementToObject(child)
      if (Object.prototype.hasOwnProperty.call(result, child.tagName)) {
        if (!Array.isArray(result[child.tagName])) {
          result[child.tagName] = [result[child.tagName]]
        }
        result[child.tagName].push(value)
      } else {
        result[child.tagName] = value
      }
    }
    return result
  }

  const root = doc.documentElement
  return { [root.tagName]: elementToObject(root) }
}

/**
 * Flatten a parsed XML object one level deep into {tag: value} pairs,
 * for the common case of a single wrapper -> single record -> flat fields.
 * Falls back gracefully for shapes that don't match.
 */
export function flattenFirstRecord(parsed) {
  const rootKey = Object.keys(parsed)[0]
  let node = parsed[rootKey]
  // Drill down through single-child wrapper objects until we hit a flat
  // object (all values are strings) or run out of nested objects.
  const visited = []
  while (node && typeof node === 'object' && !Array.isArray(node)) {
    const keys = Object.keys(node)
    const allFlat = keys.every((k) => typeof node[k] === 'string')
    if (allFlat) {
      return { path: [rootKey, ...visited], fields: node }
    }
    if (keys.length === 1) {
      visited.push(keys[0])
      node = node[keys[0]]
    } else {
      break
    }
  }
  return { path: [rootKey, ...visited], fields: null, raw: node }
}

// -----------------------------------------------------------------------
// API calls
// -----------------------------------------------------------------------

/**
 * POST the create_genius_terminal_transaction request.
 * Returns { requestXml, responseText, parsed, flattened }.
 */
export async function createGeniusTerminalTransaction(apiUrl, fields) {
  const requestXml = buildCreateTransactionXml(fields)

  let response
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml'
      },
      body: requestXml
    })
  } catch (err) {
    throw new NetworkError(err, apiUrl)
  }

  const responseText = await response.text()

  if (!response.ok) {
    const err = new Error(`Request failed with HTTP ${response.status} ${response.statusText}`)
    err.status = response.status
    err.responseText = responseText
    err.requestXml = requestXml
    throw err
  }

  let parsed = null
  let flattened = null
  try {
    parsed = parseXml(responseText)
    flattened = flattenFirstRecord(parsed)
  } catch (e) {
    // leave parsed/flattened null; caller can still show responseText
  }

  return { requestXml, responseText, parsed, flattened }
}

/**
 * GET the terminal (POS device) status endpoint for a given transport key.
 * Returns { requestUrl, responseText, parsed, flattened }.
 */
export async function checkTerminalStatus({ host, port, transportKey, format }) {
  const base = `http://${host}${port ? ':' + port : ''}/v2/pos`
  const params = new URLSearchParams({
    TransportKey: transportKey,
    Format: format || 'XML'
  })
  const requestUrl = `${base}?${params.toString()}`

  let response
  try {
    response = await fetch(requestUrl, { method: 'GET' })
  } catch (err) {
    throw new NetworkError(err, requestUrl)
  }

  const responseText = await response.text()

  if (!response.ok) {
    const err = new Error(`Request failed with HTTP ${response.status} ${response.statusText}`)
    err.status = response.status
    err.responseText = responseText
    err.requestUrl = requestUrl
    throw err
  }

  let parsed = null
  let flattened = null
  try {
    parsed = parseXml(responseText)
    flattened = flattenFirstRecord(parsed)
  } catch (e) {
    // leave parsed/flattened null; caller can still show responseText
  }

  return { requestUrl, responseText, parsed, flattened }
}

/**
 * A thin wrapper that tags a raw fetch failure ("Failed to fetch") with
 * the URL that was attempted, so the UI can surface a useful hint about
 * CORS / mixed-content / unreachable-host causes.
 */
export class NetworkError extends Error {
  constructor(originalError, url) {
    super(originalError && originalError.message ? originalError.message : 'Network request failed')
    this.name = 'NetworkError'
    this.url = url
    this.original = originalError
  }
}
