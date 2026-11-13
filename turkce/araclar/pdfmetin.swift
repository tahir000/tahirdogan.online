import Foundation
import PDFKit

// Kullanim: swift pdfmetin.swift <pdf> <cikti.txt>
let a = CommandLine.arguments
guard a.count >= 3, let doc = PDFDocument(url: URL(fileURLWithPath: a[1])) else {
    FileHandle.standardError.write("PDF acilamadi\n".data(using: .utf8)!)
    exit(1)
}
var out = ""
for i in 0..<doc.pageCount {
    out += "\n===== SAYFA \(i + 1) =====\n"
    out += doc.page(at: i)?.string ?? ""
}
try out.write(toFile: a[2], atomically: true, encoding: .utf8)
print("sayfa: \(doc.pageCount), karakter: \(out.count)")
