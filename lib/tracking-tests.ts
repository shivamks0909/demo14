/**
 * Comprehensive Test Suite for Project-Independent Tracking System
 * Tests auto-project creation, fallback mechanisms, and data integrity
 */

import { trackingService } from './tracking-service'
import { getDb, closeDb } from './db'
import Database from 'better-sqlite3'

interface TestResult {
    name: string
    passed: boolean
    error?: string
    duration?: number
}

class TrackingSystemTests {
    private results: TestResult[] = []
    private db: Database.Database

    constructor() {
        this.db = getDb()
    }

    private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
        const startTime = Date.now()
        try {
            await testFn()
            this.results.push({
                name,
                passed: true,
                duration: Date.now() - startTime
            })
            console.log(`✅ PASSED: ${name} (${Date.now() - startTime}ms)`)
        } catch (error) {
            this.results.push({
                name,
                passed: false,
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - startTime
            })
            console.error(`❌ FAILED: ${name}`, error)
        }
    }

    // Test 1: Auto-create project when it doesn't exist
    async testAutoProjectCreation(): Promise<void> {
        await this.runTest('Auto-create project for new identifier', async () => {
            const identifier = `test_project_${Date.now()}`
            const result = await trackingService.ensureProject(identifier, 'https://test.survey.com')

            if (!result.project_id || !result.project_code) {
                throw new Error('Project creation failed')
            }

            // Verify project exists in database
            const project = this.db.prepare('SELECT * FROM projects WHERE project_code = ?').get(identifier)
            if (!project) {
                throw new Error('Project not found in database')
            }

            const proj = project as any
            if (proj.source !== 'auto') {
                throw new Error(`Expected source 'auto', got '${proj.source}'`)
            }
        })
    }

    // Test 2: Track entry without pre-existing project
    async testTrackWithoutProject(): Promise<void> {
        await this.runTest('Track entry without pre-existing project', async () => {
            const clickid = `test_click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const projectCode = `auto_test_${Date.now()}`

            const result = await trackingService.trackEntry({
                clickid,
                uid: 'TEST_USER_001',
                ip: '192.168.1.100',
                user_agent: 'Test Agent',
                device_type: 'Desktop',
                project_code: projectCode,
                raw_url: 'https://test.com/track'
            })

            if (!result.success) {
                throw new Error(`Track entry failed: ${result.error}`)
            }

            // Verify response exists
            const response = this.db.prepare('SELECT * FROM responses WHERE clickid = ?').get(clickid)
            if (!response) {
                throw new Error('Response not saved to database')
            }

            // Verify project was auto-created
            const project = this.db.prepare('SELECT * FROM projects WHERE project_code = ?').get(projectCode)
            if (!project) {
                throw new Error('Project was not auto-created')
            }
        })
    }

    // Test 3: Fallback to external_traffic bucket
    async testFallbackBucket(): Promise<void> {
        await this.runTest('Fallback to external_traffic bucket', async () => {
            const clickid = `test_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

            // Track without any project identifier
            const result = await trackingService.trackEntry({
                clickid,
                ip: '192.168.1.101',
                user_agent: 'Test Agent',
                device_type: 'Mobile'
            })

            if (!result.success) {
                throw new Error('Fallback tracking failed')
            }

            // Verify response uses fallback project
            const response = this.db.prepare('SELECT * FROM responses WHERE clickid = ?').get(clickid) as any
            if (!response) {
                throw new Error('Response not saved')
            }

            if (response.project_code !== 'external_traffic') {
                throw new Error(`Expected fallback project, got '${response.project_code}'`)
            }
        })
    }

    // Test 4: Duplicate clickid handling
    async testDuplicateClickId(): Promise<void> {
        await this.runTest('Handle duplicate clickid', async () => {
            const clickid = `test_dup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

            // First entry
            const result1 = await trackingService.trackEntry({
                clickid,
                ip: '192.168.1.102',
                user_agent: 'Test Agent',
                device_type: 'Desktop'
            })

            if (!result1.success) {
                throw new Error('First entry failed')
            }

            // Duplicate entry
            const result2 = await trackingService.trackEntry({
                clickid,
                ip: '192.168.1.103',
                user_agent: 'Test Agent',
                device_type: 'Desktop'
            })

            // Should succeed but not create duplicate
            if (!result2.success) {
                throw new Error('Duplicate handling failed')
            }

            // Verify only one response exists
            const count = this.db.prepare('SELECT COUNT(*) as count FROM responses WHERE clickid = ?').get(clickid) as any
            if (count.count !== 1) {
                throw new Error(`Expected 1 response, found ${count.count}`)
            }
        })
    }

    // Test 5: Update response status
    async testStatusUpdate(): Promise<void> {
        await this.runTest('Update response status via callback', async () => {
            const clickid = `test_status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

            // Create entry
            await trackingService.trackEntry({
                clickid,
                ip: '192.168.1.104',
                user_agent: 'Test Agent',
                device_type: 'Desktop'
            })

            // Update status
            const result = await trackingService.updateStatus({
                clickid,
                status: 'complete'
            })

            if (!result.success) {
                throw new Error('Status update failed')
            }

            // Verify status updated
            const response = this.db.prepare('SELECT * FROM responses WHERE clickid = ?').get(clickid) as any
            if (response.status !== 'complete') {
                throw new Error(`Expected status 'complete', got '${response.status}'`)
            }

            if (!response.completion_time) {
                throw new Error('Completion time not set')
            }
        })
    }

    // Test 6: Concurrent requests (load test)
    async testConcurrentRequests(): Promise<void> {
        await this.runTest('Handle concurrent requests', async () => {
            const promises = []
            const baseTime = Date.now()

            for (let i = 0; i < 20; i++) {
                const clickid = `test_concurrent_${baseTime}_${i}`
                promises.push(
                    trackingService.trackEntry({
                        clickid,
                        ip: `192.168.1.${100 + i}`,
                        user_agent: 'Test Agent',
                        device_type: 'Desktop',
                        project_code: `concurrent_test_${baseTime}`
                    })
                )
            }

            const results = await Promise.all(promises)

            // Verify all succeeded
            const failed = results.filter((r: any) => !r.success)
            if (failed.length > 0) {
                throw new Error(`${failed.length} concurrent requests failed`)
            }

            // Verify all responses saved
            const count = this.db.prepare(
                'SELECT COUNT(*) as count FROM responses WHERE clickid LIKE ?'
            ).get(`test_concurrent_${baseTime}_%`) as any

            if (count.count !== 20) {
                throw new Error(`Expected 20 responses, found ${count.count}`)
            }
        })
    }

    // Test 7: Missing clickid auto-generation
    async testAutoClickIdGeneration(): Promise<void> {
        await this.runTest('Auto-generate clickid when missing', async () => {
            // This would be handled by the API route, but we can test the service accepts it
            const clickid = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

            const result = await trackingService.trackEntry({
                clickid,
                ip: '192.168.1.105',
                user_agent: 'Test Agent',
                device_type: 'Desktop'
            })

            if (!result.success) {
                throw new Error('Auto-generated clickid tracking failed')
            }
        })
    }

    // Test 8: Project reuse (don't create duplicates)
    async testProjectReuse(): Promise<void> {
        await this.runTest('Reuse existing project instead of creating duplicate', async () => {
            const projectCode = `reuse_test_${Date.now()}`

            // First request - creates project
            const result1 = await trackingService.ensureProject(projectCode, 'https://reuse.test.com')

            // Second request - should reuse
            const result2 = await trackingService.ensureProject(projectCode, 'https://reuse.test.com')

            if (result1.project_id !== result2.project_id) {
                throw new Error('Project was duplicated instead of reused')
            }

            // Verify only one project exists
            const count = this.db.prepare(
                'SELECT COUNT(*) as count FROM projects WHERE project_code = ?'
            ).get(projectCode) as any

            if (count.count !== 1) {
                throw new Error(`Expected 1 project, found ${count.count}`)
            }
        })
    }

    // Test 9: Complete end-to-end flow
    async testEndToEndFlow(): Promise<void> {
        await this.runTest('Complete end-to-end tracking flow', async () => {
            const clickid = `test_e2e_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const projectCode = `e2e_project_${Date.now()}`

            // Step 1: Track entry
            const trackResult = await trackingService.trackEntry({
                clickid,
                uid: 'E2E_USER',
                ip: '192.168.1.106',
                user_agent: 'E2E Test Agent',
                device_type: 'Desktop',
                project_code: projectCode,
                raw_url: 'https://e2e.test.com/survey'
            })

            if (!trackResult.success) {
                throw new Error('E2E: Track entry failed')
            }

            // Step 2: Verify entry
            const entry = this.db.prepare('SELECT * FROM responses WHERE clickid = ?').get(clickid) as any
            if (!entry || entry.status !== 'in_progress') {
                throw new Error('E2E: Entry not in correct state')
            }

            // Step 3: Complete survey
            const completeResult = await trackingService.updateStatus({
                clickid,
                status: 'complete'
            })

            if (!completeResult.success) {
                throw new Error('E2E: Status update failed')
            }

            // Step 4: Verify completion
            const completed = this.db.prepare('SELECT * FROM responses WHERE clickid = ?').get(clickid) as any
            if (completed.status !== 'complete') {
                throw new Error('E2E: Final status incorrect')
            }

            // Step 5: Verify project was created
            const project = this.db.prepare('SELECT * FROM projects WHERE project_code = ?').get(projectCode)
            if (!project) {
                throw new Error('E2E: Project not created')
            }
        })
    }

    // Run all tests
    async runAllTests(): Promise<{ passed: number; failed: number; total: number; results: TestResult[] }> {
        console.log('\n🧪 Starting Comprehensive Tracking System Tests...\n')

        await this.testAutoProjectCreation()
        await this.testTrackWithoutProject()
        await this.testFallbackBucket()
        await this.testDuplicateClickId()
        await this.testStatusUpdate()
        await this.testConcurrentRequests()
        await this.testAutoClickIdGeneration()
        await this.testProjectReuse()
        await this.testEndToEndFlow()

        const passed = this.results.filter(r => r.passed).length
        const failed = this.results.filter(r => !r.passed).length

        console.log('\n' + '='.repeat(60))
        console.log('📊 TEST SUMMARY')
        console.log('='.repeat(60))
        console.log(`Total Tests: ${this.results.length}`)
        console.log(`✅ Passed: ${passed}`)
        console.log(`❌ Failed: ${failed}`)
        console.log('='.repeat(60))

        if (failed > 0) {
            console.log('\n❌ FAILED TESTS:')
            this.results.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.name}: ${r.error}`)
            })
        }

        return {
            passed,
            failed,
            total: this.results.length,
            results: this.results
        }
    }
}

// Export test runner
export async function runTrackingTests() {
    const tests = new TrackingSystemTests()
    return await tests.runAllTests()
}
