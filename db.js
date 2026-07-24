// =============================================
// db.js — Base de datos Firebase Firestore
// =============================================

// ---- FIREBASE CONFIG ----
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, getDocs,
         setDoc, deleteDoc, addDoc, onSnapshot,
         query, orderBy, where, enableNetwork } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAhwzL1twKyV_umfRYEw1FUzPyDI_5y7vI",
  authDomain:        "dietas-conductores.firebaseapp.com",
  projectId:         "dietas-conductores",
  storageBucket:     "dietas-conductores.firebasestorage.app",
  messagingSenderId: "1024050278672",
  appId:             "1:1024050278672:web:5ce9e2f86694cc6e86f595"
};

const _app = initializeApp(firebaseConfig);
const db   = getFirestore(_app);

// ---- COLECCIONES ----
const COL_CONDUCTORES  = 'conductores';
const COL_TARIFAS      = 'tarifas';
const COL_REGISTROS    = 'registros';
const COL_TRACTORAS    = 'tractoras';
const COL_CONCEPTOS    = 'conceptos_gasto'; // conceptos de gastos de viaje
const COL_GASTOS_IND   = 'gastosIndependientes';
const COL_ANTICIPOS    = 'anticipos';
const COL_EMBARGOS     = 'embargos';

// ---- SCHEMA VERSION (para seed inicial) ----

// ====================================================
// TARIFAS DEFAULT
// ====================================================
const TARIFAS_DEFAULT = [
  { CONCEPTO: 'CARGA/DESCARGAS',   TJG: 10,   CAUDETE: 15.45, FILARDI: 0   },
  { CONCEPTO: 'MOV. PALETS',       TJG: 10,   CAUDETE: 5.15,  FILARDI: 0   },
  { CONCEPTO: 'REBOTE',            TJG: 80,   CAUDETE: 82.40, FILARDI: 80  },
  { CONCEPTO: 'UK',                TJG: 0,    CAUDETE: 0,     FILARDI: 50  },
  { CONCEPTO: 'NDLF',              TJG: 0,    CAUDETE: 0,     FILARDI: 20  },
  { CONCEPTO: 'ACARREOS',          TJG: 15,   CAUDETE: 0,     FILARDI: 15  },
  { CONCEPTO: 'DIETA_VLISSINGEN',  TJG: 110,  CAUDETE: 0,     FILARDI: 110 },
  { CONCEPTO: 'DIA',               TJG: 80,   CAUDETE: 77.25, FILARDI: 0   },
  { CONCEPTO: 'DOMINGO_FESTIVOS',  TJG: 0,    CAUDETE: 36.05, FILARDI: 0   },
  { CONCEPTO: 'HORAS',             TJG: 0,    CAUDETE: 3.22,  FILARDI: 0   },
  { CONCEPTO: '24HORAS_PAUSA',     TJG: 80,   CAUDETE: 0,     FILARDI: 0   },
  { CONCEPTO: 'NACIONAL',          TJG: 0,    CAUDETE: 10.30, FILARDI: 0   },
];

// ====================================================
// CONDUCTORES DEFAULT (131 registros)
// ====================================================
const CONDUCTORES_DEFAULT = [
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10001', Nombre:'ENCHEV, TSVETAN IVANOV', NIF:'X4341880D', IBAN:'ES1400814238870001999302', PrecioKmt:0.14, Email:'ivanovenchev@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10004', Nombre:'ROMANOV, ANATOLIY', NIF:'X6524356S', IBAN:'ES8100811434140006320148', PrecioKmt:0.14, Email:'tellmy75@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10006', Nombre:'GALBEAZA, CONSTANTIN GABRIEL', NIF:'Y4271693D', IBAN:'ES0530580334522810035511', PrecioKmt:0.14, Email:'arianagalbeaza82@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10007', Nombre:'MILEVSKI, VALENTIN IVANOV', NIF:'X7844477M', IBAN:'ES5800811452760006767189', PrecioKmt:0.14, Email:'ivanovmilevskivalentin@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10008', Nombre:'PICOITA CHECA, JORGE EDISON', NIF:'48752112R', IBAN:'ES6601827611540208518685', PrecioKmt:0.14, Email:'picoitajorgeedison2012@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10009', Nombre:'MIRON, TOADER', NIF:'X3573353G', IBAN:'ES5421008382960200115250', PrecioKmt:0.14, Email:'Mirontoader60@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10015', Nombre:'DIMITROV, GEORGI HRISTOV', NIF:'X4093636G', IBAN:'ES9101823203570201617524', PrecioKmt:0.14, Email:'ghristov378@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10018', Nombre:'IVANOV, ANDREAN DIMITROV', NIF:'X5627466X', IBAN:'ES6700494795152595025115', PrecioKmt:0.14, Email:'andreandimitrovivanov@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10019', Nombre:'GRUTZKAU, BODO', NIF:'X6280101C', IBAN:'ES1930580380372810019532', PrecioKmt:0.12, Email:'Elaleman43@msn.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10020', Nombre:'PARASHKEVOV, NEDKO HRISTOV', NIF:'X9439090M', IBAN:'ES0900750284780700486355', PrecioKmt:0.14, Email:'nedkopr@hotmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10022', Nombre:'TURCHAK, IHOR', NIF:'X5976477L', IBAN:'ES2221008221721300137935', PrecioKmt:0.14, Email:'garikturchak@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10025', Nombre:'CARTERE, VALENTIN', NIF:'Y3018064H', IBAN:'ES7214650320011759511810', PrecioKmt:0.14, Email:'valentincartere75@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10026', Nombre:'MARINOV, GEORGI SERGEEV', NIF:'Y5031523B', IBAN:'ES6100750723730705338061', PrecioKmt:0.14, Email:'mgeorgi270@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10027', Nombre:'PLOP, MARIUS EDUARD', NIF:'X9366865T', IBAN:'ES0400811462450006411056', PrecioKmt:0.14, Email:'Map31pl@yahoo.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10029', Nombre:'NAYCHIK YURIYCHUK, IHOR', NIF:'49697492N', IBAN:'ES2501824557230201515333', PrecioKmt:0.14, Email:'igor.milan2002@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'PESCADO', Codigo:'10030', Nombre:'GARCIA SALMORAL, MANUEL', NIF:'33905121Q', IBAN:'ES3001820125120208000284', PrecioKmt:0.12, Email:'mgsalmoral@hotmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10031', Nombre:'COSTA PIRES, CESAR GABRIEL', NIF:'X6950478Q', IBAN:'ES7700811158390006737285', PrecioKmt:0.14, Email:'pirescesar1980@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10035', Nombre:'BOUYISS BOUAADI, KHALID', NIF:'08194040Z', IBAN:'ES9730580426022810914890', PrecioKmt:0.14, Email:'khal.bou02@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10037', Nombre:'YAAGOUBI FERHANE, EL HOUSSINE', NIF:'55142785D', IBAN:'ES5021037842960030074461', PrecioKmt:0.14, Email:'Yaagoubi82@hotmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10039', Nombre:'ENCHEV, VASIL IVANOV', NIF:'X4917662D', IBAN:'ES3900814238880001731083', PrecioKmt:0.14, Email:'vasiliveco@hotmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10040', Nombre:'MEDVEDIUC, DUMITRU', NIF:'Y4930646N', IBAN:'ES4230580235612720074279', PrecioKmt:0.14, Email:'dimamedvediuk@gmail.com' },
  { PLATAFORMA:'CAUDETE', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10042', Nombre:'DIAZ MONTAÑEZ, ALFONSO', NIF:'52813900N', IBAN:'ES5700303016700387488273', PrecioKmt:0, Email:'alfonsodiazmonta1967@gmail.com' },
  { PLATAFORMA:'CAUDETE', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10044', Nombre:'RODRIGUEZ AVILES, FRANCISCO', NIF:'26457581Z', IBAN:'ES4230670069301609049711', PrecioKmt:0, Email:'franrodriaviles@gmail.com' },
  { PLATAFORMA:'CAUDETE', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10046', Nombre:'RAMIREZ ROLDAN, JOSE ERNESTO', NIF:'44388770N', IBAN:'ES9014650733611729629550', PrecioKmt:0, Email:'joseernestoramirez33@gmail.com' },
  { PLATAFORMA:'CAUDETE', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10047', Nombre:'LARA LENDINEZ, SALVADOR', NIF:'26457571G', IBAN:'ES9404873125899000018484', PrecioKmt:0, Email:'salvadorisa86@gmail.com' },
  { PLATAFORMA:'CAUDETE', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10048', Nombre:'GALLEGO JIMENEZ, FRANCISCO JAVIER', NIF:'75105793Y', IBAN:'ES7802370113309168642813', PrecioKmt:0, Email:'frjaviergj81@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10049', Nombre:'RADU IOAN, ANDREI', NIF:'Y1402541S', IBAN:'ES9830580248742810084492', PrecioKmt:0.14, Email:'andreiradu075@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10050', Nombre:'BOUCHBOUCH HADIR, ABDERRAZZAK', NIF:'04767355F', IBAN:'ES8421004579300100407988', PrecioKmt:0.14, Email:'abderrazzakbouchbouch@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10051', Nombre:'YAAGOUBI FERHANE, MOHAMMED', NIF:'60186210V', IBAN:'ES0421004981922100040805', PrecioKmt:0.14, Email:'mohameguapo-1987@hotmail.es' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10053', Nombre:'BADAOUI ZIANE, HASSAN', NIF:'49966781V', IBAN:'ES1221003933140100244003', PrecioKmt:0.14, Email:'basmaer120806@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10054', Nombre:'YAAGOUBI MOUYAH, YASSINE', NIF:'52020625F', IBAN:'ES2600814271510001396248', PrecioKmt:0.14, Email:'numero9yassine@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10055', Nombre:'VASILEV, PETAR ASENOV', NIF:'X4308478A', IBAN:'ES3730582517562810011822', PrecioKmt:0.14, Email:'asenovvasilev@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'COMODIN', Codigo:'10056', Nombre:'YKHLEF BOUARICHA, HADJ', NIF:'49967346F', IBAN:'ES7500811470210006188327', PrecioKmt:0.12, Email:'jamal.ykhlef@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10057', Nombre:'SEHRAOUI KHLIFI, NABIL', NIF:'04751449V', IBAN:'ES4421008182150200171303', PrecioKmt:0.14, Email:'nabilsehraoui17@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10058', Nombre:'KHAYAT CHAMECH, CHERKAOUI', NIF:'60110838Q', IBAN:'ES1830580222532810052662', PrecioKmt:0.12, Email:'cherkaouikhayat6@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10060', Nombre:'MOHAMMEDI SBAI, HAMID', NIF:'13380335Q', IBAN:'ES4500495017912398621771', PrecioKmt:0.14, Email:'HAMID_14_23@HOTMAIL.COM' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10061', Nombre:'STOYANOV, IVAN BONEV', NIF:'Y0374056K', IBAN:'ES0421004624812100265416', PrecioKmt:0.14, Email:'ivanbonevstoyanov@yahoo.es' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10062', Nombre:'SARACUT, ADRIAN VIOREL', NIF:'X6567552V', IBAN:'ES5600492217092214044223', PrecioKmt:0.14, Email:'adriansaracut21@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10064', Nombre:'CHIS, DANIEL', NIF:'X9514386E', IBAN:'ES1000811140120001153417', PrecioKmt:0.14, Email:'Chisdaniel@hotmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10065', Nombre:'BANAK, VASYL', NIF:'Y3409700X', IBAN:'ES2200750207220705052685', PrecioKmt:0.14, Email:'vasilbanax@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10066', Nombre:'CSOKA, PAVEL', NIF:'X6427448Y', IBAN:'ES9321006968101300206128', PrecioKmt:0.14, Email:'pavelcsoka55@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10067', Nombre:'DARRAZE BOUHAIDOUR, ABDERRAZZAQ', NIF:'71059158Z', IBAN:'ES2015830001169087550351', PrecioKmt:0.14, Email:'abderrazzaqdarraze@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10068', Nombre:'RYAHI GHARIB, ABDELGHANI', NIF:'58469676L', IBAN:'ES1321006333301300394605', PrecioKmt:0.12, Email:'ayoubhamadi448@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10070', Nombre:'EL MOUTTALI NADIR, ABDELALI', NIF:'54959994E', IBAN:'ES6030580221012820005734', PrecioKmt:0.12, Email:'abdelalimouttalli@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10071', Nombre:'EL GATTAOUI EL GHABI, CHARKAOUI', NIF:'29595360H', IBAN:'ES4321008741131300501769', PrecioKmt:0.12, Email:'charcaouielgattaoui002@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10072', Nombre:'ANDONOV, VLADIMIR IVANOV', NIF:'X5773977B', IBAN:'ES8801822980320201538967', PrecioKmt:0.14, Email:'vviiaa76@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10073', Nombre:'ZAYTOUNI CHLIMA, HICHAM', NIF:'49823541K', IBAN:'ES5000750284750700388376', PrecioKmt:0.12, Email:'hichamacharq@hotmail.es' },
  { PLATAFORMA:'CAUDETE', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10076', Nombre:'JIMENEZ GARCIA, MARCOS', NIF:'26457319M', IBAN:'ES5321004872222100303719', PrecioKmt:0, Email:'marcosjimenezgarcia@hotmail.com' },
  { PLATAFORMA:'CAUDETE', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10077', Nombre:'DE LA TORRE PEREZ, ALEJANDRO', NIF:'26240025S', IBAN:'ES2021001971691300082018', PrecioKmt:0, Email:'alejandrodelatorre83@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10078', Nombre:'LULOUSKI, GEORGI PETILOV', NIF:'X6632349T', IBAN:'ES3721001768310100568153', PrecioKmt:0.14, Email:'sanvisente1@abv.bg' },
  { PLATAFORMA:'CAUDETE', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10079', Nombre:'PEREZ GUERRERO, FRANCISCO JOSE', NIF:'75108985R', IBAN:'ES3930670069333398230817', PrecioKmt:0, Email:'franciscojoseperezguerrero@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10080', Nombre:'LAIME QUIROZ, JHIMI', NIF:'77636656H', IBAN:'ES4221008278550200216280', PrecioKmt:0.14, Email:'jhimilq@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10081', Nombre:'MILAD MORHLI, HICHAM', NIF:'60113159Z', IBAN:'ES3400811088130006144925', PrecioKmt:0.12, Email:'hichammilad70@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10082', Nombre:'ONISOR, GAVRILA', NIF:'X3864526C', IBAN:'ES9300495549812295367106', PrecioKmt:0.14, Email:'gavrilaonisor878@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10084', Nombre:'MEOÑO COTRINA, ELMER', NIF:'77649461N', IBAN:'ES4500492217042714072294', PrecioKmt:0.14, Email:'elmermcotrina@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10085', Nombre:'STRAMBU, DUMITRU DANIEL', NIF:'X6307135Y', IBAN:'ES7901822231640201502455', PrecioKmt:0.14, Email:'danielstrambu1986@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10087', Nombre:'VIDRASCU, ION', NIF:'Y4650154M', IBAN:'ES6430580334582720014275', PrecioKmt:0.14, Email:'ivanvidrascu1984@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10088', Nombre:'LUNGU, EMANOIL MIHAI', NIF:'Y4369797H', IBAN:'ES1900494677212816140563', PrecioKmt:0.14, Email:'taaticu@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10094', Nombre:'IVANOV GAVRAILOV, PLAMEN', NIF:'X4122936W', IBAN:'ES9130580224482810159066', PrecioKmt:0.12, Email:'plamcho67@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10097', Nombre:'DIMITROVA GAVRAILOVA, EMILIYA', NIF:'X6159080W', IBAN:'ES4430580224432810157053', PrecioKmt:0.12, Email:'emilidi69@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10098', Nombre:'VESELINOV, VESELIN BOZHIDAROV', NIF:'X4105190N', IBAN:'ES2601824491010201574207', PrecioKmt:0.14, Email:'veselinveselinov27@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10100', Nombre:'TICU, TUDOR', NIF:'X9551426D', IBAN:'ES5021004579390200185657', PrecioKmt:0.14, Email:'tudor.ticu1966@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10101', Nombre:'BITA, IULIAN', NIF:'Y7040377E', IBAN:'ES1921001285670100852084', PrecioKmt:0.14, Email:'korjoviulian@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10105', Nombre:'PONCE BLANCO, VICTOR MANUEL', NIF:'48417460E', IBAN:'ES6521007842662100046147', PrecioKmt:0.12, Email:'ponce.victor.77.vpb@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10106', Nombre:'ED DERDAK INSAF, EL MAHJOUB', NIF:'60601570C', IBAN:'ES0401827016650201612251', PrecioKmt:0.14, Email:'elmahjoubedderdak@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10108', Nombre:'EL KHALDI, YOUSSEF', NIF:'X7433283M', IBAN:'ES4621008235290200129228', PrecioKmt:0.12, Email:'yelkhaldi8@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'COMODIN', Codigo:'10112', Nombre:'CHERIFI JMILI, ABDELKADER', NIF:'49972374K', IBAN:'ES3821005866510100005877', PrecioKmt:0.12, Email:'abdelkadercherifi81@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10113', Nombre:'GINEV, EMIL RUSANOV', NIF:'X3452298K', IBAN:'ES6321002454990100424420', PrecioKmt:0.14, Email:'ginev8@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10115', Nombre:'CHAFIQ NOUMIA, YOUSSEF', NIF:'54635140C', IBAN:'ES6621008273231300378765', PrecioKmt:0.12, Email:'youssef.mk71@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10116', Nombre:'EL BOUAZZAOUI ERRAFIY, NOREDINE', NIF:'04769131N', IBAN:'ES4330580255052810634138', PrecioKmt:0.14, Email:'noredineelbo79@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10118', Nombre:'HADRAOUI AMELLAL, AYOUB', NIF:'35694863J', IBAN:'ES5621001666050200765485', PrecioKmt:0.14, Email:'ayoubeee1995@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10122', Nombre:'DIMITROV, VASIL VASILEV', NIF:'X5079895T', IBAN:'ES2121004473250200134062', PrecioKmt:0.14, Email:'wasil810518@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10123', Nombre:'AGAPIE, VIOREL', NIF:'Y3315712T', IBAN:'ES5701820136110201544820', PrecioKmt:0.12, Email:'rc1347763@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10124', Nombre:'SARBU, DANIELA DUMITRA', NIF:'Y3091138K', IBAN:'ES5701820136110201544820', PrecioKmt:0.12, Email:'sarbudanieladumitra@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10125', Nombre:'CHIFOR, ION', NIF:'X6189529E', IBAN:'ES2721006549521300082745', PrecioKmt:0.12, Email:'ionionchifor@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10126', Nombre:'CHIFOR, ADRIANA', NIF:'X6189485R', IBAN:'ES2721006549521300082745', PrecioKmt:0.12, Email:'adrianachifor@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10127', Nombre:'MUNTEANU, CARMEN', NIF:'Y8579643J', IBAN:'ES0421004902522200135680', PrecioKmt:0.12, Email:'munteanu.carmen16@yahoo.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10128', Nombre:'MUNTEANU, ELVIS ION', NIF:'Y8579681M', IBAN:'ES0421004902522200135680', PrecioKmt:0.12, Email:'munteanuelvision@yahoo.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10129', Nombre:'MBAYE, AYIB', NIF:'Y0907440N', IBAN:'ES7814650100931765537917', PrecioKmt:0.14, Email:'Dame77300@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10130', Nombre:'AJIL BOUMADYANE, SALAH', NIF:'34368168G', IBAN:'ES3030580276112720077514', PrecioKmt:0.12, Email:'salah_rodian@hotmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10131', Nombre:'CHAKOUK FAIED, ADIL', NIF:'60554736Z', IBAN:'ES7530580276192720017918', PrecioKmt:0.12, Email:'chakoukjannat7@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10133', Nombre:'BOUXE, JAOUAD', NIF:'X9101720E', IBAN:'ES4730580087422810054773', PrecioKmt:0.12, Email:'bouxmaroc@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10134', Nombre:'SAKRANI SITAIEB, LAHOUARI', NIF:'55359830A', IBAN:'ES2900811361660001644167', PrecioKmt:0.14, Email:'sakranisakrani71@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10135', Nombre:'BAHRAOUI DAHIBI, ABDESSAMAD', NIF:'78131021K', IBAN:'ES0500493839812494502361', PrecioKmt:0.14, Email:'abdessamaddahibi@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10136', Nombre:'AXIUC, DUMITRU', NIF:'X7226205L', IBAN:'ES5200494677212816104273', PrecioKmt:0.12, Email:'parascaparasca385@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10139', Nombre:'BARKI DAHANI, ABDELOUAHED', NIF:'60343944V', IBAN:'ES0421008229321300073956', PrecioKmt:0.12, Email:'abdelouahedbarki42@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10142', Nombre:'TRIVIÑO BRAVO, CARMEN JOSEFA', NIF:'58467768C', IBAN:'ES1300811092110001516458', PrecioKmt:0.12, Email:'udelithon@hotmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10143', Nombre:'CEDEÑO ZAMORA, UBELITHON SIRLEY', NIF:'58468690E', IBAN:'ES9400811092130001516260', PrecioKmt:0.12, Email:'udelithon@hotmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10147', Nombre:'TAKOV, TRIFON SPASOV', NIF:'X6386706C', IBAN:'ES5600494795172316029062', PrecioKmt:0.14, Email:'trifontakov@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10148', Nombre:'PINTECAN, MARICICA', NIF:'Y1567670G', IBAN:'ES7521037740630010027142', PrecioKmt:0.12, Email:'martemaria754@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10149', Nombre:'HADRAOUI, DRISS', NIF:'X8720692N', IBAN:'ES2800493635212814024260', PrecioKmt:0.12, Email:'drishadraoui1@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10150', Nombre:'PINTECAN, IOAN MARINEL', NIF:'X9020806E', IBAN:'ES8520456019920000392780', PrecioKmt:0.12, Email:'pintecanmarinel@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10155', Nombre:'GOMES DA SILVA NETO, GABRIEL', NIF:'Z1752283X', IBAN:'ES8721002032010200315367', PrecioKmt:0.12, Email:'ggneto2017@outlook.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10156', Nombre:'DANTAS DE SOUZA SILVA, TAIS', NIF:'Z1752338L', IBAN:'ES2421002032060200315480', PrecioKmt:0.12, Email:'ttais39@hotmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10158', Nombre:'EL HAJGUER EL MESSAOUDI, JAMAL', NIF:'35693641X', IBAN:'ES5621002916710100348692', PrecioKmt:0.14, Email:'jamalelhajguer@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10161', Nombre:'EFTEMIE, MARCELA', NIF:'X8526107F', IBAN:'ES4621002904070242745213', PrecioKmt:0.12, Email:'alexiamireluca1978@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10162', Nombre:'NEACSU ADRIAN', NIF:'X9484898C', IBAN:'ES6521008278590200287353', PrecioKmt:0.12, Email:'adrianneacsu617@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10165', Nombre:'BOUXE, ADIL', NIF:'X8120151R', IBAN:'ES1030580990232762739240', PrecioKmt:0.12, Email:'boxadil07@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10166', Nombre:'COLLADO NAVARRO, ALEJANDRO', NIF:'23309233K', IBAN:'ES4130580417822810023035', PrecioKmt:0.12, Email:'alejandrocolladonavarro@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10167', Nombre:'CARNERO LOZANO, JAVIER', NIF:'23295050Y', IBAN:'ES8001821051110202534034', PrecioKmt:0.12, Email:'javiercarnero93@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'COMODIN', Codigo:'10174', Nombre:'TALHAOUI, RACHID', NIF:'X6479836T', IBAN:'ES2921002904000206736067', PrecioKmt:0.12, Email:'molinarachid2000@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10175', Nombre:'BERLEA, OVIDIU', NIF:'X7704935G', IBAN:'ES9030580990212758273279', PrecioKmt:0.14, Email:'ovidiu198328@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'COMODIN', Codigo:'10176', Nombre:'EL MANSOURI, EL HABIB', NIF:'X6933127F', IBAN:'ES4121003763442100213486', PrecioKmt:0.12, Email:'habiblmnsr@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'COMODIN', Codigo:'10177', Nombre:'KARRATI NAJEH, RACHID', NIF:'60132221D', IBAN:'ES7821001666090200269999', PrecioKmt:0.12, Email:'rachid.ka50@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10180', Nombre:'EL MOUHIB, YOUSSEF', NIF:'X5270372Z', IBAN:'ES1930580292642810927910', PrecioKmt:0.12, Email:'youssefelmouhib5@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'COMODIN', Codigo:'10181', Nombre:'BASSRI, OMAR', NIF:'Y1894523G', IBAN:'ES4200495783772816033799', PrecioKmt:0.12, Email:'bassriomar5@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10187', Nombre:'BENYAGOUB MACHITIOUI, OMAR', NIF:'04750305T', IBAN:'ES1930580223162720016388', PrecioKmt:0.12, Email:'omar944@live.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10188', Nombre:'RIBEIRO, LIDIA SILVA', NIF:'Y8734270B', IBAN:'ES9700494284152514034076', PrecioKmt:0.12, Email:'espanhalidia041@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10189', Nombre:'RIBEIRO, RAFAEL', NIF:'Y8734171G', IBAN:'ES5700494284172314034084', PrecioKmt:0.12, Email:'rafael.ribeiro1982rr@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'PESCADO', Codigo:'10190', Nombre:'RAISSOUNI, CHARIFA', NIF:'Y6755785D', IBAN:'ES3521002362320200395575', PrecioKmt:0.12, Email:'charifaraissouni@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10191', Nombre:'TOTKOV, DIMITAR ANGELOV', NIF:'X8001159B', IBAN:'ES3500494396172110054176', PrecioKmt:0.12, Email:'dimitartotkov@abv.bg' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10192', Nombre:'YANULAQUE ROJAS, KATTY MARIA', NIF:'07118597M', IBAN:'ES5400496089022916179211', PrecioKmt:0.12, Email:'kyanulaquerojas@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10193', Nombre:'VISAN, PETRE MARIAN', NIF:'X6717240K', IBAN:'ES9430582582332810012456', PrecioKmt:0.12, Email:'petremarianvisan@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10194', Nombre:'VISAN, MARIA ALEXANDRA', NIF:'Y1488501R', IBAN:'ES9830580990242759636808', PrecioKmt:0.12, Email:'visan.mariaalexa@yahoo.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10195', Nombre:'HSAINE HSAINI, ISMAIL', NIF:'60105762T', IBAN:'ES5621004473290200122372', PrecioKmt:0.12, Email:'ismaelima28@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'COMODIN', Codigo:'10197', Nombre:'TORRES ARROYAVE, GABRIEL', NIF:'49478142J', IBAN:'ES6921004981912100119224', PrecioKmt:0.12, Email:'gatoa72@gmail.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'PRACTICAS', Codigo:'10201', Nombre:'VILSAN, ROBERT ANDREI', NIF:'X9813951N', IBAN:'ES8721003933110200189563', PrecioKmt:0.03, Email:'robeerto.2700@icloud.com' },
  { PLATAFORMA:'TJG', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'10202', Nombre:'MOUMEH KARAMI, ABDELLATIF', NIF:'54848824B', IBAN:'ES1921004329110100643070', PrecioKmt:0.12, Email:'moumehabdellatif@gmail.com' },
  { PLATAFORMA:'FILARDI', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'110012', Nombre:'BERMUDEZ JIMENEZ, JOSE JOAQUIN', NIF:'52815986M', IBAN:'ES7321003982150100658088', PrecioKmt:0.125, Email:'Joaquinberji@gmail.com' },
  { PLATAFORMA:'FILARDI', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'110014', Nombre:'CASTILLO CRUZ, ALFONSO', NIF:'22957892M', IBAN:'ES3221004579340100117825', PrecioKmt:0.125, Email:'alfonsocastillocruz65@gmail.com' },
  { PLATAFORMA:'FILARDI', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'110015', Nombre:'COSTAMAGNA, OSCAR DANIEL', NIF:'X5616409Q', IBAN:'ES9530580131412810034395', PrecioKmt:0.125, Email:'odcostamagna@hotmail.com' },
  { PLATAFORMA:'FILARDI', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'110016', Nombre:'DA SILVA MARÇAL, FRANCISCO DE ASIS', NIF:'54238821Z', IBAN:'ES5502350203800154525729', PrecioKmt:0.125, Email:'afrankcsilba@gmail.com' },
  { PLATAFORMA:'FILARDI', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'110017', Nombre:'DINCA, FLORIN TONI', NIF:'X5241130M', IBAN:'ES1301829465670208266446', PrecioKmt:0.125, Email:'tonyanyspeed83@gmail.com' },
  { PLATAFORMA:'FILARDI', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'110021', Nombre:'GARCIA ESPINOZA, MANUEL JACINTO', NIF:'48751217A', IBAN:'ES2321003864230200152934', PrecioKmt:0.125, Email:'manueljacintogarciaespinoza@gmail.com' },
  { PLATAFORMA:'FILARDI', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'110022', Nombre:'GARCIA MOLINA, JOSE MARIA', NIF:'23224430L', IBAN:'ES9300494677222716110842', PrecioKmt:0.125, Email:'josemaria.ga.21@gmail.com' },
  { PLATAFORMA:'FILARDI', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'110027', Nombre:'IONITA, SORIN GHEORGHE', NIF:'Y4625821Y', IBAN:'ES7100811043190001614472', PrecioKmt:0.125, Email:'sorinionita652@gmail.com' },
  { PLATAFORMA:'FILARDI', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'110029', Nombre:'MAGAÑA PARDO, ANICETO', NIF:'27455675T', IBAN:'ES5701287820810103163572', PrecioKmt:0.125, Email:'aniankintarueda@gmail.com' },
  { PLATAFORMA:'FILARDI', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'110033', Nombre:'MARTINEZ ASIS, FULGENCIO', NIF:'29062748V', IBAN:'ES2701280661120100054104', PrecioKmt:0.125, Email:'fulgenma70.fma@gmail.com' },
  { PLATAFORMA:'FILARDI', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'110034', Nombre:'MURESAN, SORIN LUCIAN', NIF:'X9213277Y', IBAN:'ES2221004849282100240240', PrecioKmt:0.125, Email:'sorinmuresan250@gmail.com' },
  { PLATAFORMA:'FILARDI', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'110040', Nombre:'TORRES GALLEGO, RAMON JOSE', NIF:'34833770V', IBAN:'ES5121008200801300236332', PrecioKmt:0.125, Email:'montorresgallego@gmail.com' },
  { PLATAFORMA:'FILARDI', CATEGORIA:'CONDUCTOR/MECANICO', Codigo:'110042', Nombre:'VILSAN, FLORIN', NIF:'X9778926Q', IBAN:'ES9801827611590201636005', PrecioKmt:0.125, Email:'vilsanflorin1973@gmail.com' },
];

// ====================================================
// TRACTORAS DEFAULT (98 matrículas)
// ====================================================
const TRACTORAS_DEFAULT = [
  '0623MLC','0626MLC','0635MLC','1221MTM','1236MHJ','1282MTM','1304MTM',
  '1353MTM','1393MGV','1437MTM','1464MTM','1654MWX','1703MTM','1715MWX',
  '1747MTM','1747MWX','1810MWX','1846MTM','1884MWX','1920MTM','2088MHF',
  '2089MHF','2092MHF','2093MHF','2094MHF','2142MKY','2144MKY','2150MKY',
  '2151MKY','2153MKY','2155MKY','2156MKY','2157MKY','2158MKY','2159MKY',
  '2160MKY','2161MKY','2162MKY','2163MKY','2175MKY','2758MHC','3816MBN',
  '3817MBN','3895MKL','3896MKL','3897MKL','4493MXS','4578NDP','4668MXS',
  '4682MXS','4770MXS','4849MXS','4874MXS','4879NDP','4918MGP','4919MGP',
  '4920MGP','4921MGP','4922MGP','4923MGP','4924MGP','5001NDP','5037MXS',
  '5083MXS','5099NDP','5180MXS','5199NDP','5269NDP','5280MXS','5405NDP',
  '5661MFB','5662MFB','6395MJM','6399MJM','6402MJM','8354JYH','8359MLL',
  '8360MLL','8361MLL','8362MLL','8364MLL','8381MLL','8395MLL','8630MGG',
  '8631MGG','8632MGG','8633MGG','9435MWW','9644MJJ','9645MJJ','9646MJJ',
  '9647MJJ','9648MJJ','9649MJJ','9650MJJ','9651MJJ','9652MJJ','9654MJJ',
].map(m => ({ matricula: m }));
let _conductores    = null;
let _tarifas        = null;
let _registros      = [];
let _tractoras      = [];
let _conceptos      = [];
let _unsubRegistros = null;
let _rangoActual     = '3m'; // '3m' | '6m' | 'ano' | 'todo'

// ====================================================
// INIT — carga datos y arranca listener de registros
// ====================================================
export async function initDB() {
  await enableNetwork(db);
  await Promise.all([cargarConductores(), cargarTarifas(), cargarTractoras(), cargarConceptos()]);
  // NO llamar cargarRegistros() — onSnapshot ya hace la carga inicial
  // y llamar ambos causaba que _registros tuviese el mismo ID dos veces
  await new Promise(resolve => escucharRegistros(_rangoActual, resolve));
}

// ====================================================
// CONDUCTORES
// ====================================================
async function cargarConductores() {
  try {
    const snap = await getDocs(collection(db, COL_CONDUCTORES));
    if (snap.size === 0) {
      // Solo sembrar si la colección está completamente vacía
      await seedConductores();
    } else {
      _conductores = snap.docs.map(d => {
        const c = d.data();
        return { ...c, Codigo: padCodigo(c.Codigo) };
      });
    }
  } catch (e) {
    console.error('Error cargando conductores:', e);
    _conductores = [...CONDUCTORES_DEFAULT];
  }
}

async function seedConductores() {
  const normalizados = CONDUCTORES_DEFAULT.map(c => ({
    ...c, Codigo: padCodigo(c.Codigo)
  }));
  await Promise.all(
    normalizados.map(c => setDoc(doc(db, COL_CONDUCTORES, c.Codigo), c))
  );
  _conductores = normalizados;
}

export function getConductores() {
  return _conductores || [...CONDUCTORES_DEFAULT];
}

// ---- NORMALIZAR CÓDIGO A 6 DÍGITOS ----
function padCodigo(codigo) {
  return String(codigo).trim().padStart(6, '0');
}

export function buscarConductor(codigo) {
  const cod = padCodigo(codigo);
  return getConductores().find(c => padCodigo(c.Codigo) === cod) || null;
}

export async function upsertConductor(conductor) {
  conductor.Codigo = padCodigo(conductor.Codigo);
  await setDoc(doc(db, COL_CONDUCTORES, conductor.Codigo), conductor);
  const idx = (_conductores||[]).findIndex(c => c.Codigo === conductor.Codigo);
  if (idx >= 0) _conductores[idx] = conductor;
  else _conductores.push(conductor);
}

export async function updateTractoraConductor(codigo, matricula) {
  const cod = padCodigo(codigo);
  await setDoc(doc(db, COL_CONDUCTORES, cod), { tractoraAsignada: matricula }, { merge: true });
  const c = (_conductores||[]).find(c => c.Codigo === cod);
  if (c) c.tractoraAsignada = matricula;
}

export async function eliminarConductor(codigo) {
  await deleteDoc(doc(db, COL_CONDUCTORES, codigo));
  _conductores = (_conductores||[]).filter(c => c.Codigo !== codigo);
}

// ====================================================
// TARIFAS
// ====================================================
async function cargarTarifas() {
  try {
    const snap = await getDocs(collection(db, COL_TARIFAS));
    if (snap.size < TARIFAS_DEFAULT.length) {
      // Sembrar siempre desde cero con IDs corregidos
      await seedTarifas();
    } else {
      _tarifas = snap.docs.map(d => d.data());
    }
  } catch (e) {
    console.error('Error cargando tarifas:', e);
    // Usar defaults en memoria si Firestore falla
    _tarifas = [...TARIFAS_DEFAULT];
    // Intentar sembrar en segundo plano
    try { await seedTarifas(); } catch {}
  }
}

// ID seguro para Firestore — sin barras ni espacios
function tarifaId(concepto) {
  return concepto.replace(/[\/.\\s]/g, '_');
}

async function seedTarifas() {
  await Promise.all(
    TARIFAS_DEFAULT.map(t => setDoc(doc(db, COL_TARIFAS, tarifaId(t.CONCEPTO)), t))
  );
  _tarifas = [...TARIFAS_DEFAULT];
}

export function getTarifas() {
  return _tarifas || [...TARIFAS_DEFAULT];
}

export function getTarifa(concepto, plataforma) {
  const fila = getTarifas().find(t => t.CONCEPTO === concepto);
  return fila ? (fila[plataforma] || 0) : 0;
}

export async function upsertTarifa(concepto, plataforma, valor) {
  const tarifas = getTarifas();
  const fila = tarifas.find(t => t.CONCEPTO === concepto);
  if (!fila) return;
  fila[plataforma] = parseFloat(valor) || 0;
  await setDoc(doc(db, COL_TARIFAS, tarifaId(concepto)), fila);
  const idx = _tarifas.findIndex(t => t.CONCEPTO === concepto);
  if (idx >= 0) _tarifas[idx] = { ..._tarifas[idx], [plataforma]: fila[plataforma] };
}

// ====================================================
// TRACTORAS
// ====================================================
export async function cargarTractoras() {
  try {
    const snap = await getDocs(query(collection(db, COL_TRACTORAS), orderBy('matricula')));
    if (snap.size < TRACTORAS_DEFAULT.length) {
      await Promise.all(
        TRACTORAS_DEFAULT.map(t => setDoc(doc(db, COL_TRACTORAS, t.matricula), t))
      );
      _tractoras = [...TRACTORAS_DEFAULT];
    } else {
      _tractoras = snap.docs.map(d => d.data());
    }
  } catch (e) {
    console.error('Error cargando tractoras:', e);
    _tractoras = [...TRACTORAS_DEFAULT];
  }
}

export function getTractoras() {
  return _tractoras;
}

export async function upsertTractora(matricula, matriculaOriginal = null) {
  const mat = matricula.toUpperCase().trim();
  // Si es edición, borrar la antigua
  if (matriculaOriginal && matriculaOriginal !== mat) {
    await deleteDoc(doc(db, COL_TRACTORAS, matriculaOriginal));
    _tractoras = _tractoras.filter(t => t.matricula !== matriculaOriginal);
  }
  await setDoc(doc(db, COL_TRACTORAS, mat), { matricula: mat });
  if (!_tractoras.find(t => t.matricula === mat)) {
    _tractoras.push({ matricula: mat });
    _tractoras.sort((a, b) => a.matricula.localeCompare(b.matricula));
  }
}

export async function eliminarTractora(matricula) {
  await deleteDoc(doc(db, COL_TRACTORAS, matricula));
  _tractoras = _tractoras.filter(t => t.matricula !== matricula);
}

// ====================================================
// REGISTROS
// ====================================================
async function cargarRegistros() {
  try {
    const snap = await getDocs(query(collection(db, COL_REGISTROS), orderBy('fechaCreacion', 'desc')));
    _registros = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error cargando registros:', e);
    _registros = [];
  }
}

// Listener en tiempo real — actualiza historial automáticamente
let _onRegistrosChange = null;
export function setOnRegistrosChange(cb) { _onRegistrosChange = cb; }

// ---- FASE 6: rango de fechas para limitar el listener de registros ----
// Calcula la fecha límite (YYYY-MM-DD) según el rango elegido, filtrando por fechaSalida.
// Devuelve null para 'todo' (sin filtro de fecha).
function calcularFechaLimiteRango(rango) {
  const hoy = new Date();
  if (rango === 'ano') {
    return `${hoy.getFullYear()}-01-01`;
  }
  if (rango === 'todo') return null;
  const meses = rango === '6m' ? 6 : 3; // '3m' por defecto
  const limite = new Date(hoy.getFullYear(), hoy.getMonth() - meses, hoy.getDate());
  return limite.toISOString().slice(0, 10);
}

function escucharRegistros(rango, onReady) {
  if (_unsubRegistros) _unsubRegistros();
  _rangoActual = rango || '3m';
  let primeraCarga = true;

  const fechaLimite = calcularFechaLimiteRango(_rangoActual);
  // Con filtro where('fechaSalida', >=): NO se combina con orderBy('fechaCreacion') en la
  // query (Firestore exigiría índice compuesto) — se ordena en JS tras recibir los datos.
  const q = fechaLimite
    ? query(collection(db, COL_REGISTROS), where('fechaSalida', '>=', fechaLimite))
    : query(collection(db, COL_REGISTROS), orderBy('fechaCreacion', 'desc'));

  _unsubRegistros = onSnapshot(
    q,
    snap => {
      _registros = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (fechaLimite) {
        _registros.sort((a, b) => String(b.fechaCreacion || '').localeCompare(String(a.fechaCreacion || '')));
      }
      if (primeraCarga) {
        primeraCarga = false;
        if (typeof onReady === 'function') onReady();
      }
      if (!window._suprimirListener) {
        if (typeof _onRegistrosChange === 'function') _onRegistrosChange();
        if (typeof window.renderHistorial === 'function') window.renderHistorial();
      }
    },
    err => console.error('Listener error:', err)
  );
}

// Cambia el rango del listener de registros (selector de periodo en el header).
// Cierra el listener actual y abre uno nuevo con el rango pedido.
export function cambiarRangoRegistros(rango) {
  return new Promise(resolve => escucharRegistros(rango, resolve));
}

export function getRangoActual() {
  return _rangoActual;
}

export function getRegistros() {
  return _registros;
}

// ---- CONTROL DE TAMAÑO (límite Firestore: 1 MB por documento) ----
export function checkDocSize(reg) {
  const bytes = new TextEncoder().encode(JSON.stringify(reg)).length;
  const KB = Math.round(bytes / 1024);
  if (bytes > 900_000) {
    throw new Error(`El registro ocupa ${KB} KB y supera el límite (900 KB). Reduce el número de fotos.`);
  }
  return KB;
}

export async function addRegistro(reg) {
  // Validar tamaño antes de escribir
  checkDocSize(reg);
  // Estados iniciales
  reg.estadoDietas  = reg.origenMovil ? 'pendiente_validacion' : 'pendiente';
  reg.estadoGastos  = 'pendiente';
  reg.fechaCreacion = new Date().toISOString();
  reg.creadoEn      = reg.creadoEn || new Date().toISOString();
  // Trazabilidad
  if (!reg.creadoPor) reg.creadoPor = reg.origenMovil ? 'movil' : 'admin';
  const ref = await addDoc(collection(db, COL_REGISTROS), reg);
  reg.id = ref.id;
  return reg;
}

export async function updateRegistro(id, datos) {
  // C10: validar tamaño cuando la actualización incluye fotos (o es un
  // reemplazo grande del registro). Evita superar el límite de 900 KB de
  // Firestore al editar y añadir fotos. Se valida contra la versión
  // resultante (registro actual fusionado con los datos nuevos).
  if (datos && (datos.fotosBase64 !== undefined || Object.keys(datos).length > 5)) {
    const actual = _registros.find(r => r.id === id) || {};
    checkDocSize({ ...actual, ...datos });
  }
  await setDoc(doc(db, COL_REGISTROS, id), datos, { merge: true });
  const idx = _registros.findIndex(r => r.id === id);
  if (idx >= 0) _registros[idx] = { ..._registros[idx], ...datos };
}

export async function deleteRegistro(id) {
  await deleteDoc(doc(db, COL_REGISTROS, id));
  _registros = _registros.filter(r => r.id !== id);
}

export async function setEstadoDietas(id, estado) {
  const datos = {
    estadoDietas:     estado,
    fechaLiquidacion: estado === 'liquidado' ? new Date().toISOString() : null,
  };
  // Al revertir a pendiente/bloqueado, el registro deja de pertenecer a su lote de liquidación.
  // Si vuelve a 'liquidado' no tocamos el campo aquí: lo pone liquidarRegistros().
  if (estado !== 'liquidado') datos.numLiquidacionDietas = null;
  await updateRegistro(id, datos);
}

export async function setEstadoGastos(id, estado) {
  const datos = {
    estadoGastos:    estado,
    fechaPagoGastos: estado === 'pagado' ? new Date().toISOString() : null,
  };
  // Al revertir a pendiente/bloqueado, el registro deja de pertenecer a su lote de pago de gastos.
  // Si vuelve a 'pagado' no tocamos el campo aquí: lo pone pagarGastosRegistros().
  if (estado !== 'pagado') datos.numLiquidacionGastos = null;
  await updateRegistro(id, datos);
}

export async function marcarEmailEnviado(id) {
  await updateRegistro(id, { emailEnviado: true, fechaEmailEnviado: new Date().toISOString() });
}

export async function liquidarRegistros(ids, numLiquidacion) {
  const fechaLiq = new Date().toISOString();
  // Promise.allSettled: si una escritura falla, las demás continúan y se reporta
  // exactamente cuáles fallaron (evita el fallo parcial silencioso).
  const results = await Promise.allSettled(ids.map(id =>
    updateRegistro(id, {
      estadoDietas:          'liquidado',
      fechaLiquidacion:      fechaLiq,
      numLiquidacionDietas:  numLiquidacion,
    })
  ));
  const fallidos = ids
    .map((id, i) => ({ id, res: results[i] }))
    .filter(x => x.res.status === 'rejected')
    .map(x => {
      const reg = _registros.find(r => r.id === x.id);
      return {
        id: x.id,
        codigo: reg?.codigoConductor || '?',
        nombre: reg?.nombreConductor || '(desconocido)',
        error:  x.res.reason?.message || String(x.res.reason || 'error'),
      };
    });
  return { total: ids.length, ok: ids.length - fallidos.length, fallidos };
}

export function generarNumLiquidacion() {
  const ahora = new Date();
  const aaaa  = ahora.getFullYear();
  const mm    = String(ahora.getMonth() + 1).padStart(2, '0');
  const prefijo = `LIQ-${aaaa}-${mm}-`;
  const usados = (_registros || [])
    .map(r => r.numLiquidacionDietas || r.numLiquidacionGastos || r.numLiquidacion || '')
    .filter(n => n.startsWith(prefijo))
    .map(n => parseInt(n.replace(prefijo, '')) || 0);
  const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;
  return `${prefijo}${String(siguiente).padStart(3, '0')}`;
}

// ---- Helper genérico de numeración secuencial (mismo patrón que generarNumLiquidacion) ----
function _generarNumSecuencial(prefijo, items, campo) {
  const usados = (items || [])
    .map(it => it[campo] || '')
    .filter(n => n.startsWith(prefijo))
    .map(n => parseInt(n.replace(prefijo, '')) || 0);
  const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;
  return `${prefijo}${String(siguiente).padStart(3, '0')}`;
}

export function generarNumFiniquito() {
  const ahora = new Date();
  const prefijo = `FIN-${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-`;
  return _generarNumSecuencial(prefijo, _registros, 'numFiniquito');
}

export function generarNumRemesaAnticipos() {
  const ahora = new Date();
  const prefijo = `ANT-${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-`;
  return _generarNumSecuencial(prefijo, _anticipos, 'numRemesaPago');
}

export function generarNumRemesaEmbargos() {
  const ahora = new Date();
  const prefijo = `EMB-${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-`;
  const usados = [];
  (_embargos || []).forEach(e => (e.pagos || []).forEach(p => {
    if (p.numRemesa && p.numRemesa.startsWith(prefijo)) usados.push(parseInt(p.numRemesa.replace(prefijo, '')) || 0);
  }));
  const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;
  return `${prefijo}${String(siguiente).padStart(3, '0')}`;
}

// ====================================================
// FINIQUITOS (marcado especial sobre registros de dietas existentes)
// ====================================================
export async function marcarRegistrosFiniquito(ids, numFiniquito) {
  const fecha = new Date().toISOString();
  const results = await Promise.allSettled(ids.map(id =>
    updateRegistro(id, {
      estadoDietas:         'liquidado',
      fechaLiquidacion:     fecha,
      numLiquidacionDietas: numFiniquito,
      esFiniquito:          true,
      numFiniquito,
    })
  ));
  const fallidos = ids
    .map((id, i) => ({ id, res: results[i] }))
    .filter(x => x.res.status === 'rejected')
    .map(x => {
      const reg = _registros.find(r => r.id === x.id);
      return {
        id: x.id,
        codigo: reg?.codigoConductor || '?',
        nombre: reg?.nombreConductor || '(desconocido)',
        error:  x.res.reason?.message || String(x.res.reason || 'error'),
      };
    });
  return { total: ids.length, ok: ids.length - fallidos.length, fallidos };
}

export async function pagarGastosRegistros(ids, numLiquidacion) {
  const fechaPago = new Date().toISOString();
  const results = await Promise.allSettled(ids.map(id =>
    updateRegistro(id, {
      estadoGastos:         'pagado',
      fechaPagoGastos:      fechaPago,
      numLiquidacionGastos: numLiquidacion,
    })
  ));
  const fallidos = ids
    .map((id, i) => ({ id, res: results[i] }))
    .filter(x => x.res.status === 'rejected')
    .map(x => {
      const reg = _registros.find(r => r.id === x.id);
      return {
        id: x.id,
        codigo: reg?.codigoConductor || '?',
        nombre: reg?.nombreConductor || '(desconocido)',
        error:  x.res.reason?.message || String(x.res.reason || 'error'),
      };
    });
  return { total: ids.length, ok: ids.length - fallidos.length, fallidos };
}

// ====================================================
// GASTOS INDEPENDIENTES
// ====================================================
let _gastosInd = [];

export async function cargarGastosInd() {
  const snap = await getDocs(query(collection(db, COL_GASTOS_IND), orderBy('fecha', 'desc')));
  _gastosInd = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return _gastosInd;
}

export function getGastosInd() { return _gastosInd; }

export async function addGastoInd(datos) {
  const ref = await addDoc(collection(db, COL_GASTOS_IND), {
    ...datos,
    estadoGastos:  'pendiente',
    fechaCreacion: new Date().toISOString(),
  });
  _gastosInd.unshift({ id: ref.id, ...datos, estadoGastos: 'pendiente', fechaCreacion: new Date().toISOString() });
  return ref.id;
}

export async function deleteGastoInd(id) {
  await deleteDoc(doc(db, COL_GASTOS_IND, id));
  _gastosInd = _gastosInd.filter(g => g.id !== id);
}

export async function pagarGastosInd(ids, numLiquidacion) {
  const fechaPago = new Date().toISOString();
  const results = await Promise.allSettled(ids.map(id =>
    setDoc(doc(db, COL_GASTOS_IND, id), {
      estadoGastos:         'pagado',
      fechaPagoGastos:      fechaPago,
      numLiquidacionGastos: numLiquidacion,
    }, { merge: true })
  ));
  // Actualizar el caché local solo de los que se escribieron correctamente
  ids.forEach((id, i) => {
    if (results[i].status !== 'fulfilled') return;
    const g = _gastosInd.find(x => x.id === id);
    if (g) { g.estadoGastos = 'pagado'; g.fechaPagoGastos = fechaPago; g.numLiquidacionGastos = numLiquidacion; }
  });
  const fallidos = ids
    .map((id, i) => ({ id, res: results[i] }))
    .filter(x => x.res.status === 'rejected')
    .map(x => {
      const g = _gastosInd.find(y => y.id === x.id);
      return {
        id: x.id,
        codigo: g?.conductorCodigo || '?',
        nombre: g?.conductorNombre || '(gasto independiente)',
        error:  x.res.reason?.message || String(x.res.reason || 'error'),
      };
    });
  return { total: ids.length, ok: ids.length - fallidos.length, fallidos };
}

// ====================================================
// CONCEPTOS DE GASTO
// ====================================================
const CONCEPTOS_DEFAULT = [
  { id: 'aduanas',    nombre: 'Aduanas'    },
  { id: 'alojamiento',nombre: 'Alojamiento'},
  { id: 'combustible',nombre: 'Combustible'},
  { id: 'hotel',      nombre: 'Hotel'      },
  { id: 'mercado',    nombre: 'Mercado'    },
  { id: 'otros',      nombre: 'Otros'      },
  { id: 'parking',    nombre: 'Parking'    },
  { id: 'peaje',      nombre: 'Peaje'      },
];

async function cargarConceptos() {
  try {
    const snap = await getDocs(collection(db, COL_CONCEPTOS));
    if (snap.empty) {
      await Promise.all(CONCEPTOS_DEFAULT.map(c => setDoc(doc(db, COL_CONCEPTOS, c.id), c)));
      _conceptos = [...CONCEPTOS_DEFAULT];
    } else {
      _conceptos = snap.docs.map(d => d.data()).sort((a,b) => a.nombre.localeCompare(b.nombre));
      // Añadir conceptos nuevos si no existen aún
      const ids = new Set(_conceptos.map(c => c.id));
      const nuevos = CONCEPTOS_DEFAULT.filter(c => !ids.has(c.id));
      if (nuevos.length) {
        await Promise.all(nuevos.map(c => setDoc(doc(db, COL_CONCEPTOS, c.id), c)));
        _conceptos = [..._conceptos, ...nuevos].sort((a,b) => a.nombre.localeCompare(b.nombre));
      }
    }
  } catch(e) {
    _conceptos = [...CONCEPTOS_DEFAULT];
  }
}

export function getConceptos() { return _conceptos; }

export async function upsertConcepto(concepto) {
  const id = concepto.id || concepto.nombre.toLowerCase().replace(/\s+/g,'_');
  const data = { id, nombre: concepto.nombre };
  await setDoc(doc(db, COL_CONCEPTOS, id), data);
  const idx = _conceptos.findIndex(c => c.id === id);
  if (idx >= 0) _conceptos[idx] = data;
  else { _conceptos.push(data); _conceptos.sort((a,b) => a.nombre.localeCompare(b.nombre)); }
}

export async function eliminarConcepto(id) {
  await deleteDoc(doc(db, COL_CONCEPTOS, id));
  _conceptos = _conceptos.filter(c => c.id !== id);
}

// ====================================================
// ANTICIPOS
// ====================================================
let _anticipos = [];

export async function cargarAnticipos() {
  try {
    const snap = await getDocs(query(collection(db, COL_ANTICIPOS), orderBy('fecha', 'desc')));
    _anticipos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error cargando anticipos:', e);
    _anticipos = [];
  }
  return _anticipos;
}

export function getAnticipos() { return _anticipos; }

export function getAnticiposPendientesConductor(codigoConductor) {
  const cod = String(codigoConductor);
  return _anticipos.filter(a => String(a.codigoConductor) === cod && a.estado === 'pendiente');
}

export async function addAnticipo(datos) {
  const data = {
    codigoConductor: datos.codigoConductor,
    nombreConductor: datos.nombreConductor,
    fecha:           datos.fecha,
    importe:         parseFloat(datos.importe) || 0,
    concepto:        datos.concepto || '',
    estado:          'pendiente',   // pendiente | descontado (por finiquito)
    estadoPago:      'pendiente',   // pendiente | pagado (remesa SEPA)
    numFiniquito:    null,
    numRemesaPago:   null,
    fechaCreacion:   new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, COL_ANTICIPOS), data);
  _anticipos.unshift({ id: ref.id, ...data });
  return ref.id;
}

export async function updateAnticipo(id, datos) {
  await setDoc(doc(db, COL_ANTICIPOS, id), datos, { merge: true });
  const idx = _anticipos.findIndex(a => a.id === id);
  if (idx >= 0) _anticipos[idx] = { ..._anticipos[idx], ...datos };
}

export async function deleteAnticipo(id) {
  await deleteDoc(doc(db, COL_ANTICIPOS, id));
  _anticipos = _anticipos.filter(a => a.id !== id);
}

// Marca anticipos como pagados tras generar remesa SEPA/Excel — NO afecta al estado de descuento
export async function pagarAnticipos(ids, numRemesa) {
  const fechaPago = new Date().toISOString();
  const results = await Promise.allSettled(ids.map(id =>
    updateAnticipo(id, { estadoPago: 'pagado', fechaPago, numRemesaPago: numRemesa })
  ));
  const fallidos = ids
    .map((id, i) => ({ id, res: results[i] }))
    .filter(x => x.res.status === 'rejected')
    .map(x => {
      const a = _anticipos.find(y => y.id === x.id);
      return {
        id: x.id,
        codigo: a?.codigoConductor || '?',
        nombre: a?.nombreConductor || '(desconocido)',
        error:  x.res.reason?.message || String(x.res.reason || 'error'),
      };
    });
  return { total: ids.length, ok: ids.length - fallidos.length, fallidos };
}

// Marca los anticipos PENDIENTES de un conductor como DESCONTADOS al generar un finiquito
// (no resta importe de ningún cálculo — solo cambia el estado para trazabilidad)
export async function descontarAnticiposConductor(codigoConductor, numFiniquito) {
  const pendientes = getAnticiposPendientesConductor(codigoConductor);
  const fechaDescuento = new Date().toISOString();
  const results = await Promise.allSettled(pendientes.map(a =>
    updateAnticipo(a.id, { estado: 'descontado', numFiniquito, fechaDescuento })
  ));
  const fallidos = pendientes
    .map((a, i) => ({ a, res: results[i] }))
    .filter(x => x.res.status === 'rejected')
    .map(x => ({ id: x.a.id, error: x.res.reason?.message || String(x.res.reason || 'error') }));
  return {
    total: pendientes.length,
    ok: pendientes.length - fallidos.length,
    fallidos,
    importeTotal: pendientes.reduce((s, a) => s + parseFloat(a.importe || 0), 0),
  };
}

// ====================================================
// EMBARGOS
// ====================================================
let _embargos = [];

export async function cargarEmbargos() {
  try {
    const snap = await getDocs(query(collection(db, COL_EMBARGOS), orderBy('fechaInicio', 'desc')));
    _embargos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error cargando embargos:', e);
    _embargos = [];
  }
  return _embargos;
}

export function getEmbargos() { return _embargos; }

export async function addEmbargo(datos) {
  const data = {
    codigoConductor: datos.codigoConductor,
    nombreConductor: datos.nombreConductor,
    organismo:       datos.organismo || '',
    numExpediente:   datos.numExpediente || '',
    importeTotal:    parseFloat(datos.importeTotal) || 0,
    importeMensual:  parseFloat(datos.importeMensual) || 0,
    fechaInicio:     datos.fechaInicio || '',
    fechaFin:        datos.fechaFin || '',
    ibanTercero:     datos.ibanTercero || '',
    nombreTercero:   datos.nombreTercero || '',
    estado:          'activo',      // activo | finalizado (automático, editable)
    estadoManual:    false,
    totalPagado:     0,
    pagos:           [],            // [{ fecha, importe, numRemesa }]
    fechaCreacion:   new Date().toISOString(),
  };
  const ref = await addDoc(collection(db, COL_EMBARGOS), data);
  _embargos.unshift({ id: ref.id, ...data });
  return ref.id;
}

export async function updateEmbargo(id, datos) {
  await setDoc(doc(db, COL_EMBARGOS, id), datos, { merge: true });
  const idx = _embargos.findIndex(e => e.id === id);
  if (idx >= 0) _embargos[idx] = { ..._embargos[idx], ...datos };
}

export async function deleteEmbargo(id) {
  await deleteDoc(doc(db, COL_EMBARGOS, id));
  _embargos = _embargos.filter(e => e.id !== id);
}

// Registra el pago mensual (remesa) sobre uno o varios embargos.
// pagos: [{ id, importe, fecha }]
// Recalcula totalPagado y pasa a 'finalizado' automáticamente si se alcanza el importe total
// (salvo que el embargo tenga estadoManual=true, en cuyo caso se respeta el estado fijado a mano).
export async function registrarPagosEmbargos(pagos, numRemesa) {
  const fechaDefault = new Date().toISOString();
  const results = await Promise.allSettled(pagos.map(p => {
    const emb = _embargos.find(e => e.id === p.id);
    if (!emb) return Promise.reject(new Error('Embargo no encontrado'));
    const nuevoPago = { fecha: p.fecha || fechaDefault, importe: parseFloat(p.importe) || 0, numRemesa };
    const pagosActualizados = [...(emb.pagos || []), nuevoPago];
    const totalPagado = pagosActualizados.reduce((s, x) => s + parseFloat(x.importe || 0), 0);
    const datos = { pagos: pagosActualizados, totalPagado };
    if (!emb.estadoManual) {
      datos.estado = totalPagado >= parseFloat(emb.importeTotal || 0) ? 'finalizado' : 'activo';
    }
    return updateEmbargo(p.id, datos);
  }));
  const fallidos = pagos
    .map((p, i) => ({ p, res: results[i] }))
    .filter(x => x.res.status === 'rejected')
    .map(x => ({ id: x.p.id, error: x.res.reason?.message || String(x.res.reason || 'error') }));
  return { total: pagos.length, ok: pagos.length - fallidos.length, fallidos };
}

// Permite fijar el estado manualmente (ej. cerrar un embargo con ajuste, o reabrirlo)
export async function setEstadoEmbargo(id, estado) {
  await updateEmbargo(id, { estado, estadoManual: true });
}
