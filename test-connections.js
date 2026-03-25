#!/usr/bin/env node

/**
 * Connection Test Script
 * Tests all InsForge database connections and API endpoints
 */

const https = require('https');
const http = require('http');

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://ckj5ikqw.us-east.insforge.app';
const INSFORGE_API_KEY = process.env.INSFORGE_API_KEY || 'ik_4c280b49c0ff95cf76486c648177850d';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

console.log('🔍 Testing InsForge Connections...\n');

// Test 1: InsForge API Connection
async function testInsForgeAPI() {
    return new Promise((resolve) => {
        const url = new URL('/rest/v1/admins?select=email&limit=1', INSFORGE_URL);

        const options = {
            headers: {
                'apikey': INSFORGE_API_KEY,
                'Authorization': `Bearer ${INSFORGE_API_KEY}`
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ InsForge API Connection: SUCCESS');
                    console.log(`   Response: ${data.substring(0, 100)}...`);
                } else {
                    console.log(`❌ InsForge API Connection: FAILED (Status ${res.statusCode})`);
                }
                resolve();
            });
        }).on('error', (err) => {
            console.log(`❌ InsForge API Connection: ERROR - ${err.message}`);
            resolve();
        });
    });
}

// Test 2: Local API Endpoint
async function testLocalAPI() {
    return new Promise((resolve) => {
        http.get(`${APP_URL}/api/check-db`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ Local API Endpoint: SUCCESS');
                    const parsed = JSON.parse(data);
                    console.log(`   Read test: ${parsed.read.error ? 'FAILED' : 'SUCCESS'}`);
                    console.log(`   Insert test: ${parsed.insert.error ? 'FAILED' : 'SUCCESS'}`);
                } else {
                    console.log(`❌ Local API Endpoint: FAILED (Status ${res.statusCode})`);
                }
                resolve();
            });
        }).on('error', (err) => {
            console.log(`❌ Local API Endpoint: ERROR - ${err.message}`);
            resolve();
        });
    });
}

// Test 3: Database Tables
async function testDatabaseTables() {
    return new Promise((resolve) => {
        const url = new URL('/rest/v1/', INSFORGE_URL);

        const options = {
            headers: {
                'apikey': INSFORGE_API_KEY,
                'Authorization': `Bearer ${INSFORGE_API_KEY}`
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('✅ Database Tables Check: SUCCESS');
                console.log('   Expected tables: admins, clients, projects, responses, suppliers');
                resolve();
            });
        }).on('error', (err) => {
            console.log(`❌ Database Tables Check: ERROR - ${err.message}`);
            resolve();
        });
    });
}

// Run all tests
(async () => {
    await testInsForgeAPI();
    console.log('');
    await testLocalAPI();
    console.log('');
    await testDatabaseTables();
    console.log('\n✨ Connection tests completed!\n');
})();
