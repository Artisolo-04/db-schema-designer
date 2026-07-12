import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);

// GET /api/projects - list all projects for the logged-in user
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, created_at, updated_at
       FROM projects
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id]
    );
    res.json({ projects: result.rows });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Failed to load projects' });
  }
});

// POST /api/projects - create a new project (also creates empty project_data row)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    await client.query('BEGIN');

    const projectResult = await client.query(
      `INSERT INTO projects (user_id, name) VALUES ($1, $2)
       RETURNING id, name, created_at, updated_at`,
      [req.user.id, name.trim()]
    );
    const project = projectResult.rows[0];

    await client.query(
      `INSERT INTO project_data (project_id, diagram_json) VALUES ($1, $2)`,
      [project.id, JSON.stringify({ tables: [], edges: [] })]
    );

    await client.query('COMMIT');

    res.status(201).json({ project });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  } finally {
    client.release();
  }
});

// Helper: verify project belongs to req.user, returns project row or null
async function findOwnedProject(projectId, userId) {
  const result = await pool.query(
    'SELECT id, name, created_at, updated_at FROM projects WHERE id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return result.rows[0] || null;
}

// PATCH /api/projects/:id - rename a project
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const existing = await findOwnedProject(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const result = await pool.query(
      `UPDATE projects SET name = $1 WHERE id = $2 AND user_id = $3
       RETURNING id, name, created_at, updated_at`,
      [name.trim(), id, req.user.id]
    );

    res.json({ project: result.rows[0] });
  } catch (err) {
    console.error('Rename project error:', err);
    res.status(500).json({ error: 'Failed to rename project' });
  }
});

// DELETE /api/projects/:id - delete a project (cascades to project_data)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await findOwnedProject(id, req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [id, req.user.id]);

    res.status(204).send();
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// GET /api/projects/:id/data - fetch the diagram JSON for a project
router.get('/:id/data', async (req, res) => {
  try {
    const { id } = req.params;

    const project = await findOwnedProject(id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const result = await pool.query(
      'SELECT diagram_json FROM project_data WHERE project_id = $1',
      [id]
    );

    const diagram_json = result.rows[0]?.diagram_json ?? { tables: [], edges: [] };

    res.json({ diagram_json });
  } catch (err) {
    console.error('Get project data error:', err);
    res.status(500).json({ error: 'Failed to load project data' });
  }
});

// PUT /api/projects/:id/data - save (upsert) the diagram JSON for a project
router.put('/:id/data', async (req, res) => {
  try {
    const { id } = req.params;
    const { diagram_json } = req.body;

    if (diagram_json === undefined) {
      return res.status(400).json({ error: 'diagram_json is required' });
    }

    const project = await findOwnedProject(id, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await pool.query(
      `INSERT INTO project_data (project_id, diagram_json)
       VALUES ($1, $2)
       ON CONFLICT (project_id) DO UPDATE SET diagram_json = EXCLUDED.diagram_json`,
      [id, JSON.stringify(diagram_json)]
    );

    // Touch the parent project's updated_at
    await pool.query('UPDATE projects SET updated_at = now() WHERE id = $1', [id]);

    res.json({ status: 'saved' });
  } catch (err) {
    console.error('Save project data error:', err);
    res.status(500).json({ error: 'Failed to save project data' });
  }
});

export default router;
