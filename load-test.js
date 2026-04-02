#!/usr/bin/env node

/**
 * Load Testing - Concurrent Requests Performance Test
 * Tests the system's ability to handle multiple simultaneous requests
 */

const http = require('http')
const { performance } = require('perf_hooks')

const BASE_URL = 'http://localhost:3000'
const CONCURRENT_REQUESTS = 10
const TOTAL_REQUESTS = 50

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const startTime = performance.now()

    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'LoadTest/1.0'
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        const duration = performance.now() - startTime
        resolve({
          status: res.statusCode,
          duration,
          size: data.length
        })
      })
    })

    req.on('error', reject)
    req.setTimeout(10000)
    req.end()
  })
}

async function runLoadTest() {
  console.log(`\n🚀 LOAD TESTING`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Concurrent: ${CONCURRENT_REQUESTS} workers`)
  console.log(`Total Requests: ${TOTAL_REQUESTS}`)
  console.log('='.repeat(60))

  const results = []
  const errors = []

  // Create batches
  const batchSize = Math.ceil(TOTAL_REQUESTS / CONCURRENT_REQUESTS)
  let totalDuration = 0

  for (let batch = 0; batch < batchSize; batch++) {
    const batchStart = performance.now()
    const batchRequests = []

    // Launch concurrent requests for this batch
    for (let i = 0; i < CONCURRENT_REQUESTS && (batch * CONCURRENT_REQUESTS + i) < TOTAL_REQUESTS; i++) {
      const requestId = batch * CONCURRENT_REQUESTS + i + 1
      const uid = `LOADTEST_${Date.now()}_${requestId}`
      const path = `/r/TEST_SINGLE/DYN01/${uid}`

      batchRequests.push(
        makeRequest(path).then(result => {
          results.push({ requestId, ...result })
        }).catch(err => {
          errors.push({ requestId, error: err.message })
        })
      )
    }

    await Promise.all(batchRequests)
    batchDuration = performance.now() - batchStart
    totalDuration += batchDuration

    const completed = Math.min((batch + 1) * CONCURRENT_REQUESTS, TOTAL_REQUESTS)
    console.log(`Batch ${batch + 1}/${batchSize}: ${completed}/${TOTAL_REQUESTS} completed (${batchDuration.toFixed(0)}ms)`)
  }

  // Analyze results
  const successes = results.filter(r => r.status === 302 || r.status === 200)
  const failures = results.filter(r => r.status !== 302 && r.status !== 200)
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
  const maxDuration = Math.max(...results.map(r => r.duration))
  const minDuration = Math.min(...results.map(r => r.duration))

  console.log('\n' + '='.repeat(60))
  console.log('LOAD TEST RESULTS')
  console.log('='.repeat(60))
  console.log(`Total Requests:  ${TOTAL_REQUESTS}`)
  console.log(`Successful:      ${successes.length} (${((successes.length/TOTAL_REQUESTS)*100).toFixed(1)}%)`)
  console.log(`Failed:          ${failures.length + errors.length}`)
  console.log(`Avg Response:    ${avgDuration.toFixed(2)}ms`)
  console.log(`Min Response:    ${minDuration.toFixed(2)}ms`)
  console.log(`Max Response:    ${maxDuration.toFixed(2)}ms`)
  console.log(`Total Duration:  ${totalDuration.toFixed(0)}ms`)
  console.log(`Throughput:      ${(TOTAL_REQUESTS / (totalDuration/1000)).toFixed(2)} req/sec`)
  console.log('='.repeat(60))

  if (failures.length > 0) {
    console.log('\nFailure Status Codes:')
    const statusGroups = {}
    failures.forEach(f => {
      statusGroups[f.status] = (statusGroups[f.status] || 0) + 1
    })
    Object.entries(statusGroups).forEach(([status, count]) => {
      console.log(`  HTTP ${status}: ${count} requests`)
    })
  }

  if (errors.length > 0) {
    console.log('\nErrors:', errors.length)
    errors.forEach(e => console.log(`  Request ${e.requestId}: ${e.error}`))
  }

  // Database check after load test
  console.log('\n📊 Checking database after load test...')
  const { execSync } = require('child_process')
  try {
    const dbPath = './data/test_local.db'
    const cmd = `node -e "const db = require('better-sqlite3')('${dbPath}'); const count = db.prepare('SELECT COUNT(*) as c FROM responses').get().c; console.log('Total responses in DB:', count); db.close();"`
    const output = execSync(cmd, { encoding: 'utf-8' }).trim()
    console.log(`   ${output}`)
  } catch (e) {
    console.log(`   Could not query DB: ${e.message}`)
  }

  console.log('\n✅ Load test complete!')
}

runLoadTest().catch(err => {
  console.error('Load test failed:', err)
  process.exit(1)
})
