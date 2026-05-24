const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash'

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) {
        reject(new Error('Request too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('Invalid JSON'))
      }
    })
    req.on('error', reject)
  })
}

async function verifyFirebaseToken(idToken) {
  const firebaseKey = process.env.FIREBASE_API_KEY || process.env.VITE_FB_API_KEY
  if (!firebaseKey) throw new Error('Missing Firebase API key')

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  if (!response.ok) return null
  const json = await response.json()
  return json.users?.[0]?.localId || null
}

function buildPrompt(payload) {
  return [
    'You are a practical health tracking coach for a Thai user.',
    'Analyze only the provided nutrition, water, sleep, and workout data.',
    'Do not diagnose disease. Do not give medical claims. Keep it concise and actionable.',
    'Return valid JSON only with these keys: summary (string), wins (string[]), risks (string[]), actions (string[]).',
    'Use Thai language. Be direct, kind, and specific. Mention foods that drove calories/protein when relevant.',
    '',
    JSON.stringify(payload),
  ].join('\n')
}

function normalizeResult(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  return {
    summary: String(parsed.summary || ''),
    wins: Array.isArray(parsed.wins) ? parsed.wins.map(String).slice(0, 5) : [],
    risks: Array.isArray(parsed.risks) ? parsed.risks.map(String).slice(0, 5) : [],
    actions: Array.isArray(parsed.actions) ? parsed.actions.map(String).slice(0, 5) : [],
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) {
      sendJson(res, 503, { error: 'Analysis API is not configured yet.' })
      return
    }

    const auth = req.headers.authorization || ''
    const idToken = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
    const uid = idToken ? await verifyFirebaseToken(idToken) : null
    if (!uid) {
      sendJson(res, 401, { error: 'Sign in required.' })
      return
    }

    const body = await readBody(req)
    if (body.uid !== uid) {
      sendJson(res, 403, { error: 'Forbidden.' })
      return
    }

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(body) }] }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!geminiResponse.ok) {
      const detail = await geminiResponse.text()
      throw new Error(`Gemini request failed: ${detail}`)
    }

    const json = await geminiResponse.json()
    const text = json.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || ''
    const result = normalizeResult(text)
    sendJson(res, 200, result)
  } catch (error) {
    console.error('[analysis]', error)
    sendJson(res, 500, { error: 'Analysis failed. Try again.' })
  }
}
