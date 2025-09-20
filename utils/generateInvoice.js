const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

function generateInvoice(data, filePath) {
  const doc = new PDFDocument({ margin: 50 });

  doc.pipe(fs.createWriteStream(filePath));

  // 🌄 Add Logo
  const logoPath = path.join(__dirname, "../public/imgs/Roam_logo.png");
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 45, { width: 100 });
  }

  doc.fontSize(20).text("Roamè Invoice", 200, 50, { align: "right" });
  doc.moveDown(2);

  // 🧾 Invoice Details
  doc.fontSize(12);
  doc.text(`Invoice ID: ${data.invoiceId}`);
  doc.text(`Customer Name: ${data.customerName}`);
  doc.text(`Booking Date: ${data.date}`);
  doc.text(`Booked from: ${data.from}`);
doc.text(`to: ${data.to}`);
  doc.moveDown();

  // 💰 Price Breakdown Table Style
  doc.fontSize(14).text("Payment Summary", { underline: true });
  doc.moveDown();
  doc.fontSize(12);
  doc.text(`Base Price: ₹${data.baseAmount}`);
  doc.text(`GST (15%): ₹${data.gst}`);
  doc.text(`Total Paid: ₹${data.totalAmount}`);
  doc.moveDown(2);

  doc.text("Thank you for booking with Roamè!", { align: "center" });

  doc.end();
}

module.exports = generateInvoice;
