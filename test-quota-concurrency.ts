#!/usr/bin/env node

/**
 * Concurrency Quota Test
 * Tests atomicity of quota increments under concurrent load
 */

import { getUnifiedDb } from './lib/unified-db.ts';

async function testConcurrentQuotaIncrement(): Promise<void> {
  console.log('='.repeat(60));
  console.log('CONCURRENT QUOTA INCREMENT TEST');
  console.log('='.repeat(60));
  console.log('');

  const db = await getUnifiedDb();
  const projectId = 'proj_concurrency_' + Date.now();
  const supplierId = 'supp_concurrency_' + Date.now();
  const initialQuota = 10;
  const concurrentRequests = 15; // More than quota to test limit

  try {
    // Setup: Create project, supplier, and link with quota = 10
    console.log('Setting up test data...');

    await db.database.from('projects').insert([{
      id: projectId,
      project_code: projectId,
      project_name: 'Concurrency Test Project',
      base_url: 'https://example.com',
      status: 'active'
    }]);

    await db.database.from('suppliers').insert([{
      id: supplierId,
      name: 'Concurrency Test Supplier',
      supplier_token: 'CONCURRENCY_TEST',
      status: 'active'
    }]);

    await db.database.from('supplier_project_links').insert([{
      id: 'link_concurrency_' + Date.now(),
      supplier_id: supplierId,
      project_id: projectId,
      quota_allocated: initialQuota,
      quota_used: 0,
      status: 'active'
    }]);

    console.log(`✓ Test data setup complete (Quota: ${initialQuota})`);
    console.log(`Simulating ${concurrentRequests} concurrent increment requests...`);
    console.log('');

    // Fire concurrent RPC calls
    const promises = Array.from({ length: concurrentRequests }, () =>
      db.database.rpc('increment_quota', {
        p_project_id: projectId,
        p_supplier_id: supplierId
      })
    );

    const results = await Promise.all(promises);

    // Count successes
    const successCount = results.reduce((sum, res) => sum + (res.data === true ? 1 : 0), 0);
    const failureCount = results.reduce((sum, res) => sum + (res.data === false ? 1 : 0), 0);
    const errors = results.filter(res => res.error);

    console.log(`Results: ${successCount} succeeded, ${failureCount} blocked (limit reached), ${errors.length} errors`);
    if (errors.length > 0) {
      console.log('Errors encountered:');
      errors.forEach(err => console.log(`  - ${err.error?.message || err.error}`));
    }

    // Check final quota_used
    const { data: link } = await db.database
      .from('supplier_project_links')
      .select('quota_used, quota_allocated')
      .eq('project_id', projectId)
      .eq('supplier_id', supplierId)
      .single();

    console.log('');
    console.log(`Final quota_used: ${link.quota_used} / ${link.quota_allocated}`);

    // Evaluate
    let passed = false;
    if (link.quota_used === initialQuota && successCount === initialQuota && failureCount === (concurrentRequests - initialQuota)) {
      console.log('');
      console.log('✅ CONCURRENCY TEST PASSED');
      console.log('   - Exactly the allocated quota was used');
      console.log('   - No over-allocation occurred');
      console.log('   - Atomic increments worked correctly');
      passed = true;
    } else {
      console.log('');
      console.log('❌ CONCURRENCY TEST FAILED');
      console.log(`   Expected: quota_used = ${initialQuota}, successes = ${initialQuota}`);
      console.log(`   Actual: quota_used = ${link.quota_used}, successes = ${successCount}`);
    }

    // Cleanup
    await db.database.from('supplier_project_links').delete().eq('project_id', projectId).eq('supplier_id', supplierId);
    await db.database.from('suppliers').delete().eq('id', supplierId);
    await db.database.from('projects').delete().eq('id', projectId);

    console.log('✓ Cleanup complete');

    process.exit(passed ? 0 : 1);

  } catch (err) {
    console.error('Error during concurrency test:', err);
    process.exit(1);
  }
}

await testConcurrentQuotaIncrement();
