/**
 * 브라우저 직접 호출 가능 여부 사전 점검 (API 키 불필요).
 * 브라우저가 보낼 CORS preflight(OPTIONS)를 흉내 내어 응답 헤더를 확인한다.
 * 한계: 실제 브라우저 동작의 최종 확인은 배포 URL에서 진단 1회로 해야 한다.
 *
 * 실행: node qa/check-cors.mjs [model]
 */
const model = process.argv[2] || 'gemini-3.1-flash-lite'
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
const origin = 'https://soseofit.example.app'

const res = await fetch(url, {
  method: 'OPTIONS',
  headers: {
    Origin: origin,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type,x-goog-api-key',
  },
})

const h = (k) => res.headers.get(k)
const allowOrigin = h('access-control-allow-origin')
const allowHeaders = (h('access-control-allow-headers') || '').toLowerCase()
const allowMethods = (h('access-control-allow-methods') || '').toUpperCase()

console.log(`OPTIONS ${url}`)
console.log(`status                       : ${res.status}`)
console.log(`access-control-allow-origin  : ${allowOrigin}`)
console.log(`access-control-allow-methods : ${h('access-control-allow-methods')}`)
console.log(`access-control-allow-headers : ${h('access-control-allow-headers')}`)

const originOk = allowOrigin === '*' || allowOrigin === origin
const headersOk = allowHeaders.includes('x-goog-api-key') || allowHeaders === '*'
const methodOk = allowMethods.includes('POST') || allowMethods === '*'
const ok = res.status < 300 && originOk && headersOk && methodOk
console.log(`\n판정: origin=${originOk} headers(x-goog-api-key)=${headersOk} method(POST)=${methodOk} -> ${ok ? 'CORS 통과' : 'CORS 문제 가능성'}`)
process.exit(ok ? 0 : 1)
