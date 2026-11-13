// Testleri tarayıcı olmadan çalıştırır (macOS). Kullanım, turkce klasöründen:
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
  g.document = { title: '', getElementById: function () { return sonuc; } };
  ['veri.js', 'yonerge.js', 'test/testler.js'].forEach(function (d) { (0, eval)(oku(kok + '/' + d)); });
  var hatalar = sonuc.textContent.split('\n').filter(function (s) { return s.indexOf('ok    ') !== 0 && s.trim() !== ''; });
  return g.document.title + (hatalar.length > 1 ? '\n' + hatalar.slice(1).join('\n') : '');
}
