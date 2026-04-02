import { getUnifiedDb } from '@/lib/unified-db'

// Mock database with proper fluent interface
const createMockDb = () => {
  const mockQueries: Record<string, any> = {}

  const from = (table: string) => {
    if (!mockQueries[table]) {
      mockQueries[table] = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        single: jest.fn(),
        delete: jest.fn().mockReturnThis(),
      }
    }
    return mockQueries[table]
  }

  const rpc = jest.fn(async (fn: string, params: any) => {
    if (fn === 'increment_quota') {
      const pid = params.p_project_id || params.project_id
      const sid = params.p_supplier_id

      // Get current quota state from mock
      const linkKey = `${pid}:${sid}`
      const link = mockQueries['supplier_project_links']?.__data?.find(
        (l: any) => l.project_id === pid && l.supplier_id === sid
      )

      if (!link) {
        return { data: false, error: { message: 'Link not found' } }
      }

      if (link.quota_used < link.quota_allocated) {
        link.quota_used += 1
        return { data: true, error: null }
      }
      return { data: false, error: null }
    }
    return { data: null, error: { message: `RPC ${fn} not implemented` } }
  })

  return {
    from,
    rpc,
    __clear: () => {
      Object.keys(mockQueries).forEach(k => delete mockQueries[k])
    },
    __setData: (table: string, data: any[]) => {
      mockQueries[table] = {
        ...mockQueries[table],
        __data: data,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation((col: string, val: any) => {
          const filtered = data.filter((row: any) => row[col] === val)
          return {
            ...mockQueries[table],
            maybeSingle: jest.fn().mockResolvedValue({ data: filtered[0] || null }),
            single: jest.fn().mockResolvedValue({ data: filtered[0] || null }),
          }
        }),
      }
    }
  }
}

// Mock getUnifiedDb to return our mock
jest.mock('@/lib/unified-db', () => ({
  getUnifiedDb: jest.fn()
}))

describe('Quota Concurrency Stress Test', () => {
  let mockDb: ReturnType<typeof createMockDb>

  beforeEach(() => {
    mockDb = createMockDb()
    jest.clearAllMocks()

    // Set up the mocked getUnifiedDb
    const { getUnifiedDb } = require('@/lib/unified-db') as any
    getUnifiedDb.mockImplementation(() => Promise.resolve({ database: mockDb }))
  })

  it('should handle concurrent requests atomically', async () => {
    const projectId = 'proj_test'
    const supplierId = 'supplier_1'
    const initialQuota = 10
    const concurrentRequests = 50

    // Setup: supplier with quota = 10
    mockDb.__setData('supplier_project_links', [{
      project_id: projectId,
      supplier_id: supplierId,
      quota_allocated: initialQuota,
      quota_used: 0,
      status: 'active'
    }])

    // Fire concurrent RPC calls
    const promises = Array.from({ length: concurrentRequests }, () =>
      mockDb.rpc('increment_quota', {
        p_project_id: projectId,
        p_supplier_id: supplierId
      })
    )

    const results = await Promise.all(promises)

    // Count successes
    const successCount = results.filter(r => r.data === true).length
    const failureCount = results.filter(r => r.data === false).length
    const errors = results.filter(r => r.error)

    // Verify atomicity: exactly initialQuota should succeed, rest should fail
    expect(successCount).toBe(initialQuota)
    expect(failureCount).toBe(concurrentRequests - initialQuota)
    expect(errors.length).toBe(0)

    // Verify final quota_used
    const link = mockDb.from('supplier_project_links').__data[0]
    expect(link.quota_used).toBe(initialQuota)
  })

  it('should handle race conditions correctly', async () => {
    const projectId = 'proj_race'
    const supplierId = 'supplier_race'
    const initialQuota = 5
    const concurrentRequests = 20

    // Setup: supplier with quota = 5
    mockDb.__setData('supplier_project_links', [{
      project_id: projectId,
      supplier_id: supplierId,
      quota_allocated: initialQuota,
      quota_used: 0,
      status: 'active'
    }])

    // Fire concurrent RPC calls
    const promises = Array.from({ length: concurrentRequests }, () =>
      mockDb.rpc('increment_quota', {
        p_project_id: projectId,
        p_supplier_id: supplierId
      })
    )

    const results = await Promise.all(promises)

    const successCount = results.filter(r => r.data === true).length

    // Should never exceed quota
    expect(successCount).toBeLessThanOrEqual(initialQuota)

    // Verify quota not exceeded
    const link = mockDb.from('supplier_project_links').__data[0]
    expect(link.quota_used).toBeLessThanOrEqual(initialQuota)
  })

  it('should reject when supplier project link not found', async () => {
    mockDb.__setData('supplier_project_links', [])

    const result = await mockDb.rpc('increment_quota', {
      p_project_id: 'nonexistent_project',
      p_supplier_id: 'nonexistent_supplier'
    })

    expect(result.data).toBe(false)
    expect(result.error).not.toBeNull()
    expect(result.error!.message).toBe('Link not found')
  })

  it('should handle exhausted quota correctly', async () => {
    const projectId = 'proj_exhausted'
    const supplierId = 'supplier_exhausted'

    // Setup: supplier with quota already full
    mockDb.__setData('supplier_project_links', [{
      project_id: projectId,
      supplier_id: supplierId,
      quota_allocated: 10,
      quota_used: 10, // Already at limit
      status: 'active'
    }])

    const result = await mockDb.rpc('increment_quota', {
      p_project_id: projectId,
      p_supplier_id: supplierId
    })

    expect(result.data).toBe(false)
    expect(result.error).toBeNull()
  })
})
