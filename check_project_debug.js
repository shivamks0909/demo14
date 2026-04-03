// Check project configuration
const { getUnifiedDb } = require('./lib/unified-db');

async function checkProject() {
  const { database: db } = await getUnifiedDb();

  const { data: projects } = await db
    .from('projects')
    .select('id, project_code, project_name, base_url, status')
    .eq('project_code', 'test23')
    .maybeSingle();

  console.log('Project test23:', projects);

  if (projects) {
    console.log('\nBase URL analysis:');
    console.log('  base_url:', projects.base_url);
    try {
      const url = new URL(projects.base_url);
      console.log('  Is status page?', url.pathname.includes('/status'));
      console.log('  Pathname:', url.pathname);
      console.log('  Search params:', url.search);
    } catch (e) {
      console.log('  Invalid URL');
    }
  }
}

checkProject().catch(console.error);
