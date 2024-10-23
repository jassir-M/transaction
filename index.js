const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const db = new sqlite3.Database('./Database.db'); 

app.use(bodyParser.json());

// Database setup

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('income', 'expense')) NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
        category INTEGER,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY (category) REFERENCES categories(id)
    )`);
});


// POST /transactions
app.post('/transactions', (req, res) => {
    const { type, category, amount, date, description } = req.body;
    db.run(`INSERT INTO transactions (type, category, amount, date, description) VALUES (?, ?, ?, ?, ?)`,
        [type, category, amount, date, description],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.status(201).json({ id: this.lastID, type, category, amount, date, description });
        });
});

// GET /transactions
app.get('/transactions', (req, res) => {
    db.all(`SELECT * FROM transactions`, [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        res.json(rows);
    });
});

// GET /transactions/:id
app.get('/transactions/:id', (req, res) => {
    const { id } = req.params;
    db.get(`SELECT * FROM transactions WHERE id = ?`, [id], (err, row) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Transaction not found' });
        res.json(row);
    });
});

// PUT /transactions/:id
app.put('/transactions/:id', (req, res) => {
    const { id } = req.params;
    const { type, category, amount, date, description } = req.body;
    db.run(`UPDATE transactions SET type = ?, category = ?, amount = ?, date = ?, description = ? WHERE id = ?`,
        [type, category, amount, date, description, id],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            if (this.changes === 0) return res.status(404).json({ error: 'Transaction not found' });
            res.json({ id, type, category, amount, date, description });
        });
});

// DELETE /transactions/:id
app.delete('/transactions/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM transactions WHERE id = ?`, [id], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Transaction not found' });
        res.status(204).send();
    });
});

// GET /summary
// GET /summary
app.get('/summary', (req, res) => {
    db.all(`SELECT type, SUM(amount) AS total FROM transactions GROUP BY type`, [], (err, rows) => {
        if (err) return res.status(400).json({ error: err.message });
        
        const summary = rows.reduce((acc, row) => {
            acc[row.type] = row.total;
            return acc;
        }, { totalIncome: 0, totalExpenses: 0 });

        summary.balance = (summary.totalIncome || 0) - (summary.totalExpenses || 0);
        res.json(summary);
    });
});


// Error handling
app.use((err, req, res, next) => {
    res.status(400).json({ error: err.message });
});

// Start the server
const PORT =  3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
