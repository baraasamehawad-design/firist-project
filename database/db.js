const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname);
const DB_PATH = path.join(DB_DIR, 'learning.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      video_url TEXT,
      topic TEXT,
      order_num INTEGER,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      question TEXT NOT NULL,
      code_snippet TEXT,
      choices TEXT,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      order_num INTEGER,
      FOREIGN KEY (level_id) REFERENCES levels(id)
    );

    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      level_id INTEGER NOT NULL,
      completed INTEGER DEFAULT 0,
      score INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      watched_video INTEGER DEFAULT 0,
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (level_id) REFERENCES levels(id)
    );
  `);

  const existing = db.prepare('SELECT COUNT(*) as cnt FROM levels').get();
  if (existing.cnt === 0) seedData();
}

function seedData() {
  const insertLevel = db.prepare(`
    INSERT INTO levels (title, description, video_url, topic, order_num, icon)
    VALUES (@title, @description, @video_url, @topic, @order_num, @icon)
  `);

  const insertQuestion = db.prepare(`
    INSERT INTO questions (level_id, type, question, code_snippet, choices, correct_answer, explanation, order_num)
    VALUES (@level_id, @type, @question, @code_snippet, @choices, @correct_answer, @explanation, @order_num)
  `);

  const mcq = (text, opts, explanation) => ({
    type: 'mcq',
    question: text,
    code_snippet: null,
    choices: JSON.stringify(opts),
    correct_answer: opts.find(o => o.correct).text,
    explanation,
  });

  const wh = (text, answers, explanation) => ({
    type: 'wh',
    question: text,
    code_snippet: null,
    choices: null,
    correct_answer: JSON.stringify(answers),
    explanation,
  });

  const code = (text, keywords, explanation, snippet = null) => ({
    type: 'code',
    question: text,
    code_snippet: snippet,
    choices: null,
    correct_answer: JSON.stringify({ keywords }),
    explanation,
  });

  const identify = (text, snippet, opts, explanation) => ({
    type: 'identify',
    question: text,
    code_snippet: snippet,
    choices: JSON.stringify(opts),
    correct_answer: opts.find(o => o.correct).text,
    explanation,
  });

  const fill = (text, snippet, answers, explanation) => ({
    type: 'fill',
    question: text,
    code_snippet: snippet,
    choices: null,
    correct_answer: JSON.stringify(answers),
    explanation,
  });

  // ─── LEVEL 1: HTML Basics ────────────────────────────────────────────────
  const l1 = insertLevel.run({
    title: 'HTML Basics',
    description: 'Learn the building blocks of every web page — tags, elements, and structure.',
    video_url: 'https://www.youtube.com/embed/qz0aGYrrlhU',
    topic: 'HTML',
    order_num: 1,
    icon: '📄',
  });

  const l1q = [
    mcq('What does HTML stand for?', [
      { text: 'HyperText Markup Language', correct: true },
      { text: 'High Tech Modern Language', correct: false },
      { text: 'Hyper Transfer Markup Language', correct: false },
      { text: 'Home Tool Markup Language', correct: false },
    ], 'HTML stands for HyperText Markup Language — the standard language for building web pages.'),

    mcq('Which tag creates the largest heading?', [
      { text: '<h1>', correct: true },
      { text: '<h6>', correct: false },
      { text: '<heading>', correct: false },
      { text: '<big>', correct: false },
    ], '<h1> is the largest heading. Headings go from <h1> (biggest) to <h6> (smallest).'),

    mcq('Which tag is used to create a hyperlink?', [
      { text: '<a>', correct: true },
      { text: '<link>', correct: false },
      { text: '<href>', correct: false },
      { text: '<url>', correct: false },
    ], 'The <a> (anchor) tag creates hyperlinks. The href attribute sets the destination URL.'),

    mcq('Which tag creates an unordered (bullet) list?', [
      { text: '<ul>', correct: true },
      { text: '<ol>', correct: false },
      { text: '<li>', correct: false },
      { text: '<list>', correct: false },
    ], '<ul> creates an unordered list. <ol> creates an ordered (numbered) list. <li> is the list item inside either.'),

    mcq('What does the <br> tag do?', [
      { text: 'Inserts a line break', correct: true },
      { text: 'Creates a border', correct: false },
      { text: 'Makes text bold', correct: false },
      { text: 'Creates a new section', correct: false },
    ], '<br> is a self-closing tag that inserts a line break (like pressing Enter).'),

    wh('What attribute on an <img> tag provides alternative text for screen readers?', ['alt', 'alt attribute', 'alt=""'],
      'The alt attribute provides a text description of the image for screen readers and when the image fails to load.'),

    wh('What tag wraps ALL visible content on a web page?', ['body', '<body>', 'body tag'],
      'The <body> tag contains everything visible on the page — text, images, links, etc.'),

    identify('What does this HTML code create?',
      '<a href="https://google.com" target="_blank">Open Google</a>',
      [
        { text: 'A link that opens Google in a new tab', correct: true },
        { text: 'A button that navigates to Google', correct: false },
        { text: 'A link that downloads a file', correct: false },
        { text: 'An image linking to Google', correct: false },
      ], 'target="_blank" makes the link open in a new browser tab instead of the current one.'),

    identify('What is wrong with this HTML?',
      '<img src="photo.jpg">',
      [
        { text: 'Missing alt attribute for accessibility', correct: true },
        { text: 'Wrong tag name — should be <image>', correct: false },
        { text: 'src should be href', correct: false },
        { text: 'Nothing is wrong', correct: false },
      ], 'Every <img> tag should have an alt attribute to describe the image for accessibility and SEO.'),

    fill('Fill in the blank to complete the HTML document structure:',
      '<!DOCTYPE html>\n<html>\n  <___>\n    <title>My Page</title>\n  </___>\n  <body></body>\n</html>',
      ['head'],
      'The <head> section contains metadata like <title>, CSS links, and scripts — content that is not directly visible.'),

    code('Write an HTML paragraph tag containing the text "Hello World".',
      ['<p>', 'Hello World', '</p>'],
      'A paragraph is created with <p>content</p>. Always close your tags!'),

    code('Write an HTML image tag that shows "logo.png" with alt text "Company Logo".',
      ['<img', 'src', 'logo.png', 'alt', 'Company Logo'],
      'The correct syntax is: <img src="logo.png" alt="Company Logo">'),

    mcq('Which HTML tag makes text bold?', [
      { text: '<strong>', correct: true },
      { text: '<bold>', correct: false },
      { text: '<b>', correct: false },
      { text: 'Both <strong> and <b>', correct: false },
    ], '<strong> is the semantic tag for important/bold text. While <b> also bolds text, <strong> carries meaning for screen readers.'),

    identify('What does this code produce?',
      '<ul>\n  <li>Apple</li>\n  <li>Banana</li>\n  <li>Cherry</li>\n</ul>',
      [
        { text: 'A bullet list with 3 fruit items', correct: true },
        { text: 'A numbered list of fruits', correct: false },
        { text: 'A table of fruits', correct: false },
        { text: 'Three paragraphs', correct: false },
      ], '<ul> with <li> children creates an unordered (bulleted) list. <ol> would create a numbered list.'),

    fill('Complete the link tag to load an external CSS file:',
      '<link rel="stylesheet" ___="styles.css">',
      ['href'],
      'The href attribute in <link> points to the path of your CSS file.'),
  ];

  l1q.forEach((q, i) => insertQuestion.run({ level_id: l1.lastInsertRowid, ...q, order_num: i + 1 }));

  // ─── LEVEL 2: CSS Selectors ───────────────────────────────────────────────
  const l2 = insertLevel.run({
    title: 'CSS Selectors',
    description: 'Master the art of targeting HTML elements with CSS selectors.',
    video_url: 'https://www.youtube.com/embed/l1mER1bV0N0',
    topic: 'CSS',
    order_num: 2,
    icon: '🎯',
  });

  const l2q = [
    mcq('How do you select an element with class "card"?', [
      { text: '.card', correct: true },
      { text: '#card', correct: false },
      { text: 'card', correct: false },
      { text: '*card', correct: false },
    ], 'A dot (.) before the name selects elements by class. Example: .card { color: red; }'),

    mcq('How do you select an element with id "header"?', [
      { text: '#header', correct: true },
      { text: '.header', correct: false },
      { text: 'header', correct: false },
      { text: '@header', correct: false },
    ], 'A hash (#) before the name selects an element by id. IDs should be unique on a page.'),

    mcq('Which selector targets ALL elements on the page?', [
      { text: '*', correct: true },
      { text: 'all', correct: false },
      { text: 'every', correct: false },
      { text: '%', correct: false },
    ], 'The universal selector * matches every element. Commonly used for CSS resets like * { box-sizing: border-box; }'),

    mcq('Which selector targets only <p> elements DIRECTLY inside a <div>?', [
      { text: 'div > p', correct: true },
      { text: 'div p', correct: false },
      { text: 'div + p', correct: false },
      { text: 'div ~ p', correct: false },
    ], 'The > child combinator selects only direct children. "div p" would select all descendant paragraphs at any depth.'),

    mcq('How do you select elements with BOTH class "card" AND class "active"?', [
      { text: '.card.active', correct: true },
      { text: '.card .active', correct: false },
      { text: '.card, .active', correct: false },
      { text: '.card + .active', correct: false },
    ], 'Chaining selectors with no space means "element with both classes". A space means "descendant". A comma means "either".'),

    identify('What does this CSS rule do?',
      'p:first-child {\n  color: blue;\n}',
      [
        { text: 'Targets the first <p> that is a first child of its parent', correct: true },
        { text: 'Targets the first <p> on the page', correct: false },
        { text: 'Targets only the first letter of every <p>', correct: false },
        { text: 'Targets every <p> inside a first child', correct: false },
      ], ':first-child is a pseudo-class that matches an element when it is the first child of its parent.'),

    identify('What does this CSS rule target?',
      'a:hover {\n  text-decoration: underline;\n}',
      [
        { text: 'Links when the mouse hovers over them', correct: true },
        { text: 'Links that have been visited', correct: false },
        { text: 'All anchor tags by default', correct: false },
        { text: 'Links that are currently active/clicked', correct: false },
      ], ':hover is a pseudo-class that applies styles when the user moves their mouse over an element.'),

    wh('What symbol is used to write a CSS comment?', ['/* */', '/* comment */', '/* and */'],
      'CSS comments use /* ... */ syntax. Everything between /* and */ is ignored by the browser.'),

    wh('What combinator selects an element that is immediately preceded by a specific sibling?', ['+', 'adjacent sibling', 'adjacent sibling combinator'],
      'The + combinator (adjacent sibling) selects the element that directly follows the specified element at the same level.'),

    fill('Fill in the blank — select the button only when focused:',
      'button___focus {\n  outline: 2px solid blue;\n}',
      [':', ':'],
      ':focus is a pseudo-class that applies when the element has keyboard or click focus. Great for accessibility!'),

    code('Write a CSS rule to make all <h2> elements have color purple and font-size 28px.',
      ['h2', 'color', 'purple', 'font-size', '28px'],
      'The rule should be: h2 { color: purple; font-size: 28px; }'),

    code('Write CSS to change the background color of elements with class "highlight" to yellow.',
      ['.highlight', 'background', 'yellow'],
      'Use the class selector: .highlight { background-color: yellow; } or background: yellow;'),

    identify('Which selector has the HIGHEST specificity?',
      '/* A */ p { color: red; }\n/* B */ .text { color: blue; }\n/* C */ #title { color: green; }',
      [
        { text: '#title (id selector)', correct: true },
        { text: '.text (class selector)', correct: false },
        { text: 'p (element selector)', correct: false },
        { text: 'They are all equal', correct: false },
      ], 'Specificity order: inline styles > ID (#) > Class/Pseudo-class (.) > Element. IDs always win over classes.'),

    mcq('What does the , (comma) do in CSS selectors?', [
      { text: 'Applies the same styles to multiple selectors', correct: true },
      { text: 'Targets a child element', correct: false },
      { text: 'Targets a sibling element', correct: false },
      { text: 'Increases specificity', correct: false },
    ], 'A comma groups selectors: h1, h2, h3 { color: red } applies to all three. Same as writing three separate rules.'),

    fill('Fill in the blank to style every other list item:',
      'li:nth-child(___) {\n  background: #f0f0f0;\n}',
      ['2n', 'even', '2n+0'],
      ':nth-child(2n) or :nth-child(even) selects every 2nd element. You can also use odd, 3n, etc.'),
  ];

  l2q.forEach((q, i) => insertQuestion.run({ level_id: l2.lastInsertRowid, ...q, order_num: i + 1 }));

  // ─── LEVEL 3: Box Model ───────────────────────────────────────────────────
  const l3 = insertLevel.run({
    title: 'The Box Model',
    description: 'Understand how margin, border, padding, and content work together.',
    video_url: 'https://www.youtube.com/embed/rIO5326FgPE',
    topic: 'CSS',
    order_num: 3,
    icon: '📦',
  });

  const l3q = [
    mcq('From outermost to innermost, what is the correct order of the box model?', [
      { text: 'Margin → Border → Padding → Content', correct: true },
      { text: 'Content → Padding → Border → Margin', correct: false },
      { text: 'Padding → Margin → Border → Content', correct: false },
      { text: 'Border → Margin → Padding → Content', correct: false },
    ], 'Think of a picture frame: Content is the picture, Padding is the mat, Border is the frame, Margin is the space around the frame.'),

    mcq('What CSS property is used to set space INSIDE an element (between content and border)?', [
      { text: 'padding', correct: true },
      { text: 'margin', correct: false },
      { text: 'spacing', correct: false },
      { text: 'inset', correct: false },
    ], 'Padding is inside the border. Margin is outside. Padding adds inner breathing room to the element.'),

    mcq('What does box-sizing: border-box do?', [
      { text: 'Makes width/height include padding and border', correct: true },
      { text: 'Adds a border to all boxes', correct: false },
      { text: 'Removes all padding and margin', correct: false },
      { text: 'Centers the element in its parent', correct: false },
    ], 'With border-box, a 200px wide element stays 200px total — padding and border are included, not added on top.'),

    mcq('What shorthand sets margin on all 4 sides at once?', [
      { text: 'margin: 10px', correct: true },
      { text: 'margin: all 10px', correct: false },
      { text: 'margin: 4x 10px', correct: false },
      { text: 'margin: sides 10px', correct: false },
    ], 'margin: 10px sets all 4 sides to 10px. margin: 10px 20px sets top/bottom to 10px and left/right to 20px.'),

    identify('What does this CSS do?',
      '.box {\n  padding: 10px 20px;\n}',
      [
        { text: '10px top/bottom padding, 20px left/right padding', correct: true },
        { text: '10px left/right padding, 20px top/bottom padding', correct: false },
        { text: '10px on all sides, then 20px on all sides', correct: false },
        { text: '10px top padding, 20px bottom padding', correct: false },
      ], 'When you give 2 values to padding: the first is top/bottom, the second is left/right.'),

    identify('What does this CSS do?',
      '.box {\n  margin: 0 auto;\n}',
      [
        { text: 'Centers the element horizontally with no top/bottom margin', correct: true },
        { text: 'Removes all margin', correct: false },
        { text: 'Centers the element vertically', correct: false },
        { text: 'Sets margin to automatic on all sides', correct: false },
      ], 'margin: 0 auto is the classic way to horizontally center a block element. The element needs a defined width.'),

    wh('What CSS property controls the space BETWEEN elements (outside their borders)?', ['margin'],
      'Margin creates space outside an element\'s border, separating it from neighboring elements.'),

    wh('What CSS shorthand sets top, right, bottom, left in that exact order with 4 values?', ['margin', 'padding', 'trbl', 'top right bottom left'],
      'Both margin and padding accept 4 values in clockwise order: top right bottom left. "TRouBLe" is a common mnemonic.'),

    fill('Fill in the value to center a fixed-width block horizontally:',
      '.container {\n  width: 800px;\n  margin: 0 ___;\n}',
      ['auto'],
      'margin: 0 auto sets top/bottom margin to 0 and auto for left/right, which splits available space equally.'),

    code('Write CSS for a box that is 200px wide, 100px tall, with 15px padding and a 2px solid black border.',
      ['width', '200px', 'height', '100px', 'padding', '15px', 'border', '2px', 'solid', 'black'],
      'You need: width: 200px; height: 100px; padding: 15px; border: 2px solid black;'),

    identify('What is the total rendered width of this element (default box-sizing)?',
      '.box {\n  width: 200px;\n  padding: 20px;\n  border: 5px solid black;\n}',
      [
        { text: '250px (200 + 20+20 padding + 5+5 border)', correct: true },
        { text: '200px', correct: false },
        { text: '240px', correct: false },
        { text: '225px', correct: false },
      ], 'Default box-sizing is content-box: total width = width + padding-left + padding-right + border-left + border-right = 200+40+10 = 250px.'),

    mcq('How do you set ONLY the top margin to 20px?', [
      { text: 'margin-top: 20px', correct: true },
      { text: 'margin: 20px 0 0 0', correct: false },
      { text: 'Both A and B are correct', correct: false },
      { text: 'top-margin: 20px', correct: false },
    ], 'Both margin-top: 20px and margin: 20px 0 0 0 work! Longhand properties (like margin-top) are great for overriding single sides.'),

    mcq('What value makes an element\'s border rounded?', [
      { text: 'border-radius', correct: true },
      { text: 'border-round', correct: false },
      { text: 'border-curve', correct: false },
      { text: 'corner-radius', correct: false },
    ], 'border-radius rounds the corners. border-radius: 50% on a square element makes a perfect circle.'),

    fill('Complete the 4-value shorthand: top=10 right=20 bottom=30 left=40:',
      'margin: ___ ___ ___ ___;',
      ['10px 20px 30px 40px', '10px 20px 30px 40px;'],
      'The 4-value order is always clockwise: Top Right Bottom Left. Remember: "TRouBLe"'),

    code('Write CSS to give a div a 1px dashed red border with 10px padding on all sides.',
      ['border', '1px', 'dashed', 'red', 'padding', '10px'],
      'You need: border: 1px dashed red; padding: 10px;'),
  ];

  l3q.forEach((q, i) => insertQuestion.run({ level_id: l3.lastInsertRowid, ...q, order_num: i + 1 }));

  // ─── LEVEL 4: Flexbox ─────────────────────────────────────────────────────
  const l4 = insertLevel.run({
    title: 'Flexbox Layout',
    description: 'Use CSS Flexbox to build powerful, flexible one-dimensional layouts.',
    video_url: 'https://www.youtube.com/embed/u044iM9xsWU',
    topic: 'CSS',
    order_num: 4,
    icon: '🔀',
  });

  const l4q = [
    mcq('What CSS property turns an element into a flex container?', [
      { text: 'display: flex', correct: true },
      { text: 'flex: true', correct: false },
      { text: 'position: flex', correct: false },
      { text: 'layout: flex', correct: false },
    ], 'display: flex on a parent element makes all its direct children flex items.'),

    mcq('Which property controls how flex items are distributed along the MAIN axis?', [
      { text: 'justify-content', correct: true },
      { text: 'align-items', correct: false },
      { text: 'flex-direction', correct: false },
      { text: 'align-content', correct: false },
    ], 'justify-content controls spacing along the main axis (horizontal by default). align-items controls the cross axis.'),

    mcq('What value of justify-content puts equal space BETWEEN items (no space on edges)?', [
      { text: 'space-between', correct: true },
      { text: 'space-around', correct: false },
      { text: 'space-evenly', correct: false },
      { text: 'flex-end', correct: false },
    ], 'space-between puts space only between items. space-around adds half-space on edges. space-evenly is equal everywhere.'),

    mcq('What does flex-direction: column do?', [
      { text: 'Stacks flex items vertically', correct: true },
      { text: 'Reverses the order of items', correct: false },
      { text: 'Makes items wrap to new rows', correct: false },
      { text: 'Arranges items side by side', correct: false },
    ], 'flex-direction: column changes the main axis to vertical. row (default) is horizontal.'),

    mcq('What property makes flex items wrap to the next line when there is not enough space?', [
      { text: 'flex-wrap: wrap', correct: true },
      { text: 'flex-flow: wrap', correct: false },
      { text: 'overflow: wrap', correct: false },
      { text: 'flex-break: wrap', correct: false },
    ], 'By default flex items shrink to fit (nowrap). flex-wrap: wrap allows items to break onto new lines.'),

    identify('What does this CSS do?',
      '.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}',
      [
        { text: 'Perfectly centers children both horizontally and vertically', correct: true },
        { text: 'Centers children horizontally only', correct: false },
        { text: 'Centers children vertically only', correct: false },
        { text: 'Makes children the same size', correct: false },
      ], 'justify-content: center centers along the main axis (horizontal). align-items: center centers along the cross axis (vertical). Together they center everything!'),

    identify('What does flex: 1 do on a flex item?',
      '.item {\n  flex: 1;\n}',
      [
        { text: 'Makes the item grow to fill available space equally with siblings', correct: true },
        { text: 'Sets the item width to 1px', correct: false },
        { text: 'Makes the item fixed size', correct: false },
        { text: 'Hides the item', correct: false },
      ], 'flex: 1 is shorthand for flex-grow: 1, flex-shrink: 1, flex-basis: 0. Multiple items with flex: 1 share space equally.'),

    wh('What property controls how a SINGLE flex item aligns itself on the cross axis, overriding align-items?', ['align-self'],
      'align-self overrides the container\'s align-items for a single flex item. Useful when one item needs different alignment.'),

    wh('What is the default value of flex-direction?', ['row', 'flex-direction: row'],
      'The default is row — items are placed left to right along the horizontal main axis.'),

    fill('Complete the CSS to center content both ways inside a full-screen div:',
      '.hero {\n  display: ___;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n}',
      ['flex'],
      'display: flex is required first. Then justify-content and align-items can center the children.'),

    code('Write CSS for a flex container that puts its children in a column, centered horizontally.',
      ['display', 'flex', 'flex-direction', 'column', 'align-items', 'center'],
      'When direction is column, the main axis is vertical so justify-content handles vertical and align-items handles horizontal.'),

    identify('What does order: -1 do on a flex item?',
      '.first {\n  order: -1;\n}',
      [
        { text: 'Moves the item to the visual beginning regardless of DOM order', correct: true },
        { text: 'Hides the item', correct: false },
        { text: 'Removes the item from the flex flow', correct: false },
        { text: 'Reverses the item\'s content', correct: false },
      ], 'The order property changes visual order without changing HTML. Default is 0. Lower values appear first.'),

    mcq('What does align-content do (vs align-items)?', [
      { text: 'Controls spacing between rows when flex-wrap is active', correct: true },
      { text: 'It is the same as align-items', correct: false },
      { text: 'Aligns all items to the start', correct: false },
      { text: 'Controls column alignment in Grid', correct: false },
    ], 'align-content only works when there are multiple lines (flex-wrap: wrap). align-items works on a single line.'),

    fill('Set a flex item to NOT shrink below its base size:',
      '.item {\n  flex-shrink: ___;\n}',
      ['0'],
      'flex-shrink: 0 prevents the item from getting smaller than its natural/defined size.'),

    code('Write CSS for a navigation bar: items side by side, spaced between, centered vertically, 60px tall.',
      ['display', 'flex', 'justify-content', 'space-between', 'align-items', 'center', 'height', '60px'],
      'nav { display: flex; justify-content: space-between; align-items: center; height: 60px; }'),
  ];

  l4q.forEach((q, i) => insertQuestion.run({ level_id: l4.lastInsertRowid, ...q, order_num: i + 1 }));

  // ─── LEVEL 5: CSS Grid ────────────────────────────────────────────────────
  const l5 = insertLevel.run({
    title: 'CSS Grid',
    description: 'Build powerful two-dimensional layouts with CSS Grid.',
    video_url: 'https://www.youtube.com/embed/9zBsdzdE4sM',
    topic: 'CSS',
    order_num: 5,
    icon: '🗂️',
  });

  const l5q = [
    mcq('What CSS property turns an element into a grid container?', [
      { text: 'display: grid', correct: true },
      { text: 'grid: true', correct: false },
      { text: 'layout: grid', correct: false },
      { text: 'position: grid', correct: false },
    ], 'display: grid on a parent makes all its direct children grid items placed in rows and columns.'),

    mcq('Which property defines the NUMBER and SIZE of columns in a grid?', [
      { text: 'grid-template-columns', correct: true },
      { text: 'grid-columns', correct: false },
      { text: 'column-template', correct: false },
      { text: 'grid-layout-columns', correct: false },
    ], 'grid-template-columns defines how many columns and their sizes. Example: grid-template-columns: 1fr 2fr 1fr creates 3 columns.'),

    mcq('What does the fr unit mean in CSS Grid?', [
      { text: 'A fraction of the available space', correct: true },
      { text: 'Free space', correct: false },
      { text: 'Fixed row', correct: false },
      { text: 'Frame unit', correct: false },
    ], 'fr stands for "fractional unit". 1fr 2fr means the second column gets twice as much space as the first.'),

    mcq('What does gap: 20px do in a grid?', [
      { text: 'Sets 20px space between all rows and columns', correct: true },
      { text: 'Sets padding inside grid cells', correct: false },
      { text: 'Sets margin around the grid container', correct: false },
      { text: 'Creates a 20px empty column', correct: false },
    ], 'gap (formerly grid-gap) sets the gutter between grid cells. row-gap and column-gap set them separately.'),

    identify('How many columns does this grid have?',
      '.grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n}',
      [
        { text: '3 equal columns', correct: true },
        { text: '1 column', correct: false },
        { text: '3 fixed-width columns', correct: false },
        { text: '6 columns (1+1+1 on each row)', correct: false },
      ], '3 values in grid-template-columns means 3 columns. All are 1fr so they share space equally — like 33.33% each.'),

    identify('What does this CSS do?',
      '.item {\n  grid-column: 1 / 3;\n}',
      [
        { text: 'Makes the item span from column line 1 to column line 3 (2 columns wide)', correct: true },
        { text: 'Places the item in column 1, row 3', correct: false },
        { text: 'Creates 3 columns', correct: false },
        { text: 'Makes the item 1/3 of the grid width', correct: false },
      ], 'grid-column: start / end uses grid lines. Line 1 to line 3 spans 2 column tracks. Use span: grid-column: span 2.'),

    wh('What CSS function lets you repeat a column or row pattern easily?', ['repeat()', 'repeat', 'repeat function'],
      'repeat() avoids repetition: grid-template-columns: repeat(3, 1fr) is the same as 1fr 1fr 1fr.'),

    wh('What CSS Grid property allows items to automatically fill columns of a minimum size?', ['auto-fill', 'minmax', 'repeat auto-fill minmax'],
      'The combo repeat(auto-fill, minmax(200px, 1fr)) creates responsive columns that fill the space automatically.'),

    fill('Complete the grid to create 3 equal columns:',
      '.grid {\n  display: grid;\n  grid-template-columns: ___(3, 1fr);\n}',
      ['repeat'],
      'repeat(3, 1fr) is shorthand for 1fr 1fr 1fr — 3 equally-spaced columns.'),

    fill('Make a grid item span 2 rows:',
      '.featured {\n  grid-row: ___ / ___;  \n}',
      ['1 / 3', 'span 2'],
      'grid-row: 1 / 3 spans from row line 1 to 3 (2 rows). Shorthand: grid-row: span 2.'),

    code('Write CSS to create a 2-column grid with a 16px gap between cells.',
      ['display', 'grid', 'grid-template-columns', '1fr 1fr', 'gap', '16px'],
      '.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }'),

    identify('What layout does this create?',
      '.layout {\n  display: grid;\n  grid-template-columns: 250px 1fr;\n  grid-template-rows: 60px 1fr 40px;\n}',
      [
        { text: 'A page with fixed sidebar, flexible main area, and a header/footer', correct: true },
        { text: 'A photo gallery with 2 columns', correct: false },
        { text: 'A centered card layout', correct: false },
        { text: 'A 3-column equal layout', correct: false },
      ], 'This creates a classic page layout: fixed 250px sidebar + flexible content column, with 60px header, flexible main, and 40px footer rows.'),

    mcq('What is the difference between CSS Grid and Flexbox?', [
      { text: 'Grid is 2D (rows + columns), Flexbox is 1D (row OR column)', correct: true },
      { text: 'Grid is for old browsers, Flexbox is modern', correct: false },
      { text: 'Flexbox is 2D, Grid is 1D', correct: false },
      { text: 'There is no real difference', correct: false },
    ], 'Use Flexbox for one-dimensional layouts (a navigation, a row of cards). Use Grid for two-dimensional layouts (full page layouts, image galleries).'),

    code('Write a responsive grid that auto-fills columns, each at least 200px wide.',
      ['display', 'grid', 'grid-template-columns', 'repeat', 'auto-fill', 'minmax', '200px', '1fr'],
      'grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) — this creates a fully responsive grid without media queries!'),

    identify('What does place-items: center do?',
      '.grid {\n  display: grid;\n  place-items: center;\n}',
      [
        { text: 'Centers ALL grid items both horizontally and vertically inside their cells', correct: true },
        { text: 'Centers the grid container on the page', correct: false },
        { text: 'Centers only the first item', correct: false },
        { text: 'Aligns items to the top center', correct: false },
      ], 'place-items is shorthand for align-items and justify-items together. center centers items both ways inside their grid area.'),
  ];

  l5q.forEach((q, i) => insertQuestion.run({ level_id: l5.lastInsertRowid, ...q, order_num: i + 1 }));

  // ─── LEVEL 6: CSS Positioning ────────────────────────────────────────────
  const l6 = insertLevel.run({
    title: 'CSS Positioning',
    description: 'Control exactly where elements appear using CSS position properties.',
    video_url: 'https://www.youtube.com/embed/jx5jmI0UlXU',
    topic: 'CSS',
    order_num: 6,
    icon: '📌',
  });

  const l6q = [
    mcq('What is the DEFAULT value of the position property?', [
      { text: 'static', correct: true },
      { text: 'relative', correct: false },
      { text: 'normal', correct: false },
      { text: 'initial', correct: false },
    ], 'All elements are position: static by default, meaning they follow the normal document flow and top/left/right/bottom have no effect.'),

    mcq('Which position value allows top/left/right/bottom offsets WITHOUT removing the element from normal flow?', [
      { text: 'relative', correct: true },
      { text: 'absolute', correct: false },
      { text: 'fixed', correct: false },
      { text: 'sticky', correct: false },
    ], 'position: relative moves the element visually using offsets, but its original space is preserved in the document flow.'),

    mcq('Which position value places an element relative to its nearest positioned ancestor?', [
      { text: 'absolute', correct: true },
      { text: 'relative', correct: false },
      { text: 'fixed', correct: false },
      { text: 'sticky', correct: false },
    ], 'position: absolute removes the element from normal flow and positions it relative to the nearest ancestor with position: relative/absolute/fixed.'),

    mcq('Which position value keeps an element fixed on screen even when scrolling?', [
      { text: 'fixed', correct: true },
      { text: 'sticky', correct: false },
      { text: 'absolute', correct: false },
      { text: 'frozen', correct: false },
    ], 'position: fixed positions relative to the viewport. Perfect for sticky navbars, floating buttons, or cookie banners.'),

    identify('What does this CSS create?',
      '.navbar {\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n}',
      [
        { text: 'A navbar that stays at the top of the screen while scrolling', correct: true },
        { text: 'A navbar at the top of the document only', correct: false },
        { text: 'A navbar that scrolls with the page', correct: false },
        { text: 'A navbar positioned relative to its parent', correct: false },
      ], 'This is the classic sticky navbar pattern. position: fixed + top: 0 + width: 100% pins it to the top of the viewport.'),

    identify('What does this CSS do?',
      '.parent {\n  position: relative;\n}\n.child {\n  position: absolute;\n  top: 0;\n  right: 0;\n}',
      [
        { text: 'Places the child at the top-right corner of the parent', correct: true },
        { text: 'Places the child at the top-right of the page', correct: false },
        { text: 'Moves the parent to the top-right', correct: false },
        { text: 'Both parent and child are fixed', correct: false },
      ], 'The parent gets position: relative to become the positioning anchor. The child with position: absolute then positions itself relative to the parent.'),

    wh('What CSS property controls the stacking order of positioned elements (which one appears on top)?', ['z-index'],
      'z-index only works on positioned elements (not static). Higher z-index = on top. Negative values go behind normal flow.'),

    wh('What position value acts like relative until you scroll past a threshold, then becomes fixed?', ['sticky', 'position: sticky'],
      'position: sticky is a hybrid. It scrolls with the page until it hits the threshold (top: 0), then sticks. Great for table headers.'),

    fill('Make an element cover the ENTIRE parent container:',
      '.overlay {\n  position: ___;\n  top: 0; left: 0;\n  width: 100%; height: 100%;\n}',
      ['absolute'],
      'position: absolute with top:0 left:0 width:100% height:100% fills the nearest positioned ancestor. Used for overlays and modals.'),

    identify('Why would top: 50px have NO effect here?',
      '.box {\n  position: static;\n  top: 50px;\n}',
      [
        { text: 'Because position: static ignores top/left/right/bottom offsets', correct: true },
        { text: 'Because 50px is too small', correct: false },
        { text: 'Because top needs to be negative', correct: false },
        { text: 'Because width is not set', correct: false },
      ], 'Offset properties (top, right, bottom, left) only work on positioned elements: relative, absolute, fixed, or sticky.'),

    code('Write CSS to place a red dot (20px circle) at the top-right corner of its relatively positioned parent.',
      ['position', 'absolute', 'top', 'right', 'width', '20px', 'height', '20px', 'border-radius', '50%', 'background'],
      '.dot { position: absolute; top: 0; right: 0; width: 20px; height: 20px; border-radius: 50%; background: red; }'),

    mcq('What happens to elements that come AFTER an absolutely positioned element?', [
      { text: 'They ignore it and flow as if it is not there', correct: true },
      { text: 'They stack below it in z-order', correct: false },
      { text: 'They shift to fill its previous space', correct: false },
      { text: 'They become absolutely positioned too', correct: false },
    ], 'Absolute (and fixed) positioned elements are removed from normal document flow. Siblings flow as if the element does not exist.'),

    fill('Stick a header to the top when scrolling past it:',
      'header {\n  position: ___;\n  top: 0;\n}',
      ['sticky'],
      'position: sticky combined with top: 0 makes the header stick to the top of the viewport once you scroll to it.'),

    code('Write CSS to center a modal overlay (600px wide, 400px tall) in the exact middle of the screen.',
      ['position', 'fixed', 'top', '50%', 'left', '50%', 'transform', 'translate', '-50%', 'width', '600px', 'height', '400px'],
      '.modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; height: 400px; }'),
  ];

  l6q.forEach((q, i) => insertQuestion.run({ level_id: l6.lastInsertRowid, ...q, order_num: i + 1 }));

  // ─── LEVEL 7: CSS Animations ─────────────────────────────────────────────
  const l7 = insertLevel.run({
    title: 'CSS Animations',
    description: 'Bring your designs to life with CSS transitions and keyframe animations.',
    video_url: 'https://www.youtube.com/embed/YszONjKpgg4',
    topic: 'CSS',
    order_num: 7,
    icon: '✨',
  });

  const l7q = [
    mcq('What CSS property creates a smooth change between two states on hover?', [
      { text: 'transition', correct: true },
      { text: 'animation', correct: false },
      { text: 'transform', correct: false },
      { text: 'keyframes', correct: false },
    ], 'transition smoothly interpolates between two states (like default → hover). animation plays sequences defined with @keyframes.'),

    mcq('What does transition: all 0.3s ease do?', [
      { text: 'Smoothly animates ALL changing properties over 0.3 seconds', correct: true },
      { text: 'Animates only opacity changes', correct: false },
      { text: 'Delays all transitions by 0.3 seconds', correct: false },
      { text: 'Creates a 0.3s animation loop', correct: false },
    ], '"all" targets every changing property. "0.3s" is the duration. "ease" is the timing function (starts fast, ends slow).'),

    mcq('What @-rule defines keyframes for a CSS animation?', [
      { text: '@keyframes', correct: true },
      { text: '@animation', correct: false },
      { text: '@frames', correct: false },
      { text: '@motion', correct: false },
    ], '@keyframes defines the animation sequence. You give it a name and define the from/to or percentage states.'),

    identify('What does this animation do?',
      '@keyframes fadeIn {\n  from { opacity: 0; }\n  to   { opacity: 1; }\n}',
      [
        { text: 'Fades an element from invisible to fully visible', correct: true },
        { text: 'Fades an element from visible to invisible', correct: false },
        { text: 'Alternates between visible and invisible in a loop', correct: false },
        { text: 'Applies opacity 0 then opacity 1 instantly', correct: false },
      ], 'from is the start state (0% of animation), to is the end state (100%). Combined with animation-duration it creates a smooth fade-in.'),

    identify('What does transform: translate(-50%, -50%) do?',
      '.centered {\n  position: absolute;\n  top: 50%; left: 50%;\n  transform: translate(-50%, -50%);\n}',
      [
        { text: 'Moves the element up and left by half its own width/height to perfectly center it', correct: true },
        { text: 'Scales the element to 50% of its size', correct: false },
        { text: 'Rotates the element 50 degrees', correct: false },
        { text: 'Centers the element in the viewport using percentages', correct: false },
      ], 'top: 50% left: 50% puts the top-left corner at center. translate(-50%, -50%) shifts the element back by half its own dimensions, achieving true centering.'),

    wh('What CSS property applies a named @keyframes animation to an element?', ['animation-name', 'animation'],
      'animation-name references the @keyframes name. You also need animation-duration for it to play.'),

    wh('What timing function makes an animation start slow, speed up, then slow down at the end?', ['ease', 'ease-in-out'],
      'ease is the default — starts and ends slowly. ease-in-out is more symmetric. linear maintains constant speed throughout.'),

    fill('Connect the animation to the element — fill in the animation name:',
      '@keyframes spin {\n  from { transform: rotate(0deg); }\n  to   { transform: rotate(360deg); }\n}\n\n.loader {\n  animation: ___ 1s linear infinite;\n}',
      ['spin'],
      'The animation property value starts with the @keyframes name (spin), then duration (1s), timing (linear), and iteration (infinite).'),

    fill('Make a button scale up slightly on hover smoothly:',
      '.btn {\n  transition: transform 0.2s ease;\n}\n.btn:hover {\n  transform: ___(1.05);\n}',
      ['scale', 'scale(1.05)'],
      'transform: scale(1.05) enlarges the element to 105% of its size. Combined with transition it creates a smooth grow effect.'),

    code('Write CSS to make a div spin 360 degrees continuously every 2 seconds.',
      ['@keyframes', 'rotate', '360deg', 'animation', '2s', 'linear', 'infinite'],
      '@keyframes spin { to { transform: rotate(360deg); } }\n.spinner { animation: spin 2s linear infinite; }'),

    identify('What does animation-fill-mode: forwards do?',
      '.box {\n  animation: slideIn 0.5s ease forwards;\n}',
      [
        { text: 'Keeps the element in the final animation state after it finishes', correct: true },
        { text: 'Makes the animation play in the forward direction', correct: false },
        { text: 'Repeats the animation forward then backward', correct: false },
        { text: 'Delays the animation start', correct: false },
      ], 'Without forwards, elements snap back to their original style after animating. forwards retains the final keyframe values.'),

    mcq('What does animation-iteration-count: infinite do?', [
      { text: 'Loops the animation forever', correct: true },
      { text: 'Plays the animation once very slowly', correct: false },
      { text: 'Plays the animation 100 times', correct: false },
      { text: 'Stops the animation from playing', correct: false },
    ], 'infinite makes the animation loop continuously. You can also use a number: animation-iteration-count: 3 plays it 3 times.'),

    code('Write a CSS transition that smoothly changes background-color over 0.4 seconds with an ease-in timing.',
      ['transition', 'background-color', '0.4s', 'ease-in'],
      'transition: background-color 0.4s ease-in; — you can also use background instead of background-color.'),

    identify('What does this keyframe do?',
      '@keyframes shake {\n  0%, 100% { transform: translateX(0); }\n  25%       { transform: translateX(-10px); }\n  75%       { transform: translateX(10px); }\n}',
      [
        { text: 'Creates a left-right shake effect', correct: true },
        { text: 'Makes the element move up and down', correct: false },
        { text: 'Rotates the element back and forth', correct: false },
        { text: 'Fades the element in and out', correct: false },
      ], 'The element starts centered, moves left at 25%, right at 75%, then back to center at 100% — producing a shake/error animation.'),

    fill('Animate only when the user has NOT requested reduced motion:',
      '@media (prefers-_____-motion: no-preference) {\n  .box { animation: spin 2s linear infinite; }\n}',
      ['reduced'],
      'prefers-reduced-motion is an accessibility media query. Always wrap complex animations in this check to respect user preferences.'),
  ];

  l7q.forEach((q, i) => insertQuestion.run({ level_id: l7.lastInsertRowid, ...q, order_num: i + 1 }));

  console.log('Database seeded: 7 levels, 105 questions');
}

module.exports = { db, initDB };
