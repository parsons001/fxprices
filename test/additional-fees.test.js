import { test } from 'node:test';
import assert from 'node:assert/strict';
import { additionalFeeRows } from '../lib/additional-fees.js';
test('Additional fees match currency, amount and plan, retaining negative and missing values',()=>{
 const base={currency:'EUR',amount:100,fetchedAt:'2026-09-20T10:00:00Z'};
 const send=[{...base,quotes:[{provider:'Wise',feeGbp:2},{provider:'Revolut',planId:'STANDARD',option:'Standard',feeGbp:0},{provider:'Revolut',planId:'PLUS',option:'Plus',feeGbp:1}]}];
 const convert=[{...base,quotes:[{provider:'Wise',feeGbp:1},{provider:'Revolut',planId:'STANDARD',option:'Standard',feeGbp:1}]}];
 const rows=additionalFeeRows(send,convert);
 assert.equal(rows.find(r=>r.provider==='Wise').additionalFee,1);
 assert.equal(rows.find(r=>r.plan==='Standard').additionalFee,-1);
 assert.equal(rows.find(r=>r.plan==='Plus').additionalFee,null);
 assert.ok(additionalFeeRows(send,[{...convert[0],amount:500}]).every(r=>r.additionalFee===null));
});
