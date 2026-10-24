'use strict';

// ── Environment detection ─────────────────────────────────────────────────────
const IS_NATIVE = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const DB_NAME   = 'learning';

// ── Raw plugin accessor ───────────────────────────────────────────────────────
function P() { return window.Capacitor.Plugins.CapacitorSQLite; }

// ── Low-level helpers (native only) ──────────────────────────────────────────
async function _exec(sql) {
  return P().execute({ database: DB_NAME, statements: sql, transaction: true });
}
async function _run(sql, vals = []) {
  const r = await P().run({ database: DB_NAME, statement: sql, values: vals, transaction: false });
  return { lastID: r.changes?.lastId ?? 0, changes: r.changes?.changes ?? 0 };
}
async function _get(sql, vals = []) {
  const r = await P().query({ database: DB_NAME, statement: sql, values: vals });
  return r.values && r.values.length ? r.values[0] : null;
}
async function _all(sql, vals = []) {
  const r = await P().query({ database: DB_NAME, statement: sql, values: vals });
  return r.values || [];
}

// ── Schema ────────────────────────────────────────────────────────────────────
async function _createSchema() {
  await _exec(`CREATE TABLE IF NOT EXISTS levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,
    description TEXT, video_url TEXT, topic TEXT, order_num INTEGER, icon TEXT)`);
  await _exec(`CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, level_id INTEGER NOT NULL,
    type TEXT NOT NULL, question TEXT NOT NULL, code_snippet TEXT,
    choices TEXT, correct_answer TEXT NOT NULL, explanation TEXT, order_num INTEGER,
    FOREIGN KEY (level_id) REFERENCES levels(id))`);
  await _exec(`CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL,
    level_id INTEGER NOT NULL, completed INTEGER DEFAULT 0, score INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0, started_at TEXT DEFAULT (datetime('now')), completed_at TEXT,
    FOREIGN KEY (level_id) REFERENCES levels(id))`);
}

// ── Seed helpers ──────────────────────────────────────────────────────────────
const mcq      = (q,o,e)   => ({ type:'mcq',      question:q, code_snippet:null,    choices:JSON.stringify(o),   correct_answer:o.find(x=>x.correct).text,  explanation:e });
const wh       = (q,a,e)   => ({ type:'wh',       question:q, code_snippet:null,    choices:null,                correct_answer:JSON.stringify(a),           explanation:e });
const codeq    = (q,k,e,s=null) => ({ type:'code',question:q, code_snippet:s,       choices:null,                correct_answer:JSON.stringify({keywords:k}),explanation:e });
const identify = (q,s,o,e) => ({ type:'identify', question:q, code_snippet:s,       choices:JSON.stringify(o),   correct_answer:o.find(x=>x.correct).text,  explanation:e });
const fill     = (q,s,a,e) => ({ type:'fill',     question:q, code_snippet:s,       choices:null,                correct_answer:JSON.stringify(a),           explanation:e });

async function _seedLevel(meta, questions) {
  const r = await _run(
    'INSERT INTO levels (title,description,video_url,topic,order_num,icon) VALUES (?,?,?,?,?,?)',
    [meta.title, meta.description, meta.video_url, meta.topic, meta.order_num, meta.icon]);
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await _run(
      'INSERT INTO questions (level_id,type,question,code_snippet,choices,correct_answer,explanation,order_num) VALUES (?,?,?,?,?,?,?,?)',
      [r.lastID, q.type, q.question, q.code_snippet, q.choices, q.correct_answer, q.explanation, i + 1]);
  }
}

async function _seed() {
  // ── Level 1: HTML Basics ────────────────────────────────────────────────────
  await _seedLevel(
    { title:'HTML Basics', description:'Learn the building blocks of every web page — tags, elements, and structure.', video_url:'https://www.youtube.com/embed/qz0aGYrrlhU', topic:'HTML', order_num:1, icon:'📄' },
    [
      mcq('What does HTML stand for?',[{text:'HyperText Markup Language',correct:true},{text:'High Tech Modern Language',correct:false},{text:'Hyper Transfer Markup Language',correct:false},{text:'Home Tool Markup Language',correct:false}],'HTML stands for HyperText Markup Language — the standard language for building web pages.'),
      mcq('Which tag creates the largest heading?',[{text:'<h1>',correct:true},{text:'<h6>',correct:false},{text:'<heading>',correct:false},{text:'<big>',correct:false}],'<h1> is the largest heading. Headings go from <h1> (biggest) to <h6> (smallest).'),
      mcq('Which tag creates a hyperlink?',[{text:'<a>',correct:true},{text:'<link>',correct:false},{text:'<href>',correct:false},{text:'<url>',correct:false}],'The <a> (anchor) tag creates hyperlinks. The href attribute sets the destination URL.'),
      mcq('Which tag creates an unordered list?',[{text:'<ul>',correct:true},{text:'<ol>',correct:false},{text:'<li>',correct:false},{text:'<list>',correct:false}],'<ul> creates an unordered list. <ol> creates a numbered list. <li> is the list item inside either.'),
      mcq('What does the <br> tag do?',[{text:'Inserts a line break',correct:true},{text:'Creates a border',correct:false},{text:'Makes text bold',correct:false},{text:'Creates a new section',correct:false}],'<br> is a self-closing tag that inserts a line break (like pressing Enter).'),
      wh('What attribute on <img> provides alternative text for screen readers?',['alt','alt attribute','alt=""'],'The alt attribute provides a text description of the image for accessibility.'),
      wh('What tag wraps ALL visible content on a web page?',['body','<body>','body tag'],'The <body> tag contains everything visible on the page.'),
      identify('What does this HTML create?','<a href="https://google.com" target="_blank">Open Google</a>',[{text:'A link that opens Google in a new tab',correct:true},{text:'A button that navigates to Google',correct:false},{text:'A link that downloads a file',correct:false},{text:'An image linking to Google',correct:false}],'target="_blank" makes the link open in a new browser tab.'),
      identify('What is wrong with this HTML?','<img src="photo.jpg">',[{text:'Missing alt attribute for accessibility',correct:true},{text:'Wrong tag — should be <image>',correct:false},{text:'src should be href',correct:false},{text:'Nothing is wrong',correct:false}],'Every <img> should have an alt attribute for accessibility and SEO.'),
      fill('Fill in the blank to complete the document structure:','<!DOCTYPE html>\n<html>\n  <___>\n    <title>My Page</title>\n  </___>\n  <body></body>\n</html>',['head'],'The <head> section contains metadata — not directly visible on the page.'),
      codeq('Write an HTML paragraph containing the text "Hello World".',['<p>','Hello World','</p>'],'A paragraph is created with <p>content</p>. Always close your tags!'),
      codeq('Write an img tag that shows "logo.png" with alt "Company Logo".',['<img','src','logo.png','alt','Company Logo'],'The correct syntax is: <img src="logo.png" alt="Company Logo">'),
      mcq('Which HTML tag makes text bold AND carries semantic meaning?',[{text:'<strong>',correct:true},{text:'<bold>',correct:false},{text:'<b>',correct:false},{text:'<em>',correct:false}],'<strong> is the semantic tag for important text. <b> visually bolds but carries no meaning.'),
      identify('What does this code produce?','<ul>\n  <li>Apple</li>\n  <li>Banana</li>\n  <li>Cherry</li>\n</ul>',[{text:'A bullet list with 3 fruit items',correct:true},{text:'A numbered list',correct:false},{text:'A table',correct:false},{text:'Three paragraphs',correct:false}],'<ul> + <li> creates an unordered bulleted list.'),
      fill('Complete the tag to load an external CSS file:','<link rel="stylesheet" ___="styles.css">',['href'],'The href attribute in <link> points to the CSS file path.'),
    ]);

  // ── Level 2: CSS Selectors ────────────────────────────────────────────────
  await _seedLevel(
    { title:'CSS Selectors', description:'Master the art of targeting HTML elements with CSS selectors.', video_url:'https://www.youtube.com/embed/l1mER1bV0N0', topic:'CSS', order_num:2, icon:'🎯' },
    [
      mcq('How do you select an element with class "card"?',[{text:'.card',correct:true},{text:'#card',correct:false},{text:'card',correct:false},{text:'*card',correct:false}],'A dot (.) selects by class. Example: .card { color: red; }'),
      mcq('How do you select an element with id "header"?',[{text:'#header',correct:true},{text:'.header',correct:false},{text:'header',correct:false},{text:'@header',correct:false}],'A hash (#) selects by id. IDs should be unique on a page.'),
      mcq('Which selector targets ALL elements?',[{text:'*',correct:true},{text:'all',correct:false},{text:'every',correct:false},{text:'%',correct:false}],'The universal selector * matches every element. Used in CSS resets.'),
      mcq('Which targets only <p> DIRECTLY inside a <div>?',[{text:'div > p',correct:true},{text:'div p',correct:false},{text:'div + p',correct:false},{text:'div ~ p',correct:false}],'The > child combinator selects only direct children.'),
      mcq('How to select elements with BOTH class "card" AND "active"?',[{text:'.card.active',correct:true},{text:'.card .active',correct:false},{text:'.card, .active',correct:false},{text:'.card + .active',correct:false}],'Chaining with no space means "element with both classes".'),
      identify('What does this CSS rule do?','p:first-child {\n  color: blue;\n}',[{text:'Targets the first <p> that is a first child of its parent',correct:true},{text:'Targets the first <p> on the page',correct:false},{text:'Targets only the first letter of every <p>',correct:false},{text:'Targets every <p> inside a first child',correct:false}],':first-child matches an element when it is the first child of its parent.'),
      identify('What does this CSS target?','a:hover {\n  text-decoration: underline;\n}',[{text:'Links when the mouse hovers over them',correct:true},{text:'Links that have been visited',correct:false},{text:'All anchor tags by default',correct:false},{text:'Links that are active/clicked',correct:false}],':hover applies styles when the user moves their mouse over the element.'),
      wh('What symbol is used to write a CSS comment?',['/* */','/* comment */','/* and */'],'CSS comments use /* ... */ syntax.'),
      wh('What combinator selects an element immediately preceded by a specific sibling?',['+','adjacent sibling combinator'],'The + combinator selects the element that directly follows the specified element.'),
      fill('Select the button only when focused:','button___focus {\n  outline: 2px solid blue;\n}',[':',':'],':focus applies when the element has keyboard or click focus.'),
      codeq('Write CSS to make all <h2> elements purple with font-size 28px.',['h2','color','purple','font-size','28px'],'h2 { color: purple; font-size: 28px; }'),
      codeq('Write CSS to make class "highlight" background yellow.',['.highlight','background','yellow'],'.highlight { background-color: yellow; }'),
      identify('Which selector has the HIGHEST specificity?','/* A */ p { color: red; }\n/* B */ .text { color: blue; }\n/* C */ #title { color: green; }',[{text:'#title (id selector)',correct:true},{text:'.text (class)',correct:false},{text:'p (element)',correct:false},{text:'All equal',correct:false}],'Specificity: inline > ID > class > element.'),
      mcq('What does the comma do in CSS selectors?',[{text:'Applies styles to multiple selectors',correct:true},{text:'Targets a child element',correct:false},{text:'Targets a sibling element',correct:false},{text:'Increases specificity',correct:false}],'h1, h2, h3 { color: red } applies to all three.'),
      fill('Style every other list item:','li:nth-child(___) {\n  background: #f0f0f0;\n}',['2n','even'],':nth-child(even) selects every 2nd element.'),
    ]);

  // ── Level 3: Box Model ────────────────────────────────────────────────────
  await _seedLevel(
    { title:'The Box Model', description:'Understand how margin, border, padding, and content work together.', video_url:'https://www.youtube.com/embed/rIO5326FgPE', topic:'CSS', order_num:3, icon:'📦' },
    [
      mcq('From outermost to innermost, what is the correct box model order?',[{text:'Margin → Border → Padding → Content',correct:true},{text:'Content → Padding → Border → Margin',correct:false},{text:'Padding → Margin → Border → Content',correct:false},{text:'Border → Margin → Padding → Content',correct:false}],'Picture frame: Content=picture, Padding=mat, Border=frame, Margin=wall space.'),
      mcq('What property sets space INSIDE an element between content and border?',[{text:'padding',correct:true},{text:'margin',correct:false},{text:'spacing',correct:false},{text:'inset',correct:false}],'Padding is inside the border. Margin is outside.'),
      mcq('What does box-sizing: border-box do?',[{text:'Makes width/height include padding and border',correct:true},{text:'Adds a border to all boxes',correct:false},{text:'Removes all padding and margin',correct:false},{text:'Centers the element',correct:false}],'With border-box, a 200px element stays 200px total — padding and border are included.'),
      mcq('What shorthand sets margin on all 4 sides?',[{text:'margin: 10px',correct:true},{text:'margin: all 10px',correct:false},{text:'margin: 4x 10px',correct:false},{text:'margin: sides 10px',correct:false}],'margin: 10px sets all 4 sides to 10px.'),
      identify('What does this CSS do?','.box {\n  padding: 10px 20px;\n}',[{text:'10px top/bottom, 20px left/right padding',correct:true},{text:'10px left/right, 20px top/bottom',correct:false},{text:'10px on all sides then 20px on all sides',correct:false},{text:'10px top, 20px bottom',correct:false}],'2 values: first = top/bottom, second = left/right.'),
      identify('What does this CSS do?','.box {\n  margin: 0 auto;\n}',[{text:'Centers the element horizontally with no top/bottom margin',correct:true},{text:'Removes all margin',correct:false},{text:'Centers vertically',correct:false},{text:'Sets margin to auto on all sides',correct:false}],'margin: 0 auto is the classic way to horizontally center a block element.'),
      wh('What CSS property controls space BETWEEN elements outside their borders?',['margin'],'Margin creates space outside the border, separating it from neighboring elements.'),
      wh('What shorthand sets top, right, bottom, left with 4 values?',['margin','padding'],'Both accept 4 values clockwise: top right bottom left. "TRouBLe".'),
      fill('Center a fixed-width block horizontally:','.container {\n  width: 800px;\n  margin: 0 ___;\n}',['auto'],'margin: 0 auto splits available space equally left and right.'),
      codeq('Write CSS: 200px wide, 100px tall, 15px padding, 2px solid black border.',['width','200px','height','100px','padding','15px','border','2px','solid','black'],'width: 200px; height: 100px; padding: 15px; border: 2px solid black;'),
      identify('Total rendered width of this element (default box-sizing)?','.box {\n  width: 200px;\n  padding: 20px;\n  border: 5px solid black;\n}',[{text:'250px (200 + 40 padding + 10 border)',correct:true},{text:'200px',correct:false},{text:'240px',correct:false},{text:'225px',correct:false}],'Default content-box: total = width + padding + border = 200+40+10 = 250px.'),
      mcq('How do you set ONLY the top margin to 20px?',[{text:'margin-top: 20px',correct:true},{text:'margin: 20px 0 0 0',correct:false},{text:'Both A and B are correct',correct:false},{text:'top-margin: 20px',correct:false}],'Both margin-top: 20px and margin: 20px 0 0 0 work!'),
      mcq('What property rounds element corners?',[{text:'border-radius',correct:true},{text:'border-round',correct:false},{text:'border-curve',correct:false},{text:'corner-radius',correct:false}],'border-radius: 50% on a square makes a perfect circle.'),
      fill('Complete 4-value shorthand: top=10 right=20 bottom=30 left=40:','margin: ___ ___ ___ ___;',['10px 20px 30px 40px'],'Clockwise: Top Right Bottom Left. Remember "TRouBLe".'),
      codeq('Write CSS: 1px dashed red border with 10px padding.',['border','1px','dashed','red','padding','10px'],'border: 1px dashed red; padding: 10px;'),
    ]);

  // ── Level 4: Flexbox ──────────────────────────────────────────────────────
  await _seedLevel(
    { title:'Flexbox Layout', description:'Use CSS Flexbox to build flexible one-dimensional layouts.', video_url:'https://www.youtube.com/embed/u044iM9xsWU', topic:'CSS', order_num:4, icon:'🔀' },
    [
      mcq('What CSS turns an element into a flex container?',[{text:'display: flex',correct:true},{text:'flex: true',correct:false},{text:'position: flex',correct:false},{text:'layout: flex',correct:false}],'display: flex makes all direct children flex items.'),
      mcq('Which controls distribution along the MAIN axis?',[{text:'justify-content',correct:true},{text:'align-items',correct:false},{text:'flex-direction',correct:false},{text:'align-content',correct:false}],'justify-content = main axis. align-items = cross axis.'),
      mcq('What value puts equal space BETWEEN items (no edge space)?',[{text:'space-between',correct:true},{text:'space-around',correct:false},{text:'space-evenly',correct:false},{text:'flex-end',correct:false}],'space-between: space only between items. space-around: half-space on edges.'),
      mcq('What does flex-direction: column do?',[{text:'Stacks flex items vertically',correct:true},{text:'Reverses item order',correct:false},{text:'Makes items wrap',correct:false},{text:'Arranges items side by side',correct:false}],'column changes main axis to vertical. row (default) is horizontal.'),
      mcq('What makes flex items wrap when there is not enough space?',[{text:'flex-wrap: wrap',correct:true},{text:'flex-flow: wrap',correct:false},{text:'overflow: wrap',correct:false},{text:'flex-break: wrap',correct:false}],'flex-wrap: wrap allows items to break onto new lines.'),
      identify('What does this CSS do?','.container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}',[{text:'Perfectly centers children both horizontally and vertically',correct:true},{text:'Centers horizontally only',correct:false},{text:'Centers vertically only',correct:false},{text:'Makes children the same size',correct:false}],'justify-content: center + align-items: center = perfect centering!'),
      identify('What does flex: 1 do?','.item {\n  flex: 1;\n}',[{text:'Makes the item grow to fill space equally with siblings',correct:true},{text:'Sets width to 1px',correct:false},{text:'Makes the item fixed size',correct:false},{text:'Hides the item',correct:false}],'flex: 1 = flex-grow:1, flex-shrink:1, flex-basis:0.'),
      wh('What property lets a SINGLE flex item override align-items?',['align-self'],'align-self overrides the container\'s align-items for one item.'),
      wh('What is the default value of flex-direction?',['row','flex-direction: row'],'Default is row — items placed left to right.'),
      fill('Complete CSS to center content both ways:','.hero {\n  display: ___;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n}',['flex'],'display: flex is required first.'),
      codeq('Write CSS for a flex container: column direction, centered horizontally.',['display','flex','flex-direction','column','align-items','center'],'display: flex; flex-direction: column; align-items: center;'),
      identify('What does order: -1 do?','.first {\n  order: -1;\n}',[{text:'Moves the item to the visual beginning',correct:true},{text:'Hides the item',correct:false},{text:'Removes it from flex flow',correct:false},{text:'Reverses item content',correct:false}],'order changes visual order without changing HTML. Default is 0.'),
      mcq('What does align-content do vs align-items?',[{text:'Controls spacing between rows when flex-wrap is active',correct:true},{text:'Same as align-items',correct:false},{text:'Aligns all items to start',correct:false},{text:'Controls Grid columns',correct:false}],'align-content works on multiple lines (flex-wrap: wrap). align-items: single line.'),
      fill('Prevent a flex item from shrinking below its size:','.item {\n  flex-shrink: ___;\n}',['0'],'flex-shrink: 0 prevents the item from getting smaller than its natural size.'),
      codeq('Navbar: items side by side, space between, centered vertically, 60px tall.',['display','flex','justify-content','space-between','align-items','center','height','60px'],'display: flex; justify-content: space-between; align-items: center; height: 60px;'),
    ]);

  // ── Level 5: CSS Grid ─────────────────────────────────────────────────────
  await _seedLevel(
    { title:'CSS Grid', description:'Build powerful two-dimensional layouts with CSS Grid.', video_url:'https://www.youtube.com/embed/9zBsdzdE4sM', topic:'CSS', order_num:5, icon:'🗂️' },
    [
      mcq('What turns an element into a grid container?',[{text:'display: grid',correct:true},{text:'grid: true',correct:false},{text:'layout: grid',correct:false},{text:'position: grid',correct:false}],'display: grid makes all direct children grid items.'),
      mcq('Which property defines number and size of columns?',[{text:'grid-template-columns',correct:true},{text:'grid-columns',correct:false},{text:'column-template',correct:false},{text:'grid-layout-columns',correct:false}],'grid-template-columns: 1fr 2fr 1fr creates 3 columns.'),
      mcq('What does the fr unit mean?',[{text:'A fraction of available space',correct:true},{text:'Free space',correct:false},{text:'Fixed row',correct:false},{text:'Frame unit',correct:false}],'1fr 2fr: second column gets twice as much space as the first.'),
      mcq('What does gap: 20px do in a grid?',[{text:'Sets 20px space between rows and columns',correct:true},{text:'Sets padding inside cells',correct:false},{text:'Sets margin around the grid',correct:false},{text:'Creates a 20px empty column',correct:false}],'gap sets the gutter between grid cells.'),
      identify('How many columns does this grid have?','.grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n}',[{text:'3 equal columns',correct:true},{text:'1 column',correct:false},{text:'3 fixed-width columns',correct:false},{text:'6 columns',correct:false}],'3 values = 3 columns. All 1fr means equal sharing.'),
      identify('What does this CSS do?','.item {\n  grid-column: 1 / 3;\n}',[{text:'Item spans from column line 1 to 3 (2 columns wide)',correct:true},{text:'Places item in column 1, row 3',correct:false},{text:'Creates 3 columns',correct:false},{text:'Makes item 1/3 width',correct:false}],'grid-column: 1/3 spans 2 column tracks.'),
      wh('What CSS function repeats a column/row pattern?',['repeat()','repeat'],'repeat(3, 1fr) = 1fr 1fr 1fr. Avoids repetition.'),
      wh('What lets items auto-fill columns of a minimum size?',['auto-fill','minmax','repeat auto-fill minmax'],'repeat(auto-fill, minmax(200px, 1fr)) creates responsive columns without media queries.'),
      fill('Create 3 equal columns:','.grid {\n  display: grid;\n  grid-template-columns: ___(3, 1fr);\n}',['repeat'],'repeat(3, 1fr) = 3 equal columns.'),
      fill('Make an item span 2 rows:','.featured {\n  grid-row: ___ / ___;\n}',['1 / 3','span 2'],'grid-row: 1/3 spans from line 1 to 3 (2 rows).'),
      codeq('Write CSS: 2-column grid with 16px gap.',['display','grid','grid-template-columns','1fr 1fr','gap','16px'],'display: grid; grid-template-columns: 1fr 1fr; gap: 16px;'),
      identify('What layout does this create?','.layout {\n  display: grid;\n  grid-template-columns: 250px 1fr;\n  grid-template-rows: 60px 1fr 40px;\n}',[{text:'Fixed sidebar + flexible main, with header and footer',correct:true},{text:'Photo gallery with 2 columns',correct:false},{text:'Centered card layout',correct:false},{text:'3-column equal layout',correct:false}],'Classic page layout: 250px sidebar + flexible content, 60px header, flexible main, 40px footer.'),
      mcq('Difference between CSS Grid and Flexbox?',[{text:'Grid is 2D (rows+columns), Flexbox is 1D (row OR column)',correct:true},{text:'Grid is old, Flexbox is modern',correct:false},{text:'Flexbox is 2D, Grid is 1D',correct:false},{text:'No real difference',correct:false}],'Use Flexbox for 1D layouts. Use Grid for 2D page layouts.'),
      codeq('Responsive grid: auto-fill columns, each min 200px.',['display','grid','grid-template-columns','repeat','auto-fill','minmax','200px','1fr'],'grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))'),
      identify('What does place-items: center do?','.grid {\n  display: grid;\n  place-items: center;\n}',[{text:'Centers ALL items both horizontally and vertically in their cells',correct:true},{text:'Centers the grid container',correct:false},{text:'Centers only the first item',correct:false},{text:'Aligns items to top center',correct:false}],'place-items = shorthand for align-items + justify-items.'),
    ]);

  // ── Level 6: CSS Positioning ──────────────────────────────────────────────
  await _seedLevel(
    { title:'CSS Positioning', description:'Control exactly where elements appear using CSS position properties.', video_url:'https://www.youtube.com/embed/jx5jmI0UlXU', topic:'CSS', order_num:6, icon:'📌' },
    [
      mcq('What is the DEFAULT value of position?',[{text:'static',correct:true},{text:'relative',correct:false},{text:'normal',correct:false},{text:'initial',correct:false}],'position: static = normal document flow. top/left have no effect.'),
      mcq('Which allows offsets WITHOUT removing from normal flow?',[{text:'relative',correct:true},{text:'absolute',correct:false},{text:'fixed',correct:false},{text:'sticky',correct:false}],'position: relative moves visually but preserves original space.'),
      mcq('Which places an element relative to its nearest positioned ancestor?',[{text:'absolute',correct:true},{text:'relative',correct:false},{text:'fixed',correct:false},{text:'sticky',correct:false}],'position: absolute removes from flow, positions relative to nearest positioned ancestor.'),
      mcq('Which keeps an element fixed on screen while scrolling?',[{text:'fixed',correct:true},{text:'sticky',correct:false},{text:'absolute',correct:false},{text:'frozen',correct:false}],'position: fixed positions relative to the viewport. Perfect for sticky navbars.'),
      identify('What does this CSS create?','.navbar {\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n}',[{text:'A navbar that stays at top while scrolling',correct:true},{text:'A navbar only at document top',correct:false},{text:'A navbar that scrolls with the page',correct:false},{text:'A navbar relative to its parent',correct:false}],'Classic sticky navbar: fixed + top:0 + width:100%.'),
      identify('What does this CSS do?','.parent {\n  position: relative;\n}\n.child {\n  position: absolute;\n  top: 0;\n  right: 0;\n}',[{text:'Places child at top-right corner of parent',correct:true},{text:'Places child at top-right of page',correct:false},{text:'Moves parent to top-right',correct:false},{text:'Both are fixed',correct:false}],'Parent: relative (anchor). Child: absolute = positions relative to parent.'),
      wh('What property controls stacking order of positioned elements?',['z-index'],'z-index only works on positioned elements. Higher = on top.'),
      wh('What position acts like relative until scrolled past, then becomes fixed?',['sticky','position: sticky'],'position: sticky is a hybrid — sticks at threshold (top: 0). Great for table headers.'),
      fill('Make element cover entire parent:','.overlay {\n  position: ___;\n  top: 0; left: 0;\n  width: 100%; height: 100%;\n}',['absolute'],'position: absolute + top:0 left:0 + 100% dimensions fills the positioned ancestor.'),
      identify('Why does top: 50px have NO effect?','.box {\n  position: static;\n  top: 50px;\n}',[{text:'position: static ignores top/left/right/bottom offsets',correct:true},{text:'50px is too small',correct:false},{text:'top needs to be negative',correct:false},{text:'Width is not set',correct:false}],'Offset properties only work on positioned elements (relative/absolute/fixed/sticky).'),
      codeq('20px red circle at top-right of relatively positioned parent.',['position','absolute','top','right','width','20px','height','20px','border-radius','50%','background'],'.dot { position: absolute; top: 0; right: 0; width: 20px; height: 20px; border-radius: 50%; background: red; }'),
      mcq('What happens to elements AFTER an absolutely positioned element?',[{text:'They ignore it and flow as if it is not there',correct:true},{text:'They stack below it in z-order',correct:false},{text:'They shift to fill its space',correct:false},{text:'They also become absolute',correct:false}],'Absolute/fixed elements are removed from flow. Siblings flow as if they do not exist.'),
      fill('Stick header to top when scrolling:','header {\n  position: ___;\n  top: 0;\n}',['sticky'],'position: sticky + top: 0 sticks the header once you scroll to it.'),
      codeq('Center a 600x400 modal in the middle of the screen.',['position','fixed','top','50%','left','50%','transform','translate','-50%','width','600px','height','400px'],'.modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; height: 400px; }'),
      mcq('What property changes an element from block to inline?',[{text:'display',correct:true},{text:'position',correct:false},{text:'float',correct:false},{text:'visibility',correct:false}],'display controls participation in document flow: block, inline, flex, grid, none.'),
    ]);

  // ── Level 7: CSS Animations ───────────────────────────────────────────────
  await _seedLevel(
    { title:'CSS Animations', description:'Bring your designs to life with CSS transitions and keyframe animations.', video_url:'https://www.youtube.com/embed/YszONjKpgg4', topic:'CSS', order_num:7, icon:'✨' },
    [
      mcq('What creates a smooth change between two states on hover?',[{text:'transition',correct:true},{text:'animation',correct:false},{text:'transform',correct:false},{text:'keyframes',correct:false}],'transition interpolates between states (default→hover). animation plays @keyframe sequences.'),
      mcq('What does transition: all 0.3s ease do?',[{text:'Smoothly animates ALL changing properties over 0.3 seconds',correct:true},{text:'Animates only opacity',correct:false},{text:'Delays transitions by 0.3s',correct:false},{text:'Creates a 0.3s loop',correct:false}],'"all" = every changing property. "0.3s" = duration. "ease" = timing function.'),
      mcq('What @-rule defines keyframes for a CSS animation?',[{text:'@keyframes',correct:true},{text:'@animation',correct:false},{text:'@frames',correct:false},{text:'@motion',correct:false}],'@keyframes defines the animation sequence with named states.'),
      identify('What does this animation do?','@keyframes fadeIn {\n  from { opacity: 0; }\n  to   { opacity: 1; }\n}',[{text:'Fades an element from invisible to fully visible',correct:true},{text:'Fades from visible to invisible',correct:false},{text:'Alternates visible/invisible',correct:false},{text:'Instantly switches opacity',correct:false}],'from=start state, to=end state. Creates a smooth fade-in.'),
      identify('What does transform: translate(-50%, -50%) do?','.centered {\n  position: absolute;\n  top: 50%; left: 50%;\n  transform: translate(-50%, -50%);\n}',[{text:'Moves element up/left by half its own size to perfectly center it',correct:true},{text:'Scales to 50%',correct:false},{text:'Rotates 50 degrees',correct:false},{text:'Centers using viewport percentages',correct:false}],'top:50% left:50% puts top-left at center. translate(-50%,-50%) shifts back by half the element size.'),
      wh('What property applies a named @keyframes animation?',['animation-name','animation'],'animation-name references the @keyframes name. Also needs animation-duration.'),
      wh('What timing function starts slow, speeds up, then slows at end?',['ease','ease-in-out'],'ease = default. ease-in-out is more symmetric. linear = constant speed.'),
      fill('Fill in the animation name:','@keyframes spin {\n  from { transform: rotate(0deg); }\n  to   { transform: rotate(360deg); }\n}\n\n.loader {\n  animation: ___ 1s linear infinite;\n}',['spin'],'animation: spin 1s linear infinite. Name comes first, then duration, timing, iteration.'),
      fill('Make button scale up on hover:','.btn {\n  transition: transform 0.2s ease;\n}\n.btn:hover {\n  transform: ___(1.05);\n}',['scale','scale(1.05)'],'scale(1.05) grows to 105%. Combined with transition = smooth grow effect.'),
      codeq('Make a div spin 360 degrees continuously every 2 seconds.',['@keyframes','rotate','360deg','animation','2s','linear','infinite'],'@keyframes spin { to { transform: rotate(360deg); } }\n.spinner { animation: spin 2s linear infinite; }'),
      identify('What does animation-fill-mode: forwards do?','.box {\n  animation: slideIn 0.5s ease forwards;\n}',[{text:'Keeps element in final animation state after it finishes',correct:true},{text:'Plays animation forward',correct:false},{text:'Loops forward then backward',correct:false},{text:'Delays start',correct:false}],'Without forwards, elements snap back after animating. forwards retains final keyframe.'),
      mcq('What does animation-iteration-count: infinite do?',[{text:'Loops the animation forever',correct:true},{text:'Plays very slowly once',correct:false},{text:'Plays 100 times',correct:false},{text:'Stops animation',correct:false}],'infinite loops continuously. You can also use a number like 3.'),
      codeq('CSS transition: background-color smoothly over 0.4s with ease-in.',['transition','background-color','0.4s','ease-in'],'transition: background-color 0.4s ease-in;'),
      identify('What does this keyframe do?','@keyframes shake {\n  0%, 100% { transform: translateX(0); }\n  25%       { transform: translateX(-10px); }\n  75%       { transform: translateX(10px); }\n}',[{text:'Creates a left-right shake effect',correct:true},{text:'Moves element up and down',correct:false},{text:'Rotates back and forth',correct:false},{text:'Fades in and out',correct:false}],'Centered → left at 25% → right at 75% → back to center. Classic error shake!'),
      fill('Animate only when user has not requested reduced motion:','@media (prefers-_____-motion: no-preference) {\n  .box { animation: spin 2s linear infinite; }\n}',['reduced'],'prefers-reduced-motion is an accessibility media query. Always wrap animations in this.'),
    ]);

  console.log('[DB] Seeded 7 levels, 105 questions.');
}

// ── Answer checking (native) ──────────────────────────────────────────────────
async function _checkAnswerNative(questionId, answer) {
  const q = await _get('SELECT * FROM questions WHERE id=?', [questionId]);
  if (!q) return { correct: false, explanation: 'Not found', correct_answer: '' };
  let correct = false;
  if (q.type === 'mcq' || q.type === 'identify') {
    correct = answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
  } else if (q.type === 'wh' || q.type === 'fill') {
    const accepted = JSON.parse(q.correct_answer);
    const ua = answer.trim().toLowerCase();
    correct = accepted.some(a => ua.includes(a.toLowerCase()) || a.toLowerCase().includes(ua));
  } else if (q.type === 'code') {
    const { keywords } = JSON.parse(q.correct_answer);
    correct = keywords.every(kw => answer.toLowerCase().includes(kw.toLowerCase()));
  }
  return { correct, explanation: q.explanation, correct_answer: q.correct_answer };
}

// ── Public API ────────────────────────────────────────────────────────────────
const DB = {
  async init() {
    if (!IS_NATIVE()) return; // browser: fall back to REST
    const p = P();
    const { result: isConn } = await p.isConnection({ database: DB_NAME, readonly: false });
    if (!isConn) {
      await p.createConnection({ database: DB_NAME, encrypted: false, mode: 'no-encryption', version: 1, readonly: false });
    }
    await p.open({ database: DB_NAME, readonly: false });
    await _createSchema();
    const row = await _get('SELECT COUNT(*) as cnt FROM levels');
    if (!row || !row.cnt) await _seed();
    console.log('[DB] Native SQLite ready.');
  },

  async getLevels(sessionId) {
    if (!IS_NATIVE()) {
      return (await fetch(`/api/levels?session=${encodeURIComponent(sessionId)}`)).json();
    }
    const levels = await _all('SELECT * FROM levels ORDER BY order_num');
    if (!sessionId) return levels.map(l => ({ ...l, completed: false, score: 0, total: 0 }));
    const progress = await _all('SELECT level_id,completed,score,total FROM progress WHERE session_id=?', [sessionId]);
    const map = {};
    progress.forEach(p => (map[p.level_id] = p));
    return levels.map(l => ({ ...l, ...(map[l.id] || { completed: false, score: 0, total: 0 }) }));
  },

  async getQuestions(levelId, count = 12) {
    if (!IS_NATIVE()) {
      return (await fetch(`/api/questions/level/${levelId}?count=${count}`)).json();
    }
    const n = Math.min(15, Math.max(10, count));
    const qs = await _all('SELECT * FROM questions WHERE level_id=? ORDER BY RANDOM() LIMIT ?', [levelId, n]);
    return qs.map(q => ({ ...q, choices: q.choices ? JSON.parse(q.choices) : null, correct_answer: undefined, explanation: undefined }));
  },

  async checkAnswer(questionId, answer) {
    if (!IS_NATIVE()) {
      return (await fetch(`/api/questions/${questionId}/answer`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer })
      })).json();
    }
    return _checkAnswerNative(questionId, answer);
  },

  async startProgress(sessionId, levelId) {
    if (!IS_NATIVE()) {
      return (await fetch('/api/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, level_id: levelId })
      })).json();
    }
    await _run('DELETE FROM progress WHERE session_id=? AND level_id=? AND completed=0', [sessionId, levelId]);
    const r = await _run('INSERT INTO progress (session_id,level_id) VALUES (?,?)', [sessionId, levelId]);
    return { id: r.lastID };
  },

  async updateProgress(id, { score, total, completed }) {
    if (!IS_NATIVE()) {
      await fetch(`/api/progress/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, total, completed })
      });
      return;
    }
    await _run(
      `UPDATE progress SET score=COALESCE(?,score), total=COALESCE(?,total),
       completed=COALESCE(?,completed),
       completed_at=CASE WHEN ?=1 THEN datetime('now') ELSE completed_at END
       WHERE id=?`,
      [score ?? null, total ?? null, completed != null ? (completed ? 1 : 0) : null, completed ? 1 : 0, id]);
  }
};

window.DB = DB;
