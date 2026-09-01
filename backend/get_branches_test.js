const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const db = new PrismaClient();
db.branch.findMany().then(r => fs.writeFileSync('out_utf8.json', JSON.stringify(r))).finally(() => db.$disconnect());
