const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.subject.groupBy({by:['branchId'], _count:{id:true}}).then(r=>console.log(r)).finally(()=>db.$disconnect());
