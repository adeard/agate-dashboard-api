const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const handlebars = require("handlebars");

handlebars.registerHelper("tambah", function (value1, value2) {
  return Number(value1) + Number(value2);
});

handlebars.registerHelper("eq", function (a, b) {
  return a === b;
});

const generatePdf = async (
  data,
  customTemplate,
  res,
  landscape = false,
  bottom = "0cm",
  top = "0cm",
) => {
  try {
    handlebars.registerHelper(
      "inc",
      (value, num) => parseInt(value) + parseInt(num),
    );
    const templateHtml = fs.readFileSync(
      path.join(process.cwd(), customTemplate),
      "utf8",
    );
    const template = handlebars.compile(templateHtml);
    const finalHtml = encodeURIComponent(template(data));
    const options = {
      format: "A4",
      headerTemplate: "<p></p>",
      footerTemplate: "<p></p>",
      displayHeaderFooter: false,
      margin: {
        top: top,
        bottom: bottom,
      },
      printBackground: true,
      landscape,
    };
    const browser = await puppeteer.launch({
      args: ["--no-sandbox"],
      headless: true,
    });
    const page = await browser.newPage();
    await page.goto(`data:text/html;charset=UTF-8,${finalHtml}`, {
      waitUntil: "networkidle0",
    });

    const mypdf = await page.pdf(options);
    await browser.close();
    // res.setHeader(
    //     "attachment; filename=export-from-html.pdf"
    //   ) // Remove this if you don't want direct download
    res.set({
      "Content-Type": "application/pdf",
      "Content-Length": mypdf.length,
    });
    return res.send(mypdf);
  } catch (error) {
    console.warn("Error generating PDF: ", error);
    throw error;
  }
};

module.exports = generatePdf;

