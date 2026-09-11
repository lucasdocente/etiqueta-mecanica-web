(function(global){
  'use strict';
  const MM=72/25.4;
  const f=n=>Number(n.toFixed(3));
  const esc=s=>latin1(String(s)).replace(/([\\()])/g,'\\$1');
  function latin1(s){
    const map={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
    let out='';
    for(const ch of s){const code=ch.charCodeAt(0);out+=String.fromCharCode(code<=255?code:(map[ch]??63));}
    return out;
  }
  function width(text,size,bold=false){
    let units=0;
    for(const ch of String(text)){
      if(ch===' ')units+=.278;else if('ilI.,:;!|'.includes(ch))units+=.28;
      else if('mwMW@%'.includes(ch))units+=.82;else if(/[A-Z]/.test(ch))units+=.64;
      else if(/[0-9]/.test(ch))units+=.56;else units+=.5;
    }
    return units*size*(bold?1.03:1);
  }
  function fit(text,max,min,available,bold=false){let size=max;while(size>min&&width(text,size,bold)>available)size-=.25;return Math.max(min,size);}
  function shorten(text,size,available,bold=false){
    if(width(text,size,bold)<=available)return text;let value=text;
    while(value&&width(value+'…',size,bold)>available)value=value.slice(0,-1);
    return value.trimEnd()+'…';
  }
  function wrap(text,size,available,bold=false){
    const words=String(text).trim().split(/\s+/).filter(Boolean),lines=[];let current='';
    for(const word of words){
      const candidate=(current+' '+word).trim();
      if(width(candidate,size,bold)<=available){current=candidate;continue;}
      if(current){lines.push(current);current='';}
      let part='';for(const ch of word){if(part&&width(part+ch,size,bold)>available){lines.push(part);part=ch;}else part+=ch;}current=part;
    }
    if(current)lines.push(current);return lines.length?lines:[''];
  }
  function fitWrapped(text,max,available,height,bold=false){
    let size=max;while(size>=.75){const lines=wrap(text,size,available,bold);if(lines.length*size*1.15<=height)return{size,lines};size-=.25;}
    return{size:.75,lines:wrap(text,.75,available,bold)};
  }
  function textCmd(text,font,size,x,y,align='left'){
    let xx=x;if(align==='center')xx-=width(text,size,font==='F2')/2;if(align==='right')xx-=width(text,size,font==='F2');
    return `BT /${font} ${f(size)} Tf ${f(xx)} ${f(y)} Td (${esc(text)}) Tj ET\n`;
  }
  function lineCmd(x1,y1,x2,y2,weight=.5){return `${f(weight)} w ${f(x1)} ${f(y1)} m ${f(x2)} ${f(y2)} l S\n`;}
  function roundRect(x,y,w,h,r,weight=.5){
    const k=.5522847498,kr=r*k;
    return `${f(weight)} w ${f(x+r)} ${f(y)} m ${f(x+w-r)} ${f(y)} l ${f(x+w-r+kr)} ${f(y)} ${f(x+w)} ${f(y+r-kr)} ${f(x+w)} ${f(y+r)} c ${f(x+w)} ${f(y+h-r)} l ${f(x+w)} ${f(y+h-r+kr)} ${f(x+w-r+kr)} ${f(y+h)} ${f(x+w-r)} ${f(y+h)} c ${f(x+r)} ${f(y+h)} l ${f(x+r-kr)} ${f(y+h)} ${f(x)} ${f(y+h-r+kr)} ${f(x)} ${f(y+h-r)} c ${f(x)} ${f(y+r)} l ${f(x)} ${f(y+r-kr)} ${f(x+r-kr)} ${f(y)} ${f(x+r)} ${f(y)} c S\n`;
  }
  function content(data){
    const w=data.width*MM,h=data.height*MM,pad=Math.min(4*MM,Math.min(w,h)*.07),header=Math.max(11*MM,h*.2),cw=w-2*pad;
    let out='0 G 0 g\n';
    out+=lineCmd(pad,h-header,w-pad,h-header,.7);
    const company=(data.workshop||'NOME DA EMPRESA').trim(),title=fit(company,14,6,cw,true);
    out+=textCmd(company,'F2',title,pad,h-header/2+title*.12);
    if((data.contact||'').trim()){
      const phone=data.contact.trim(),size=fit(phone,6.5,4,cw);
      out+=textCmd(shorten(phone,size,cw),'F1',size,pad,h-header/2-size*1.05);
    }
    let top=h-header-pad*.75,bottom=pad;
    const identity=[];
    if(data.customer?.trim())identity.push('Cliente: '+data.customer.trim());
    if(data.vehicle?.trim())identity.push('Veículo: '+data.vehicle.trim());
    if(data.plate?.trim())identity.push('Placa: '+data.plate.trim().toUpperCase());
    if(identity.length){const joined=identity.join('   |   '),size=fit(joined,7.2,4.2,cw);out+=textCmd(shorten(joined,size,cw),'F1',size,pad,top-size);top-=Math.max(size*1.7,4.2*MM);}
    const current=[];
    if(data.serviceDate?.trim())current.push(['DATA',data.serviceDate.trim()]);
    if(data.currentKm?.trim())current.push(['KM ATUAL',data.currentKm.trim()]);
    if(current.length){const bh=9*MM;out+=roundRect(pad,top-bh,cw,bh,2*MM,.5);const cell=cw/current.length;
      current.forEach(([label,value],i)=>{const cx=pad+cell*(i+.5);out+=textCmd(label,'F2',5.3,cx,top-3*MM,'center');const size=fit(value,9,5,cell-pad,true);out+=textCmd(value,'F2',size,cx,top-6.8*MM,'center');});top-=bh+2*MM;}
    const rows=(data.maintenance||[]).filter(row=>row.enabled&&row.name.trim()&&row.value.trim());
    const noteLines=data.notes?.trim()?wrap(data.notes.trim(),4.8,cw).slice(0,2):[];
    const noteH=(noteLines.length*3.2+(noteLines.length?1.5:0))*MM,available=Math.max(0,top-bottom-noteH);
    if(rows.length&&available>3*MM){const hh=4.3*MM,rh=(available-hh)/rows.length,base=Math.max(3.2,Math.min(8.2,rh*.48));out+=textCmd('PRÓXIMAS TROCAS','F2',Math.min(7.5,base),w/2,top-Math.min(7.5,base),'center');let rowTop=top-hh;
      rows.forEach((row,i)=>{if(i)out+=lineCmd(pad,rowTop,w-pad,rowTop,.25);const category=row.name.trim().toLocaleUpperCase('pt-BR'),left=fitWrapped(category,base,cw*.59,rh*.82),right=fitWrapped(row.value,base,cw*.38,rh*.82,true);let ly=rowTop-(rh-left.lines.length*left.size*1.15)/2-left.size,ry=rowTop-(rh-right.lines.length*right.size*1.15)/2-right.size;left.lines.forEach(line=>{out+=textCmd(line,'F1',left.size,pad,ly);ly-=left.size*1.15;});right.lines.forEach(line=>{out+=textCmd(line,'F2',right.size,w-pad,ry,'right');ry-=right.size*1.15;});rowTop-=rh;});}
    if(noteLines.length){let y=bottom+(noteLines.length-1)*3.2*MM;noteLines.forEach(line=>{out+=textCmd(shorten(line,4.8,cw),'F3',4.8,pad,y);y-=3.2*MM;});}
    return out;
  }
  function bytesFromString(str){const bytes=new Uint8Array(str.length);for(let i=0;i<str.length;i++)bytes[i]=str.charCodeAt(i)&255;return bytes;}
  function build(data,copies=1){
    copies=Math.max(1,Math.min(100,Number(copies)||1));const w=f(data.width*MM),h=f(data.height*MM),stream=content(data),objects=[],fontStart=3+copies*2;
    objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
    const kids=[];for(let i=0;i<copies;i++)kids.push(`${3+i*2} 0 R`);
    objects[2]=`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${copies} >>`;
    for(let i=0;i<copies;i++){const page=3+i*2,contents=page+1;objects[page]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /Font << /F1 ${fontStart} 0 R /F2 ${fontStart+1} 0 R /F3 ${fontStart+2} 0 R >> >> /Contents ${contents} 0 R >>`;objects[contents]=`<< /Length ${stream.length} >>\nstream\n${stream}endstream`;}
    objects[fontStart]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objects[fontStart+1]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    objects[fontStart+2]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>';
    objects[fontStart+3]=`<< /Title (${esc('Etiqueta de próxima manutenção')}) /Author (${esc(data.workshop||'Etiqueta Mecânica')}) /Producer (${esc('Etiqueta Mecânica Web')}) >>`;
    let pdf='%PDF-1.4\n%âãÏÓ\n',offsets=[0];
    for(let i=1;i<objects.length;i++){offsets[i]=pdf.length;pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`;}
    const xref=pdf.length;pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for(let i=1;i<objects.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
    pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R /Info ${fontStart+3} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return bytesFromString(pdf);
  }
  const api={build,mmToPt:value=>value*MM};
  global.LabelPdf=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
