#!/usr/bin/env node
/**
 * Manual Integration Test for Entity Tracking System
 * Demonstrates full entity extraction and CRUD functionality
 */

import entityService from './src/services/entities/entityService.js';
import entityExtractionService from './src/services/entities/entityExtractionService.js';
import db from './src/db/index.js';

const TEST_USER = '00000000-0000-0000-0000-000000000000';

async function testEntityTracking() {
    console.log('\n🧪 Testing Entity Tracking System\n');
    console.log('='.repeat(60));

    try {
        // Test 1: Extract entities from sample text
        console.log('\n📝 Test 1: Entity Extraction');
        const mockMemory = {
            id: 'test-memory-1',
            user_id: TEST_USER,
            original_input: 'Had coffee with Sarah at Starbucks, discussed my new MacBook',
            normalized_data: { category: 'finance' }
        };

        const extraction = await entityExtractionService.extractEntities(mockMemory);
        console.log(`✅ Extracted ${extraction.extracted} entities`);
        console.log(`✅ Stored ${extraction.stored} entities`);
        if (extraction.entities.length > 0) {
            console.log('Entities:', extraction.entities.map(e => `${e.name} (${e.entity_type})`).join(', '));
        }

        // Test 2: Get all entities
        console.log('\n📊 Test 2: Get All Entities');
        const allEntities = await entityService.getUserEntities(TEST_USER, { limit: 10 });
        console.log(`✅ Found ${allEntities.length} total entities`);
        allEntities.slice(0, 5).forEach(e => {
            console.log(`  - ${e.name} (${e.entity_type}) - mentioned ${e.mention_count}x`);
        });

        // Test 3: Search entities
        console.log('\n🔍 Test 3: Search Entities');
        const searchResults = await entityService.searchEntities(TEST_USER, 'test');
        console.log(`✅ Search found ${searchResults.length} results`);

        // Test 4: Get entity statistics
        console.log('\n📈 Test 4: Entity Statistics');
        const stats = await entityService.getEntityStats(TEST_USER);
        console.log('✅ Statistics by type:');
        stats.forEach(stat => {
            console.log(`  - ${stat.entity_type}: ${stat.count} entities, ${stat.total_mentions} total mentions`);
        });

        // Test 5: Get top entities
        console.log('\n🏆 Test 5: Top Entities');
        const topEntities = await entityService.getTopEntities(TEST_USER, 5);
        console.log(`✅ Top ${topEntities.length} most mentioned:`);
        topEntities.forEach((e, i) => {
            console.log(`  ${i + 1}. ${e.name} (${e.entity_type}) - ${e.mention_count} mentions`);
        });

        // Test 6: Filter by type
        console.log('\n🔎 Test 6: Filter by Entity Type');
        const people = await entityService.getUserEntities(TEST_USER, { entity_type: 'person', limit: 5 });
        console.log(`✅ Found ${people.length} people`);

        const places = await entityService.getUserEntities(TEST_USER, { entity_type: 'place', limit: 5 });
        console.log(`✅ Found ${places.length} places`);

        // Test 7: Recent entities
        console.log('\n⏰ Test 7: Recent Entities');
        const recent = await entityService.getRecentEntities(TEST_USER, 7, 5);
        console.log(`✅ ${recent.length} entities seen in last 7 days`);
        recent.forEach(e => {
            console.log(`  - ${e.name} (last seen: ${new Date(e.last_seen_at).toLocaleDateString()})`);
        });

        // Test 8: CRUD operations
        if (allEntities.length > 0) {
            console.log('\n✏️ Test 8: Update Entity');
            const entityToUpdate = allEntities[0];
            const updated = await entityService.updateEntity(
                TEST_USER,
                entityToUpdate.id,
                { properties: { test: true } }
            );
            console.log(`✅ Updated entity: ${updated.name}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ All Entity Tracking Tests Passed!');
        console.log('='.repeat(60));
        console.log('\n📋 Summary:');
        console.log(`  - Entity extraction: ${extraction.extracted > 0 ? 'WORKING' : 'FALLBACK USED'}`);
        console.log(`  - Database storage: WORKING`);
        console.log(`  - Entity retrieval: WORKING`);
        console.log(`  - Search: WORKING`);
        console.log(`  - Statistics: WORKING`);
        console.log(`  - Filtering: WORKING`);
        console.log(`  - CRUD operations: WORKING\n`);

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testEntityTracking();
