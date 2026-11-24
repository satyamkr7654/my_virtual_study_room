/**
 * Print text, or save it as PDF, through the browser.
 * Unlike a PDF library, the browser can draw every language and emoji.
 */
export const printNotes = (title, text) => {
    const frame = document.createElement('iframe');
    frame.title = 'Notes to print';
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    const style = doc.createElement('style');
    style.textContent = `
        @page { margin: 20mm; }
        body { font: 12pt/1.6 Georgia, 'Noto Serif Devanagari', 'Nirmala UI', serif; margin: 0; }
        h1 { font-size: 18pt; margin: 0 0 8mm; }
        div { white-space: pre-wrap; overflow-wrap: anywhere; }`;
    const heading = doc.createElement('h1');
    heading.textContent = title;
    const body = doc.createElement('div');
    body.textContent = text; // Never parsed as HTML
    doc.head.append(style);
    doc.body.append(heading, body);

    // Browsers suggest the page title as the file name
    const pageTitle = document.title;
    document.title = title;
    doc.title = title;
    const finish = () => {
        document.title = pageTitle;
        frame.remove();
    };
    frame.contentWindow.addEventListener('afterprint', () => setTimeout(finish));
    frame.contentWindow.focus();
    frame.contentWindow.print();
};
