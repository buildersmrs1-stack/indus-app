const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const LEADS_FILE = path.join(__dirname, 'leads.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const APK_META = path.join(__dirname, 'apk-meta.json');
const LOGO_META = path.join(__dirname, 'logo-meta.json');

if(!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if(!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]');

app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOAD_DIR));

function readLeads(){ try{return JSON.parse(fs.readFileSync(LEADS_FILE,'utf8'))}catch(e){return[]} }
function writeLeads(l){ fs.writeFileSync(LEADS_FILE, JSON.stringify(l, null, 2)); }

app.get('/api/leads', (req,res)=> res.json(readLeads()));

app.post('/api/lead', (req,res)=>{
  const { kind, payload } = req.body || {};
  const leads = readLeads();
  if(kind === 'FORM_SUBMITTED' && payload && payload.user){
    leads.push({
      id: Date.now(),
      name: payload.user.name || '',
      phone: payload.user.phone || '',
      dob: payload.user.dob || '',
      motherName: payload.user.motherName || '',
      serviceType: payload.serviceType || '',
      time: Date.now()
    });
    writeLeads(leads);
  }
  res.json({ ok:true });
});

const apkStorage = multer.diskStorage({
  destination: (_,__,cb)=>cb(null, UPLOAD_DIR),
  filename: (_,f,cb)=>cb(null, 'app-' + Date.now() + '.apk')
});
const uploadApk = multer({ storage: apkStorage });

app.post('/api/upload-apk', uploadApk.single('apk'), (req,res)=>{
  if(!req.file) return res.status(400).json({ error:'No file' });
  const meta = { url: '/uploads/' + req.file.filename, name: req.file.originalname };
  fs.writeFileSync(APK_META, JSON.stringify(meta));
  res.json({ ok:true, ...meta });
});

app.get('/api/apk', (req,res)=>{
  try{ res.json(JSON.parse(fs.readFileSync(APK_META,'utf8'))); }
  catch(e){
    const fallback = path.join(__dirname,'download.apk');
    if(fs.existsSync(fallback)) res.json({ url:'/download.apk', name:'download.apk' });
    else res.json({ url:null, name:null });
  }
});

const logoStorage = multer.diskStorage({
  destination: (_,__,cb)=>cb(null, UPLOAD_DIR),
  filename: (_,f,cb)=>cb(null, 'logo-' + Date.now() + path.extname(f.originalname))
});
const uploadLogo = multer({ storage: logoStorage });

app.post('/api/upload-logo', uploadLogo.single('logo'), (req,res)=>{
  if(!req.file) return res.status(400).json({ error:'No file' });
  const meta = { url: '/uploads/' + req.file.filename, name: req.file.originalname };
  fs.writeFileSync(LOGO_META, JSON.stringify(meta));
  res.json({ ok:true, ...meta });
});

app.get('/api/logo', (req,res)=>{
  try{ res.json(JSON.parse(fs.readFileSync(LOGO_META,'utf8'))); }
  catch(e){ res.json({ url:null, name:null }); }
});

app.listen(PORT, ()=>console.log(`Server running on http://localhost:${PORT}`));