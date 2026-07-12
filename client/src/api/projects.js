import { api } from './client.js';

export async function listProjects() {
  const res = await api.get('/projects');
  return res.data.projects;
}

export async function createProject(name) {
  const res = await api.post('/projects', { name });
  return res.data.project;
}

export async function renameProject(id, name) {
  const res = await api.patch(`/projects/${id}`, { name });
  return res.data.project;
}

export async function deleteProject(id) {
  await api.delete(`/projects/${id}`);
}

export async function fetchProjectData(id) {
  const res = await api.get(`/projects/${id}/data`);
  return res.data.diagram_json;
}

export async function saveProjectData(id, diagramJson) {
  const res = await api.put(`/projects/${id}/data`, { diagram_json: diagramJson });
  return res.data;
}
