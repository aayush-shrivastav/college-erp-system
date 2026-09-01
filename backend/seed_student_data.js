const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedData() {
  console.log('Seeding student data...');

  // 1. Create Mock Facilities
  console.log('Ensuring facilities exist...');
  
  // Hostel Rooms
  const hostelRooms = [];
  for (const type of ['Standard Non-AC', 'Standard AC', 'Premium AC']) {
    let room = await prisma.hostelRoom.findFirst({ where: { roomType: type } });
    if (!room) {
      room = await prisma.hostelRoom.create({
        data: {
          roomType: type,
          feeAmount: type.includes('Premium') ? 45000 : type.includes('AC') ? 35000 : 25000,
          capacity: 3,
        }
      });
    }
    hostelRooms.push(room);
  }

  // Bus Routes
  const busRoutes = [];
  for (const route of ['Route A - City Center', 'Route B - North Campus', 'Route C - Suburbs']) {
    let bus = await prisma.busRoute.findFirst({ where: { routeName: route } });
    if (!bus) {
      bus = await prisma.busRoute.create({
        data: {
          routeName: route,
          feeAmount: route.includes('City') ? 15000 : 20000,
          stops: 'Stop 1, Stop 2, Stop 3',
        }
      });
    }
    busRoutes.push(bus);
  }

  // Mess Plans
  const messPlans = [];
  for (const plan of ['Veg Standard', 'Non-Veg Premium']) {
    let mess = await prisma.messPlan.findFirst({ where: { planName: plan } });
    if (!mess) {
      mess = await prisma.messPlan.create({
        data: {
          planName: plan,
          feeAmount: plan.includes('Premium') ? 30000 : 22000,
          description: plan,
        }
      });
    }
    messPlans.push(mess);
  }

  // Categories
  const categories = ['GENERAL', 'SC_ST', 'OBC', 'DRCC'];

  // Address randomizer
  const generateAddress = () => `Plot ${Math.floor(Math.random() * 100)}, Phase ${Math.floor(Math.random() * 5)}, Industrial Area, New Delhi`;

  // 2. Fetch all active students
  const students = await prisma.student.findMany({
    where: { user: { isDeleted: false } }
  });

  console.log(`Found ${students.length} students. Populating profiles...`);

  // Target 70% to be "profileLocked"
  const targetLockedCount = Math.floor(students.length * 0.7);
  let lockedCount = 0;

  for (let s of students) {
    const isLocked = lockedCount < targetLockedCount;
    if (isLocked) lockedCount++;

    // Random dummy data
    const phone = '98' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    const fatherPhone = '99' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    const motherPhone = '97' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    
    const tenthPercent = (60 + Math.random() * 35).toFixed(2);
    const twelfthPercent = (60 + Math.random() * 35).toFixed(2);
    
    // Random boolean flags
    const isHosteller = Math.random() > 0.6;
    const usesBus = !isHosteller && Math.random() > 0.5; // if hostel, usually no bus
    const usesMess = isHosteller || Math.random() > 0.7; // hostellers always use mess? let's randomize
    
    let hostelRoomId = null, busRouteId = null, messPlanId = null;
    if (isHosteller) hostelRoomId = hostelRooms[Math.floor(Math.random() * hostelRooms.length)].id;
    if (usesBus) busRouteId = busRoutes[Math.floor(Math.random() * busRoutes.length)].id;
    if (usesMess) messPlanId = messPlans[Math.floor(Math.random() * messPlans.length)].id;

    // Category
    const category = categories[Math.floor(Math.random() * categories.length)];

    // Update Student Profile
    await prisma.student.update({
      where: { id: s.id },
      data: {
        phone,
        address: generateAddress(),
        fatherName: 'Mr. ' + s.name.split(' ')[0] + ' Father',
        fatherPhone,
        motherName: 'Mrs. ' + s.name.split(' ')[0] + ' Mother',
        motherPhone,
        tenthPercent,
        twelfthPercent,
        profileLocked: isLocked, // 70% aproved / locked
        isHostel: isHosteller,
        usesBus: usesBus
      }
    });

    // Handle Fee Profile
    let feeProfile = await prisma.studentFeeProfile.findUnique({
      where: { studentId: s.id }
    });

    if (!feeProfile) {
      feeProfile = await prisma.studentFeeProfile.create({
        data: {
          studentId: s.id,
          category,
          isHosteller,
          hostelRoomId,
          usesBus,
          busRouteId,
          usesMess,
          messPlanId
        }
      });
    } else {
      feeProfile = await prisma.studentFeeProfile.update({
        where: { id: feeProfile.id },
        data: {
          category,
          isHosteller,
          hostelRoomId,
          usesBus,
          busRouteId,
          usesMess,
          messPlanId
        }
      });
    }

    // Create a ledger for current sem if not exists
    const currentSem = s.currentSem || 1;
    let ledger = await prisma.studentLedger.findUnique({
      where: {
        studentFeeProfileId_semester: {
          studentFeeProfileId: feeProfile.id,
          semester: currentSem
        }
      }
    });

    let baseFee = 50000;
    let hostelFee = feeProfile.hostelRoomId ? hostelRooms.find(r => r.id === feeProfile.hostelRoomId).feeAmount : 0;
    let busFee = feeProfile.busRouteId ? busRoutes.find(r => r.id === feeProfile.busRouteId).feeAmount : 0;
    let messFee = feeProfile.messPlanId ? messPlans.find(r => r.id === feeProfile.messPlanId).feeAmount : 0;

    let totalPaidRandom = Math.floor(Math.random() * 40000); // randomize paid amount

    let totalDue = parseFloat(baseFee) + parseFloat(hostelFee) + parseFloat(busFee) + parseFloat(messFee);
    let netDue = totalDue - totalPaidRandom;

    if (!ledger) {
      await prisma.studentLedger.create({
        data: {
          studentFeeProfileId: feeProfile.id,
          semester: currentSem,
          baseFeeDue: baseFee,
          hostelFeeDue: hostelFee,
          busFeeDue: busFee,
          messFeeDue: messFee,
          totalPaid: totalPaidRandom,
          netDue: netDue
        }
      });
    } else {
      await prisma.studentLedger.update({
        where: { id: ledger.id },
        data: {
          baseFeeDue: baseFee,
          hostelFeeDue: hostelFee,
          busFeeDue: busFee,
          messFeeDue: messFee,
          totalPaid: totalPaidRandom,
          netDue: netDue
        }
      });
    }
  }

  console.log(`Successfully configured fee profiles and locked 70% profiles (${lockedCount} students) with dummy data!`);
}

seedData().catch(console.error).finally(() => prisma.$disconnect());
