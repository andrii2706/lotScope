import test from "node:test";
import assert from "node:assert/strict";
import { pageBreaks, pdfFileName } from "../src/lib/client/pdf.ts";

test("page breaks never cut a block in half", () => {
  const spans = [
    { top: 0, bottom: 400, heading: false },
    { top: 400, bottom: 900, heading: false },
    { top: 900, bottom: 1300, heading: false },
    { top: 1300, bottom: 1500, heading: false },
  ];
  assert.deepEqual(pageBreaks(spans, 1500, 1000), [900]);
});

test("no break right after a heading", () => {
  const spans = [
    { top: 0, bottom: 700, heading: false },
    { top: 700, bottom: 740, heading: true },
    { top: 752, bottom: 1200, heading: false },
  ];
  assert.deepEqual(pageBreaks(spans, 1200, 1000), [700]);
});

test("one page needs no breaks, tall blocks are cut at the page edge", () => {
  assert.deepEqual(pageBreaks([{ top: 0, bottom: 500, heading: false }], 500, 1000), []);
  assert.deepEqual(pageBreaks([{ top: 0, bottom: 2500, heading: false }], 2500, 1000), [1000, 2000]);
});

test("pdf file name is safe", () => {
  assert.equal(pdfFileName(["2020 BMW X3", "lot 45820323"]), "2020 BMW X3 lot 45820323.pdf");
  assert.equal(pdfFileName(["2020 Лада Нива", "lot 1"]), "2020 lot 1.pdf");
  assert.equal(pdfFileName(["A/B:C*D", ""]), "A B C D.pdf");
  assert.equal(pdfFileName([]), "LotScope report.pdf");
});
