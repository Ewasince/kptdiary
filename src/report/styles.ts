/** Inline stylesheet of the therapist report; A4 print layout, system fonts only. */
export const REPORT_CSS = `
@page { size: A4; margin: 16mm }
* { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact }
html { background: #FFFFFF }
body {
  max-width: 794px;
  margin: 0 auto;
  padding: 24px;
  color: #1F2328;
  background: #FFFFFF;
  font: 12.5px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
@media print { body { max-width: none; padding: 0 } }
header { display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 16px; align-items: end; border-bottom: 2px solid #1F2328; padding-bottom: 10px; margin-bottom: 16px }
h1 { grid-column: 1; margin: 0 0 4px; color: #5B6670; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase }
.period { grid-column: 1; margin: 0; font-size: 22px; font-weight: 700; line-height: 1.25 }
.counts { grid-column: 2; grid-row: 1 / span 2; color: #5B6670; margin: 0; text-align: right }
.count { color: #1F2328; font-weight: 600 }
.entry { break-inside: avoid; page-break-inside: avoid; border: 1px solid #D9DEE3; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px }
.entry-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px }
.when { font-weight: 600 }
.badge { color: #8A5A00; background: #FFF4DB; border-radius: 999px; padding: 1px 8px; font-size: 11px }
.row { display: grid; grid-template-columns: 120px minmax(0, 1fr); column-gap: 12px; margin: 6px 0 }
.label { text-transform: uppercase; font-size: 11px; letter-spacing: 0.04em; color: #5B6670; padding-top: 2px }
.row.outcome { display: block }
.row.outcome .label { display: block; padding-top: 0; margin-bottom: 4px }
.chip::first-letter { text-transform: uppercase }
.chip { display: inline-block; border: 1px solid; border-radius: 999px; padding: 1px 8px; margin: 1px 4px 1px 0; white-space: nowrap }
.pair { white-space: nowrap; margin-right: 8px }
.chip.after { background: #E4F3E9; border-color: #A9D3B7; color: #1E6B3A }
.after-value { color: #1E6B3A }
.muted { color: #5B6670 }
table.thoughts { width: 100%; border-collapse: collapse; margin: 8px 0; table-layout: fixed }
table.thoughts th, table.thoughts td { border: 1px solid #D9DEE3; padding: 5px 7px; text-align: left; vertical-align: top }
table.thoughts th { text-transform: uppercase; font-size: 11px; font-weight: 600; color: #5B6670; background: #F4F6F8 }
table.thoughts th:last-child, table.thoughts td:last-child { width: 24% }
footer { margin-top: 16px; padding-top: 8px; border-top: 1px solid #D9DEE3; color: #5B6670; font-size: 11px }
`;
