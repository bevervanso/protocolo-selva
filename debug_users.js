import db from './server/config/database.js';
const users = db.prepare('SELECT id, name, email, role FROM users').all();
console.log('--- DATABASE USERS ---');
users.forEach(u => {
    console.log(`${u.id}: ${u.name} (${u.email}) [${u.role}]`);
});
console.log('----------------------');
process.exit(0);
