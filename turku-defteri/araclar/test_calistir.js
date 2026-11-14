// Testleri tarayıcı olmadan çalıştırır (macOS). Kullanım, turku-defteri klasöründen:
//   osascript -l JavaScript araclar/test_calistir.js .
ObjC.import('Foundation');
function oku(yol) {
  return $.NSString.stringWithContentsOfFileEncodingError(yol, $.NSUTF8StringEncoding, null).js;
}
function run(argv) {
  var kok = argv[0] || '.';
  var g = (function () { return this; })();
  var sonuc = { textContent: '' };
  g.window = g;
  g.document = { title: '', getElementById: function (id) { return id === 'sonuc' ? sonuc : null; } };
  (0, eval)(oku(kok + '/veri/dizin.js'));
  g.TurkuDefteri.dizin.forEach(function (t) { (0, eval)(oku(kok + '/veri/' + t.id + '.js')); });
  ['perde.js', 'ses.js', 'test/testler.js'].forEach(function (d) { (0, eval)(oku(kok + '/' + d)); });
  var hatalar = sonuc.textContent.split('\n').filter(function (s) { return s.indexOf('ok    ') !== 0 && s.trim() !== ''; });
  return g.document.title + (hatalar.length > 1 ? '\n' + hatalar.slice(1).join('\n') : '');
}
