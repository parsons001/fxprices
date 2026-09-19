import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wiseSendQuotes, revolutSendQuotes, fetchAndStoreSend } from '../lib/fetch-send.js';
import { sendStore } from '../lib/send-store.js';
import { conversionDocument } from '../lib/conversion-store.js';

const wise = [{ payInMethod:'BALANCE', payOutMethod:'BANK_TRANSFER', sourceCcy:'GBP', targetCcy:'EUR', sourceAmount:100, targetAmount:118.8, total:1, midRate:1.2 }];
const revolut = { rate:{from:'GBP',to:'EUR',rate:1.2}, routes:[{id:'INTERNAL',plans:[]},{id:'BANK',plans:[{id:'STANDARD',name:'Standard',fees:{currency:'GBP',total:100,transfer:50,fx:50}}]}] };
test('Send selects balance-to-bank and bank route, deducting quoted fees once', () => {
 assert.equal(wiseSendQuotes(wise,'EUR')[0].receivedAmount,118.8);
 const q=revolutSendQuotes(revolut,'EUR',100)[0];
 assert.equal(q.receivedAmount,118.8); assert.equal(q.feeGbp,1);assert.equal(q.costGbp,100);
 assert.equal(q.transferFeeGbp,0.5);assert.equal(q.calculated,true);
 assert.throws(()=>wiseSendQuotes([{...wise[0],payOutMethod:'BALANCE'}],'EUR'));
 assert.throws(()=>revolutSendQuotes(revolut,'JPY',100));
});
test('Send uses separate storage, country routing, amount units and provider errors', async(t)=>{
 const saved=[];
 t.mock.method(sendStore,'save',async result=>{saved.push(conversionDocument(result));return 'send-id';});
 t.mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(options.cache,'no-store');
  const u=new URL(url);
  if(u.hostname==='wise.com'){assert.equal(u.searchParams.get('sourceAmount'),'100');return Response.json(wise);}
  assert.equal(u.searchParams.get('amount'),'10000');assert.equal(u.searchParams.get('recipientCountry'),'ES');
  assert.equal(options.headers['locale-code'],'en-GB');return Response.json(revolut);
 });
 const request=()=>new Request('http://localhost/api/send?currency=EUR&gbpAmount=100');
 const result=await(await fetchAndStoreSend(request())).json();
 assert.equal(result.quotes.length,2);assert.equal(result.storage.saved,true);assert.equal(saved[0].recipientCountry,'ES');
 t.mock.method(globalThis,'fetch',async()=>Response.json({},{status:503}));
 const failed=await(await fetchAndStoreSend(request())).json();assert.equal(failed.errors.length,2);assert.equal(failed.storage.saved,true);
});
