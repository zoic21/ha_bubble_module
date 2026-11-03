const assert=require('node:assert/strict');
const {test}=require('node:test');
const {createHash}=require('node:crypto');
const {readSource}=require('../../scripts/source-files.cjs');
const hashPin=new Function(readSource('signature-pin/src/hash.js')+'\nreturn hashPin;')();
test('PIN SHA-256 agrees with Node crypto across padding boundaries, many blocks and leading zeros',()=>{
  const values=['','0','0073','73','1234','000000','999999'];
  for(const length of [1,4,8,16,31,32,55,56,57,63,64,65,119,120,127,128,129,255,256,257,1024,4096])
    values.push('0123456789'.repeat(Math.ceil(length/10)).slice(0,length));
  for(let i=0;i<200;i++)values.push(String(i*7919).padStart(12,'0'));
  for(const pin of values)assert.equal(hashPin(pin),createHash('sha256').update(pin).digest('hex'),pin.length+' digit PIN');
  assert.notEqual(hashPin('0073'),hashPin('73'));
});
test('PIN hashing rejects nonnumeric and nonstring input',()=>{
  for(const value of [null,undefined,1234,'12a','12 34','１２３４'])assert.throws(()=>hashPin(value),/Invalid numeric PIN/);
});
