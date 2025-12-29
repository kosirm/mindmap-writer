/**
 * Test file for vault management implementation
 * This file tests the central index functionality
 */

import { db } from '../../quasar/src/core/services/indexedDBService';
import { syncManager } from '../../quasar/src/core/services/syncManager';

async function testVaultManagement() {
  console.log('🧪 Starting vault management tests...');

  try {
    // Test 1: Database schema migration
    console.log('\n1. Testing database schema migration...');
    await db.open();
    console.log('✅ Database opened successfully');
    
    // Check if new tables exist
    const hasCentralIndexTable = db.tables.some(table => table.name === 'centralIndex');
    const hasVaultMetadataTable = db.tables.some(table => table.name === 'vaultMetadata');
    
    console.log(`CentralIndex table exists: ${hasCentralIndexTable}`);
    console.log(`VaultMetadata table exists: ${hasVaultMetadataTable}`);
    
    if (!hasCentralIndexTable || !hasVaultMetadataTable) {
      throw new Error('Database schema migration failed - missing tables');
    }

    // Test 2: Create default central index
    console.log('\n2. Testing default central index creation...');
    const centralIndex = await syncManager.createDefaultCentralIndex();
    console.log('✅ Default central index created:', centralIndex);
    
    // Verify central index was stored
    const storedIndex = await db.centralIndex.get('central');
    if (!storedIndex) {
      throw new Error('Central index not stored in database');
    }
    console.log('✅ Central index stored in database');
    
    // Verify vault metadata was stored
    const vaultId = Object.keys(centralIndex.vaults)[0];
    const storedVault = await db.vaultMetadata.get(vaultId);
    if (!storedVault) {
      throw new Error('Vault metadata not stored in database');
    }
    console.log('✅ Vault metadata stored in database');

    // Test 3: Update central index
    console.log('\n3. Testing central index updates...');
    const updates = {
      fileCount: 5,
      size: 1024,
      modified: Date.now()
    };
    
    await syncManager.updateCentralIndex(vaultId, updates);
    
    // Verify updates were applied
    const updatedIndex = await db.centralIndex.get('central');
    const updatedVault = await db.vaultMetadata.get(vaultId);
    
    if (!updatedIndex || !updatedVault) {
      throw new Error('Failed to update central index');
    }
    
    if (updatedIndex.vaults[vaultId].fileCount !== 5) {
      throw new Error('File count not updated correctly');
    }
    
    if (updatedVault.fileCount !== 5) {
      throw new Error('Vault metadata not updated correctly');
    }
    
    console.log('✅ Central index updates work correctly');

    // Test 4: Find active vault
    console.log('\n4. Testing active vault detection...');
    const activeVaultId = await syncManager.findActiveVaultId();
    console.log('Active vault ID:', activeVaultId);
    
    if (activeVaultId !== vaultId) {
      throw new Error('Active vault detection failed');
    }
    
    console.log('✅ Active vault detection works correctly');

    // Test 5: Initialize sync (offline mode)
    console.log('\n5. Testing sync initialization...');
    // This will use the cached/mock data since we're offline
    await syncManager.initializeSync();
    console.log('✅ Sync initialization completed');

    console.log('\n🎉 All tests passed! Vault management implementation is working correctly.');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  } finally {
    await db.close();
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testVaultManagement().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testVaultManagement };