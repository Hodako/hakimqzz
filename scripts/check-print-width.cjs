// Run from the repository root: node scripts/check-print-width.cjs
// Override the browser location with PRINT_TEST_BROWSER when needed.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ts = require('typescript');
const puppeteer = require('puppeteer-core');
const assert = require('assert/strict');
const data = {
 businessName: 'দীর্ঘ দোকানের নাম Classic World Dream Fashion', invoiceNo: 'INV-'+'1234567890'.repeat(5),
 invoiceDate: '07 Nov 2026 12:30 PM', customerName: 'CustomerName'.repeat(12),
 customerPhone: '01712345678', shopAddress: 'Address'.repeat(30),
 items: [{product:{name:'পণ্যের বিবরণ '+ 'VeryLongUnbrokenProductSKU'.repeat(8)},qty:100,sellPrice:999999.99}],
 subtotal:99999999,discountAmount:100,total:99999899,paidAmount:100,due:99999799,
};
async function run() {
 const browser = await puppeteer.launch({executablePath:process.env.PRINT_TEST_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,pipe:true,args:['--no-sandbox','--disable-gpu'],timeout:60000});
 try {
  const page = await browser.newPage();
  await page.emulateMediaType('print');
  await page.setViewport({width:440,height:780});
  let checked=0;
  for (const root of ['.', 'Classic-World']) {
   let settings, captured;
   const storage = new Map();
   const cache = new Map();
   function load(name) {
    if(cache.has(name)) return cache.get(name);
    const source=fs.readFileSync(path.join(root,'src/lib',name+'.ts'),'utf8');
    const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
    const module={exports:{}}; cache.set(name,module.exports);
    const context={module,exports:module.exports,require: id=>id.startsWith('@/lib/')?load(id.slice(6)):require(id),
     window:{electronPOS:{printSilent:async options=>{captured=options;return {success:true};}}},
     localStorage:{getItem:key=>storage.get(key)||null},console,AbortController,setTimeout,clearTimeout};
    vm.runInNewContext(code,context,{filename:name+'.ts'});
    return module.exports;
   }
   const hw=load('pos-hardware');
   const invoice=load('invoice-printer');
   const pos=load('pos-print');
   const layout=load('print-layout');
   let nativeOptions;
   class MockWindow {
    constructor(){this.webContents={executeJavaScript:code=>page.evaluate(code),getPrintersAsync:async()=>[],
     print: (options,done)=>{nativeOptions=options;done(true);}};}
    async loadFile(file){await page.setContent(fs.readFileSync(file,'utf8'));}
    isDestroyed(){return false;} close(){} showInactive(){}
   }
   const main=fs.readFileSync(path.join(root,'electron/main.cjs'),'utf8');
   const begin=main.indexOf('async function performSilentPrint(');
   const end=main.indexOf('ipcMain.handle("pos:print-silent"',begin);
   const perform=vm.runInNewContext(main.slice(begin,end)+'\nperformSilentPrint',{
    BrowserWindow:MockWindow,fs,path,os:require('os'),console:{log(){},warn:console.warn},setTimeout:(fn)=>setTimeout(fn,0),
   });
   async function check(label,width,scale) {
    const maxWidth=layout.getPrintableWidthMm(width)*96/25.4;
    const result=await page.evaluate(()=>{
     const wrap=document.querySelector('.receipt-wrap');const bounds=wrap.getBoundingClientRect();
     const out=[];
     for(const element of wrap.querySelectorAll('*')) {
      const rect=element.getBoundingClientRect();
      if(rect.width && (rect.right>bounds.right+1 || rect.left<bounds.left-1))out.push(element.tagName);
      if(element.clientWidth>0 && element.scrollWidth>element.clientWidth+2)out.push(element.tagName+':scroll');
     }
     const rules=Array.from(document.styleSheets).flatMap(sheet=>Array.from(sheet.cssRules));
     return {width:bounds.width,out:out.slice(0,10),pageSize:rules.filter(r=>r.constructor.name==='CSSPageRule').at(-1)?.style.size};
    });
    assert(result.width<=maxWidth+1,`${root} ${label} ${width}/${scale}: ${JSON.stringify(result)}`);
    assert.equal(result.out.length,0,`${root} ${label} ${width}/${scale}: ${JSON.stringify(result)}`);
    assert(result.pageSize, 'Page size must parse');checked++;
   }
   for(const width of [20,50,58,70,80]) for(const scale of [75,100,150,200]) {
    settings={...hw.DEFAULT_HARDWARE_SETTINGS,paperWidthMm:width,printScale:scale,marginLeftMm:1,marginRightMm:1};
    storage.set('dreamfashion_pos_hardware_v1',JSON.stringify(settings));
    storage.set('classicworld_pos_hardware_v1',JSON.stringify(settings));
    const html=invoice.buildInvoiceHtml(data,settings);
    await page.setContent(html);await check('browser',width,scale);
    const result=await perform(html,'',{paperWidthMm:width,pageSize:'80mm',scaleFactor:scale,paperHeightMm:'auto',margins:{leftMm:1,rightMm:1}});
    assert(result.success);assert.equal(nativeOptions.scaleFactor,100);
    assert.equal(nativeOptions.pageSize.width,width*1000);
    await check('native',width,scale);
    if ([58,80].includes(width) && [100,200].includes(scale)) {
     const pdf=Buffer.from(await page.pdf({preferCSSPageSize:true,printBackground:true})).toString('latin1');
     const boxes=[...pdf.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
     assert(boxes.length, 'PDF must contain page dimensions');
     for (const box of boxes) assert(Math.abs(Number(box[1])*25.4/72-width)<0.6, 'PDF width must match the selected roll: '+JSON.stringify({root,width,scale,box,nativeOptions}));
    }
   }
   // Line wrapping must preserve content, readable amounts, and fixed-page continuation.
   const sample={...data,businessName:'Classic World',invoiceNo:'INV-1042',customerName:'Customer',shopAddress:'Dhaka',subtotal:1250,total:1250,paidAmount:1250,due:0,
    items:[{product:{name:'Cotton shirt with a long description that continues naturally on the next line'},qty:1,sellPrice:1250}]};
   for (const width of [58,80]) {
    const config={...hw.DEFAULT_HARDWARE_SETTINGS,paperWidthMm:width,printScale:100,paperHeightMm:40};
    await page.setContent(invoice.buildInvoiceHtml(sample,config));
    await check('wrapping',width,100);
    const row=await page.evaluate(()=>{
     const name=document.querySelector('.receipt-item > div') || document.querySelector('tbody td');
     const range=document.createRange();range.selectNodeContents(name);
     const lines=new Set(Array.from(range.getClientRects()).map(r=>Math.round(r.top)));
     const wrap=document.querySelector('.receipt-wrap');
     const amounts=Array.from(document.querySelectorAll('.receipt-row > span:last-child')).filter(e=>e.textContent.trim()==='৳1,250');
     return {lines:lines.size,height:wrap.getBoundingClientRect().height,overflow:getComputedStyle(wrap).overflow,
      amountIntact:amounts.every(e=>{const r=document.createRange();r.selectNodeContents(e);return new Set(Array.from(r.getClientRects()).map(x=>Math.round(x.top))).size===1;})};
    });
    assert(row.lines>1,'Long descriptions must use multiple lines');
    assert(row.amountIntact,'Ordinary amounts should move as a unit instead of splitting digits');
    assert.equal(row.overflow,'visible','Receipt content must not be clipped');
    if (root==='.') await page.screenshot({path:path.join(require('os').tmpdir(),'invoice-wrap-'+width+'.png'),fullPage:true});
    const many={...sample,items:Array.from({length:20},()=>sample.items[0])};
    await page.setContent(invoice.buildInvoiceHtml(many,config));
    const pdf=Buffer.from(await page.pdf({preferCSSPageSize:true})).toString('latin1');
    assert([...pdf.matchAll(/\/Type\s*\/Page\b/g)].length>1,'Fixed-height paper must continue onto further pages');
    const height=await page.evaluate(()=>document.querySelector('.receipt-wrap').getBoundingClientRect().height*25.4/96);
    assert(height>40,'Long invoices must grow beyond the first page rather than truncate');
   }
   // Legacy receipt path must send its own width/height, rather than hardware defaults.
   storage.set('dreamfashion_pos_paper_config',JSON.stringify({widthMm:58,heightMm:100,canvasWidthMm:82,marginMm:1}));
   storage.set('classicworld_pos_paper_config',JSON.stringify({widthMm:58,heightMm:100,canvasWidthMm:82,marginMm:1}));
   await pos.printPwaPosReceipt({...data,date:data.invoiceDate,items:[{name:'LongSKU'.repeat(30),qty:100,price:999999}],discount:0,paid:100});
   assert.equal(captured.paperWidthMm,58);assert.equal(captured.paperHeightMm,100);
   await page.setContent(captured.html);await check('legacy',58,200);
   // Exercise the actual hidden-iframe fallback, including its pre-print sizing code.
   const modules={};
   for (const name of ['print-layout','pos-hardware','format','pos-print','invoice-printer']) {
    modules[name]=ts.transpileModule(fs.readFileSync(path.join(root,'src/lib',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
   }
   await page.goto('about:blank');
   await page.setContent('<html><body></body></html>');
   const fallback=await page.evaluate(async (modules)=>{
    const cache={};
    function load(name) {
     if(cache[name])return cache[name].exports;
     const module={exports:{}};cache[name]=module;
     new Function('module','exports','require',modules[name])(module,module.exports,id=>load(id.slice(6)));
     return module.exports;
    }
    // No hardware bridge: use the real browser fallback.
    window.fetch=async()=>({ok:false});
    let finish;
    const result=new Promise(resolve=>finish=resolve);
    const observer=new MutationObserver(records=>{
     for(const record of records)for(const iframe of record.addedNodes)if(iframe.tagName==='IFRAME'){
      const hook=()=>{iframe.contentWindow.print=()=>{
       const doc=iframe.contentDocument;
       const wrap=doc.querySelector('.receipt-wrap');
       const rules=Array.from(doc.styleSheets).flatMap(sheet=>Array.from(sheet.cssRules));
       finish({width:wrap.getBoundingClientRect().width,size:rules.filter(r=>r.constructor.name==='CSSPageRule').at(-1)?.style.size});
      };};hook();iframe.addEventListener('load',hook);
     }
    });observer.observe(document.body,{childList:true});
    const hw=load('pos-hardware');
    await load('invoice-printer').printPwaInvoice({businessName:'Test',invoiceNo:'1',invoiceDate:'Today',items:[{product:{name:'LongSKU'.repeat(30)},qty:1,sellPrice:100}],subtotal:100,discountAmount:0,total:100,paidAmount:100,due:0},{...hw.DEFAULT_HARDWARE_SETTINGS,paperWidthMm:58,paperHeightMm:'auto',printScale:200});
    const value=await Promise.race([result,new Promise((_,reject)=>setTimeout(()=>reject(Error('Fallback print timed out')),5000))]);
    observer.disconnect();return value;
   },modules);
   assert(fallback.width<=48*96/25.4+1, 'Hidden iframe receipt must fit');
   assert(fallback.size!=='auto', 'Fallback must set the physical page dimensions before printing');
   checked++;
  }
  console.log(`PASS: ${checked} rendered print layouts across both projects; native scale and paper-size options verified.`);
 } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});




