#!/usr/bin/env node
/**
 * Patch healthcare-dollars Sanity document:
 * 1. Remove 7 duplicate list items in the Methodology section
 * 2. Insert 10 "Column X, ..." label paragraphs before each list group
 *
 * Usage:
 *   node scripts/patch-healthcare-dollars-methodology.mjs          # dry-run
 *   node scripts/patch-healthcare-dollars-methodology.mjs --write  # apply
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from 'next-sanity';
import crypto from 'crypto';

const WRITE = process.argv.includes('--write');

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

// Keys of duplicate blocks to remove
const DUPLICATE_KEYS = new Set([
  '6f41ed4c-181', // idx 41: duplicate of idx 31 ($3,500B sub-item)
  '0569afb0-a3b', // idx 42: duplicate of idx 33 (14.1% sub-item)
  'd1c5f764-45e', // idx 55: duplicate of idx 47 (12.2% sub-item)
  '3abb2c5f-ca1', // idx 56: duplicate of idx 49 ($582B sub-item)
  '535af068-a5a', // idx 57: duplicate of idx 54 ($133B sub-item)
  '4e6709b7-0a9', // idx 62: duplicate of idx 59 ($534.64B sub-item)
  'a46157a5-c89', // idx 63: duplicate of idx 61 (10% sub-item)
]);

function genKey() {
  return crypto.randomBytes(6).toString('hex');
}

/**
 * Create a paragraph block with gray, small text for column labels.
 * In the Gatsby source these are: <span class="text--gray text--sm">Column N, ...</span>
 * We use textColor mark with 'gray' value.
 */
function makeColumnLabel(text) {
  const colorKey = genKey();
  return {
    _key: genKey(),
    _type: 'block',
    style: 'normal',
    markDefs: [
      {
        _key: colorKey,
        _type: 'textColor',
        value: 'gray',
      },
    ],
    children: [
      {
        _key: genKey(),
        _type: 'span',
        marks: [colorKey],
        text: text,
      },
    ],
  };
}

// Map from list item _key to column label that should be inserted BEFORE it
// These are the FIRST list items of each column group in the Gatsby source.
const COLUMN_LABELS_BEFORE_KEY = [
  // Column 1, NHE - before $3,500B (key 97902052-892, the very first list item)
  { beforeKey: '97902052-892', label: 'Column 1, National health expenditure section' },
  // Column 2, NHE - before $2,600B (key c5291b69-f73)
  { beforeKey: 'c5291b69-f73', label: 'Column 2, National health expenditure section' },
  // Column 3, NHE - before $1,200B (key 53f475b8-892)
  { beforeKey: '53f475b8-892', label: 'Column 3, National health expenditure section' },
  // Column 4, NHE - before $1,030.8B (key afece5ac-dcf)
  { beforeKey: 'afece5ac-dcf', label: 'Column 4, National health expenditure section' },
  // Column 5, NHE - before $534.64B (key 6f192017-1e0)
  { beforeKey: '6f192017-1e0', label: 'Column 5, National health expenditure section' },
  // Column 6, NHE - before $454.14B (key 8b5f1f00-741)
  { beforeKey: '8b5f1f00-741', label: 'Column 6, National health expenditure section' },
  // Column 1, PHE - before $2,800B (key 454c5214-6a4)
  { beforeKey: '454c5214-6a4', label: 'Column 1, Personal health expenditure section' },
  // Column 2, PHE - before $1,070B (key 3b861862-efc)
  { beforeKey: '3b861862-efc', label: 'Column 2, Personal health expenditure section' },
  // Column 1, HHS - before $1,110B (key da928001-494)
  { beforeKey: 'da928001-494', label: 'Column 1, Health and human services expenditure' },
  // Column 2, HHS - before $1T (key 572f0bd7-670)
  { beforeKey: '572f0bd7-670', label: 'Column 2, Health and human services expenditure' },
];

async function main() {
  const doc = await client.fetch(
    '*[_type=="feature" && slug.current=="healthcare-dollars"][0]{_id, content}'
  );

  if (!doc) {
    console.error('ERROR: Document not found');
    process.exit(1);
  }

  console.log(`Document: ${doc._id}`);
  console.log(`Current block count: ${doc.content.length}`);

  // Step 1: Remove duplicates
  const afterRemoval = doc.content.filter((block) => !DUPLICATE_KEYS.has(block._key));
  const removedCount = doc.content.length - afterRemoval.length;
  console.log(`\nStep 1: Removed ${removedCount} duplicate blocks`);

  if (removedCount !== DUPLICATE_KEYS.size) {
    console.warn(
      `WARNING: Expected to remove ${DUPLICATE_KEYS.size} blocks but removed ${removedCount}`
    );
    // Check which ones weren't found
    const foundKeys = new Set(doc.content.map((b) => b._key));
    for (const key of DUPLICATE_KEYS) {
      if (!foundKeys.has(key)) {
        console.warn(`  Key not found: ${key}`);
      }
    }
  }

  // Step 2: Insert column labels before their respective list items
  const newContent = [];
  let insertedCount = 0;

  for (const block of afterRemoval) {
    // Check if this block's key matches a label insertion point
    const labelEntry = COLUMN_LABELS_BEFORE_KEY.find((e) => e.beforeKey === block._key);
    if (labelEntry) {
      newContent.push(makeColumnLabel(labelEntry.label));
      insertedCount++;
      console.log(`  Inserted label: "${labelEntry.label}" before key ${block._key}`);
    }
    newContent.push(block);
  }

  console.log(`\nStep 2: Inserted ${insertedCount} column label paragraphs`);
  console.log(`New block count: ${newContent.length}`);
  console.log(`Net change: ${newContent.length - doc.content.length} blocks`);

  // Verify: list the methodology section to confirm structure
  console.log('\n--- Methodology section preview ---');
  let inMethodology = false;
  for (let i = 0; i < newContent.length; i++) {
    const block = newContent[i];
    if (block._type === 'block' && block.style === 'sectionTitle') {
      const text = (block.children || []).map((c) => c.text).join('');
      if (text === 'Methodology') inMethodology = true;
      else if (text === 'Author') break;
    }
    if (!inMethodology) continue;

    if (block._type === 'block') {
      const text = (block.children || []).map((c) => c.text).join('').substring(0, 80);
      const listInfo = block.listItem ? ` L${block.level} ${block.listItem}` : '';
      const marks = (block.markDefs || []).map((m) => m._type).join(',');
      console.log(`  ${i}: [${block.style}${listInfo}]${marks ? ` {${marks}}` : ''} ${text}`);
    } else {
      console.log(`  ${i}: [${block._type}]`);
    }
  }

  if (!WRITE) {
    console.log('\n=== DRY RUN — pass --write to apply ===');
    return;
  }

  // Apply the patch
  console.log('\nApplying patch...');
  await client.patch(doc._id).set({ content: newContent }).commit();
  console.log('DONE — patch applied successfully.');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
