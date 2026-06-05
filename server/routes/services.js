const express = require('express');
const router = express.Router();
const db = require('../db');

// GET semua sesi ibadah
router.get('/', (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM services ORDER BY date DESC, created_at DESC').all();
    const parsed = services.map(s => ({
      ...s,
      items: JSON.parse(s.items || '[]'),
    }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET satu sesi ibadah by ID
router.get('/:id', (req, res) => {
  try {
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    if (!service) return res.status(404).json({ success: false, error: 'Sesi tidak ditemukan' });

    res.json({
      success: true,
      data: { ...service, items: JSON.parse(service.items || '[]') }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST buat sesi baru
router.post('/', (req, res) => {
  try {
    const { name, date, items, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Nama sesi wajib diisi' });

    const result = db.prepare(`
      INSERT INTO services (name, date, items, notes)
      VALUES (@name, @date, @items, @notes)
    `).run({
      name,
      date: date || new Date().toISOString().split('T')[0],
      items: JSON.stringify(items || []),
      notes: notes || '',
    });

    const newService = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      success: true,
      data: { ...newService, items: JSON.parse(newService.items) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update sesi
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM services WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Sesi tidak ditemukan' });

    const { name, date, items, notes } = req.body;

    db.prepare(`
      UPDATE services SET
        name = COALESCE(@name, name),
        date = COALESCE(@date, date),
        items = COALESCE(@items, items),
        notes = COALESCE(@notes, notes)
      WHERE id = @id
    `).run({
      id: req.params.id,
      name: name || null,
      date: date || null,
      items: items !== undefined ? JSON.stringify(items) : null,
      notes: notes !== undefined ? notes : null,
    });

    const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
    res.json({
      success: true,
      data: { ...updated, items: JSON.parse(updated.items) }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE hapus sesi
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM services WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Sesi tidak ditemukan' });

    db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Sesi berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
