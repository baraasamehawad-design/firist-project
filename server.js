const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDB } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/levels', require('./routes/levels'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/progress', require('./routes/progress'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB();
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
