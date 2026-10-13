/* PLASTIK donations: standalone static Solana USDC payment flow.
 * The private key always stays inside the visitor's Phantom/Solflare wallet.
 * No donation is recorded as successful without verification of the on-chain transfer.
 */
(()=>{
'use strict';
const RECEIVER='TezNo54KKKtEwCxwi1sL5VPMEbN228znqEntH5akepk';
const USDC_MINT='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const TOKEN_PROGRAM='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ASSOCIATED_TOKEN_PROGRAM='ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const RPC='https://api.mainnet.solana.com'; // rate limited: replace with dedicated RPC for production
const CHOICES=new Set(['0.10','0.25','0.50','1.00']);
const button=document.getElementById('donateBtn');
const status=document.getElementById('paymentStatus');
const receipt=document.getElementById('paymentReceipt');
if(!button||!status||!receipt)return;
let processing=false;
function setStatus(msg,level='ready'){
 status.dataset.state=level;
 status.textContent=msg;
}
function showReceipt(sig,verified,amount){
 receipt.replaceChildren();
 const header=document.createElement('b');
 header.textContent=verified?'✔ Confirmed donation: '+amount+' USDC':'Transaction sent: confirmation not yet verified';
 const link=document.createElement('a');
 link.href='https://solscan.io/tx/'+encodeURIComponent(sig);
 link.target='_blank';link.rel='noopener noreferrer';
 link.textContent='View transaction on Solscan ↗';
 receipt.append(header,document.createElement('br'),link);
 receipt.hidden=false;
}
function provider(){
 const ph=window.phantom?.solana;
 if(ph?.isPhantom && typeof ph.connect==='function'&&typeof ph.signAndSendTransaction==='function')return ph;
 const sf=window.solflare;
 if(sf?.isSolflare && typeof sf.connect==='function'&&typeof sf.signAndSendTransaction==='function')return sf;
 return null;
}
function tokenAccount(owner,mint,tokenId,ataId,web3){
 return web3.PublicKey.findProgramAddressSync([owner.toBuffer(),tokenId.toBuffer(),mint.toBuffer()],ataId)[0];
}
function createRecipientATA(payer,owner,ata,mint,tokenId,ataId,web3){
 return new web3.TransactionInstruction({programId:ataId,keys:[
  {pubkey:payer,isSigner:true,isWritable:true},
  {pubkey:ata,isSigner:false,isWritable:true},
  {pubkey:owner,isSigner:false,isWritable:false},
  {pubkey:mint,isSigner:false,isWritable:false},
  {pubkey:web3.SystemProgram.programId,isSigner:false,isWritable:false},
  {pubkey:tokenId,isSigner:false,isWritable:false}
 ],data:new Uint8Array([1])}); // Associated Token Account create-idempotent
}
function transferChecked(from,mint,to,authority,micro,tokenId,web3){
 const instructionData=new Uint8Array(10);instructionData[0]=12; // SPL Token TransferChecked
 const view=new DataView(instructionData.buffer);
 view.setBigUint64(1,BigInt(micro),true);instructionData[9]=6;
 return new web3.TransactionInstruction({programId:tokenId,keys:[
  {pubkey:from,isSigner:false,isWritable:true},
  {pubkey:mint,isSigner:false,isWritable:false},
  {pubkey:to,isSigner:false,isWritable:true},
  {pubkey:authority,isSigner:true,isWritable:false}
 ],data:instructionData});
}
function getTransfer(receipt){
 const list=[...(receipt?.transaction?.message?.instructions||[]),...(receipt?.meta?.innerInstructions||[]).flatMap(group=>group.instructions||[])];
 return list.filter(inst=>inst?.parsed?.type==='transferChecked').map(inst=>inst.parsed.info);
}
function isVerified(parsed,expected){
 if(!parsed||parsed.meta?.err!==null)return false;
 return getTransfer(parsed).some(info=>
  info?.mint===USDC_MINT &&
  info?.destination===expected.destination &&
  info?.source===expected.source &&
  info?.authority===expected.sender &&
  info?.tokenAmount?.amount===String(expected.micro) &&
  Number(info?.tokenAmount?.decimals)===6
 );
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function awaitVerification(connection,sig,expected){
 // Never infer payment success merely because the wallet returned a signature.
 for(let i=0;i<12;i++){
  try{
   const tx=await connection.getParsedTransaction(sig,{commitment:'confirmed',maxSupportedTransactionVersion:0});
   if(tx){
    if(tx.meta?.err!==null)throw new Error('The transfer failed on the Solana network.');
    if(isVerified(tx,expected))return true;
    throw new Error('Transaction confirmed, but USDC payment details did not match the expected recipient and amount.');
   }
  }catch(e){
   if(/transfer failed|details did not match/.test(String(e.message)))throw e;
   // rate limiting or temporary RPC failures: keep status pending until verifiable
  }
  await wait(2500);
 }
 return false;
}
async function donate(){
 if(processing)return;
 const amount=document.querySelector('.amount.selected')?.dataset.amount;
 if(!CHOICES.has(amount)){setStatus('Select a valid donation amount.','error');return;}
 const micro=Math.round(Number(amount)*1e6);
 const web3=window.solanaWeb3;
 if(!web3?.PublicKey||!web3?.Connection){
  setStatus('The Solana payment library could not load. Check the connection and retry. No transaction has been sent.','error');return;
 }
 const wallet=provider();
 if(!wallet){
  setStatus('Open this site in the Phantom app browser, or install Phantom/Solflare on your desktop browser. No funds have been charged.','error');return;
 }
 processing=true;button.disabled=true;
 let signature=null;
 try{
  setStatus('Connecting to wallet…','pending');
  const result=await wallet.connect();
  const sender=new web3.PublicKey(result?.publicKey||wallet.publicKey);
  const receiver=new web3.PublicKey(RECEIVER);
  if(sender.equals(receiver))throw new Error('The connected wallet is the receiving wallet. Please use another wallet for a test donation.');
  const mint=new web3.PublicKey(USDC_MINT);
  const tokenId=new web3.PublicKey(TOKEN_PROGRAM);
  const ataId=new web3.PublicKey(ASSOCIATED_TOKEN_PROGRAM);
  const from=tokenAccount(sender,mint,tokenId,ataId,web3);
  const to=tokenAccount(receiver,mint,tokenId,ataId,web3);
  const connection=new web3.Connection(RPC,'confirmed');
  setStatus('Checking USDC balance and preparing '+amount+' USDC…','pending');
  let balance;
  try{balance=await connection.getTokenAccountBalance(from,'confirmed')}catch(e){
   throw new Error('USDC balance not found. Your wallet needs official USDC on Solana and some SOL for fees.');
  }
  if(BigInt(balance.value.amount)<BigInt(micro))throw new Error('Insufficient USDC balance. Add '+amount+' USDC and some SOL for network fees.');
  const transaction=new web3.Transaction();
  // Idempotent: creates receiving ATA only if absent. Visitor funds rent if needed.
  transaction.add(createRecipientATA(sender,receiver,to,mint,tokenId,ataId,web3));
  transaction.add(transferChecked(from,mint,to,sender,micro,tokenId,web3));
  const block=await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash=block.blockhash;
  transaction.feePayer=sender;
  setStatus('Review the amount, USDC token and recipient in your wallet, then approve or reject.','pending');
  const sent=await wallet.signAndSendTransaction(transaction);
  signature=typeof sent==='string'?sent:sent?.signature;
  if(typeof signature!=='string'||!signature.length)throw new Error('The wallet did not return a transaction ID. Check the wallet history before retrying.');
  showReceipt(signature,false,amount);
  setStatus('Transaction submitted. Verifying recipient and amount on Solana…','pending');
  const verified=await awaitVerification(connection,signature,{sender:sender.toBase58(),source:from.toBase58(),destination:to.toBase58(),micro});
  if(!verified){
   setStatus('Transaction sent, but confirmation could not be verified yet. Check the Solscan link and your wallet before trying again.','pending');
   return;
  }
  showReceipt(signature,true,amount);
  setStatus('Thank you! '+amount+' USDC donation verified on Solana.','success');
 }catch(error){
  let msg=String(error?.message||error);
  if(/User rejected|user rejected|declined|cancelled|canceled|4001/.test(msg))msg='Transaction canceled in your wallet. No donation was completed.';
  if(signature){
   showReceipt(signature,false,amount);
   setStatus('Transaction may have been submitted. '+msg+' Check Solscan before retrying.','error');
  }else{
   setStatus(msg.slice(0,350),'error');
  }
 }finally{processing=false;button.disabled=false;}
}
button.addEventListener('click',donate);
})();
