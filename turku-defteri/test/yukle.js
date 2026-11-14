// Dizindeki bütün türkü dosyalarını sırayla yükler (test sayfası için).
TurkuDefteri.dizin.forEach(function (t) {
  document.write('<script src="../veri/' + t.id + '.js"><\/script>');
});
