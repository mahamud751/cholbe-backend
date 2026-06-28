import {
  PrismaClient,
  UserRole,
  UserStatus,
  VendorApprovalStatus,
  MedicineSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductVariant,
  DoctorProfileStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PHARMACY_PRODUCTS = [
  {
    name: 'Immunity Support',
    genericName: 'Vitamin C + Zinc',
    category: "Women's Care",
    brand: 'HealthPlus',
    unitPrice: 133,
    discountPrice: 120,
    stockQuantity: 320,
    unitType: 'Bottle',
  },
  {
    name: 'Johnson Baby Shampoo',
    genericName: 'Gentle Baby Wash',
    category: 'Baby Products',
    brand: 'Johnson',
    unitPrice: 350,
    discountPrice: 315,
    stockQuantity: 180,
    unitType: 'Bottle',
  },
  {
    name: 'Cetirizine 10 mg',
    genericName: 'Cetirizine Hydrochloride',
    category: 'Tablet',
    brand: 'Square',
    unitPrice: 5,
    discountPrice: 4.5,
    stockQuantity: 1200,
    unitType: 'Stripe',
    prescriptionRequired: false,
  },
  {
    name: 'Napa Extend 500mg',
    genericName: 'Paracetamol',
    category: 'Tablet',
    brand: 'Beximco',
    unitPrice: 12,
    stockQuantity: 800,
    unitType: 'Stripe',
  },
  {
    name: 'Sergel 20mg Capsule',
    genericName: 'Esomeprazole',
    category: 'Capsule',
    brand: 'Healthcare',
    unitPrice: 14,
    discountPrice: 12,
    stockQuantity: 450,
    unitType: 'Stripe',
  },
  {
    name: 'Ace Plus 500mg',
    genericName: 'Paracetamol',
    category: 'Tablet',
    brand: 'Square',
    unitPrice: 6,
    stockQuantity: 900,
    unitType: 'PC',
  },
  {
    name: 'Dove Body Wash',
    genericName: 'Moisturizing Wash',
    category: 'Body Care',
    brand: 'Dove',
    unitPrice: 420,
    discountPrice: 378,
    stockQuantity: 95,
    unitType: 'Bottle',
  },
  {
    name: 'Comfort Sanitary Pads',
    genericName: 'Ultra Thin Pads',
    category: "Women's Care",
    brand: 'Comfort',
    unitPrice: 180,
    stockQuantity: 220,
    unitType: 'Box',
  },
  {
    name: 'Oral-B Mouthwash',
    genericName: 'Antiseptic Rinse',
    category: 'Body Care',
    brand: 'Oral-B',
    unitPrice: 290,
    discountPrice: 261,
    stockQuantity: 140,
    unitType: 'Bottle',
  },
  {
    name: 'Baby Diaper Rash Cream',
    genericName: 'Zinc Oxide Cream',
    category: 'Baby Products',
    brand: 'Himalaya',
    unitPrice: 220,
    stockQuantity: 160,
    unitType: 'Tube',
  },
  {
    name: 'Thyrox 50mg Tablet',
    genericName: 'Levothyroxine',
    category: 'Tablet',
    brand: 'GSK',
    unitPrice: 10,
    stockQuantity: 500,
    unitType: 'Stripe',
  },
  {
    name: 'Aamdocal Plus 50',
    genericName: 'Amlodipine',
    category: 'Tablet',
    brand: 'Square',
    unitPrice: 250,
    discountPrice: 220,
    stockQuantity: 2450,
    unitType: 'Box',
    prescriptionRequired: true,
    linkMedicine: true,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@cholbe.com' },
    update: {},
    create: {
      email: 'admin@cholbe.com',
      fullName: 'Super Administrator',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'rayhan@gmail.com' },
    update: { fullName: 'Rahman Uddin' },
    create: {
      email: 'rayhan@gmail.com',
      phone: '01677589448',
      fullName: 'Rahman Uddin',
      passwordHash,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      patientProfile: { create: { age: 28, gender: 'Male' } },
      cart: { create: {} },
    },
  });

  await prisma.cart.upsert({
    where: { userId: customer.id },
    update: {},
    create: { userId: customer.id },
  });

  const vendorUser = await prisma.user.upsert({
    where: { email: 'vendor@cholbe.com' },
    update: {},
    create: {
      email: 'vendor@cholbe.com',
      fullName: 'Uttara Pharmacy',
      passwordHash,
      role: UserRole.VENDOR,
      status: UserStatus.ACTIVE,
      vendorProfile: {
        create: {
          pharmacyName: 'Uttara Pharmacy',
          phone: '01700000000',
          address: 'Uttara Sector 12, Dhaka',
          approvalStatus: VendorApprovalStatus.APPROVED,
          isStoreOpen: true,
        },
      },
    },
  });

  const specialtySeed = [
    { name: 'Physician', slug: 'physician', icon: 'stethoscope' },
    { name: 'Pediatric', slug: 'pediatric', icon: 'baby' },
    { name: 'Gynae & obs', slug: 'gynae-obs', icon: 'female' },
    { name: 'Dermatology', slug: 'dermatology', icon: 'skin' },
    { name: 'Endocrinology', slug: 'endocrinology', icon: 'activity' },
    { name: 'Cardiology', slug: 'cardiology', icon: 'heart' },
    { name: 'General Physician', slug: 'general-physician', icon: 'user-md' },
  ];
  const specialties: Record<string, string> = {};
  for (const s of specialtySeed) {
    const row = await prisma.specialty.upsert({
      where: { slug: s.slug },
      update: { name: s.name, icon: s.icon, isActive: true },
      create: { ...s, isActive: true },
    });
    specialties[s.slug] = row.id;
  }

  const defaultWeekly = [1, 2, 3, 4, 5].map(dayOfWeek => ({
    dayOfWeek,
    startTime: '09:00',
    endTime: '17:00',
    slotMinutes: 30,
    isActive: true,
  }));

  async function ensureDoctorAvailability(doctorId: string) {
    for (const slot of defaultWeekly) {
      await prisma.doctorWeeklyAvailability.upsert({
        where: { doctorId_dayOfWeek: { doctorId, dayOfWeek: slot.dayOfWeek } },
        update: slot,
        create: { doctorId, ...slot },
      });
    }
  }

  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@cholbe.com' },
    update: { fullName: 'Dr. Sarah Ahmed' },
    create: {
      email: 'doctor@cholbe.com',
      fullName: 'Dr. Sarah Ahmed',
      passwordHash,
      role: UserRole.DOCTOR,
      status: UserStatus.ACTIVE,
      doctorProfile: {
        create: {
          specialty: 'Cardiology',
          specialtyId: specialties.cardiology,
          degree: 'MBBS, FCPS',
          fee: 500,
          categories: ['Heart', 'General'],
          isOnline: true,
          status: DoctorProfileStatus.ACTIVE,
        },
      },
    },
    include: { doctorProfile: true },
  });
  if (doctorUser.doctorProfile) {
    await prisma.doctorProfile.update({
      where: { id: doctorUser.doctorProfile.id },
      data: { status: DoctorProfileStatus.ACTIVE, specialtyId: specialties.cardiology },
    });
    await ensureDoctorAvailability(doctorUser.doctorProfile.id);
  }

  let doctorMedicine = await prisma.medicine.findFirst({
    where: { name: 'Aamdocal Plus 50', source: MedicineSource.DOCTOR },
  });
  if (!doctorMedicine) {
    doctorMedicine = await prisma.medicine.create({
      data: {
        name: 'Aamdocal Plus 50',
        genericName: 'Amlodipine',
        category: 'Tablet',
        medicineType: 'Tablet',
        prescriptionRequired: true,
        source: MedicineSource.DOCTOR,
        createdByUserId: doctorUser.id,
      },
    });
  }

  const vendor = await prisma.vendorProfile.findUnique({ where: { userId: vendorUser.id } });
  if (vendor) {
    await prisma.vendorProduct.deleteMany({ where: { vendorId: vendor.id } });

    for (const item of PHARMACY_PRODUCTS) {
      const { linkMedicine, prescriptionRequired, ...product } = item;
      await prisma.vendorProduct.create({
        data: {
          vendorId: vendor.id,
          ownerUserId: vendorUser.id,
          medicineId: linkMedicine ? doctorMedicine.id : undefined,
          name: product.name,
          genericName: product.genericName,
          category: product.category,
          brand: product.brand,
          unitPrice: product.unitPrice,
          discountPrice: product.discountPrice ?? null,
          stockQuantity: product.stockQuantity,
          minAlertLevel: 20,
          unitType: product.unitType,
          
          prescriptionRequired: prescriptionRequired ?? false,
          isActive: true,
        },
      });
    }
  }

  const existingAddress = await prisma.address.findFirst({
    where: { userId: customer.id, isDefault: true },
  });
  if (!existingAddress) {
    await prisma.address.create({
      data: {
        userId: customer.id,
        label: 'Home',
        region: 'Uttara Sector 12',
        formattedAddress: 'House 12, Road 5, Uttara, Dhaka',
        latitude: 23.8759,
        longitude: 90.3795,
        isDefault: true,
      },
    });
  }

  const patientProfile = await prisma.patientProfile.upsert({
    where: { userId: customer.id },
    update: {
      age: 32,
      gender: 'Male',
      bloodGroup: 'O-',
      conditions: ['Hypertension', 'Diabetes', 'Arthritis'],
    },
    create: {
      userId: customer.id,
      age: 32,
      gender: 'Male',
      bloodGroup: 'O-',
      conditions: ['Hypertension', 'Diabetes', 'Arthritis'],
    },
  });

  await prisma.familyMember.deleteMany({ where: { patientId: patientProfile.id } });
  await prisma.familyMember.createMany({
    data: [
      { patientId: patientProfile.id, name: 'Mehidi Hasan', relationship: 'Son', age: 12, gender: 'Male' },
      { patientId: patientProfile.id, name: 'Rohima Akter', relationship: 'Daughter', age: 8, gender: 'Female' },
    ],
  });

  await prisma.emergencyContact.deleteMany({ where: { patientId: patientProfile.id } });
  await prisma.emergencyContact.createMany({
    data: [
      { patientId: patientProfile.id, name: 'Mehidi', relation: 'Brother', phone: '01677589448' },
      { patientId: patientProfile.id, name: 'Rohima', relation: 'Sister', phone: '01677589449' },
    ],
  });

  await prisma.medicationSchedule.deleteMany({ where: { patientId: customer.id } });
  await prisma.medicationSchedule.create({
    data: {
      patientId: customer.id,
      medicineName: 'Amlodipine 5mg',
      dose: '5mg',
      instruction: 'Take with water after meal',
      mealTiming: 'After meal',
      times: ['08:00 AM', '02:00 PM', '08:00 PM'],
    },
  });

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  await prisma.healthVital.deleteMany({ where: { patientId: customer.id } });
  await prisma.healthVital.createMany({
    data: [
      { patientId: customer.id, vitalType: 'blood_pressure', value: '130/85', recordedAt: twoDaysAgo },
      { patientId: customer.id, vitalType: 'oxygen', value: '97%', recordedAt: new Date() },
    ],
  });

  await prisma.notification.deleteMany({ where: { userId: customer.id } });
  await prisma.notification.createMany({
    data: [
      {
        userId: customer.id,
        category: 'medication',
        title: 'Medication Reminder',
        body: 'Time to take Amlodipine 5mg',
        isRead: false,
      },
      {
        userId: customer.id,
        category: 'order',
        title: 'Order Update',
        body: 'Your pharmacy order is being prepared',
        isRead: false,
      },
      {
        userId: customer.id,
        category: 'appointment',
        title: 'Upcoming Consultation',
        body: 'Video call with Dr. Ahmed in 10 minutes',
        isRead: true,
      },
      {
        userId: customer.id,
        category: 'alert',
        title: 'Missed Dose Alert',
        body: "It looks like you missed your Amlodipine 5mg dose this morning. Please don't forget to take your medications!",
        isRead: false,
      },
      {
        userId: customer.id,
        category: 'alert',
        title: 'Missed Dose Alert',
        body: "Reminder: take your evening Amlodipine dose on schedule.",
        isRead: false,
      },
    ],
  });

  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@cholbe.com' } });
  if (adminUser) {
    const adminMedicines = [
      { name: 'Napa Extend 500mg', genericName: 'Paracetamol', category: 'Tablet', brand: 'Beximco' },
      { name: 'Sergel 20mg', genericName: 'Esomeprazole', category: 'Capsule', brand: 'Healthcare' },
      { name: 'Cetirizine 10mg', genericName: 'Cetirizine', category: 'Tablet', brand: 'Square' },
    ];
    for (const m of adminMedicines) {
      const exists = await prisma.medicine.findFirst({ where: { name: m.name } });
      if (!exists) {
        await prisma.medicine.create({
          data: {
            ...m,
            source: MedicineSource.ADMIN,
            createdByUserId: adminUser.id,
            status: 'ACTIVE',
          },
        });
      }
    }
  }

  if (vendor) {
    const amlodipineProduct = await prisma.vendorProduct.findFirst({
      where: { vendorId: vendor.id, name: 'Aamdocal Plus 50' },
    });
    const customerAddress = await prisma.address.findFirst({ where: { userId: customer.id } });

    await prisma.order.deleteMany({ where: { customerId: customer.id } });

    const orderStatuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERED', 'DELIVERED'];
    for (let i = 0; i < orderStatuses.length; i++) {
      const status = orderStatuses[i];
      const orderNumber = `CHB-${10001 + i}`;
      const subtotal = 220;
      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          vendorId: vendor.id,
          addressId: customerAddress?.id,
          addressSnapshot: customerAddress
            ? { formattedAddress: customerAddress.formattedAddress, region: customerAddress.region }
            : undefined,
          status,
          paymentMethod: i % 2 === 0 ? PaymentMethod.COD : PaymentMethod.BKASH,
          paymentStatus: status === 'DELIVERED' ? PaymentStatus.PAID : PaymentStatus.PENDING,
          subtotal,
          deliveryCharge: 60,
          total: subtotal + 60,
          items: {
            create: {
              vendorProductId: amlodipineProduct?.id,
              name: amlodipineProduct?.name ?? 'Aamdocal Plus 50',
              variant: ProductVariant.BOX,
              quantity: 1,
              unitPrice: subtotal,
              lineTotal: subtotal,
            },
          },
          statusEvents: { create: { status, note: 'Seed order' } },
        },
      });
      if (status === 'DELIVERED') {
        await prisma.paymentTransaction.create({
          data: {
            orderId: order.id,
            method: PaymentMethod.BKASH,
            amount: order.total,
            status: PaymentStatus.PAID,
            gatewayRef: `mock_${orderNumber}`,
          },
        });
      }
    }
  }

  const extraDoctors = [
    { email: 'dr.ahmed@cholbe.com', fullName: 'Dr. Ahmed', specialty: 'Cardiologist', specialtySlug: 'cardiology', fee: 800, categories: ['Heart'] },
    { email: 'dr.alex@cholbe.com', fullName: 'Dr. Alex Same', specialty: 'General Physician', specialtySlug: 'general-physician', fee: 500, categories: ['General'] },
    { email: 'dr.fatima@cholbe.com', fullName: 'Dr. Fatima Khan', specialty: 'Pediatrics', specialtySlug: 'pediatric', fee: 600, categories: ['Child'] },
  ];

  const doctorProfiles = [];
  for (const d of extraDoctors) {
    const docUser = await prisma.user.upsert({
      where: { email: d.email },
      update: { fullName: d.fullName },
      create: {
        email: d.email,
        fullName: d.fullName,
        passwordHash,
        role: UserRole.DOCTOR,
        status: UserStatus.ACTIVE,
        doctorProfile: {
          create: {
            specialty: d.specialty,
            specialtyId: specialties[d.specialtySlug],
            degree: 'MBBS',
            fee: d.fee,
            categories: d.categories,
            isOnline: true,
            status: DoctorProfileStatus.ACTIVE,
            imageUrl: null,
          },
        },
      },
      include: { doctorProfile: true },
    });
    if (docUser.doctorProfile) {
      doctorProfiles.push(docUser.doctorProfile);
      await ensureDoctorAvailability(docUser.doctorProfile.id);
    }
  }

  const primaryDoctor = await prisma.doctorProfile.findUnique({ where: { userId: doctorUser.id } });
  if (primaryDoctor) doctorProfiles.push(primaryDoctor);

  const assignedDoctor = doctorProfiles.find(d => d.specialty === 'Cardiologist') ?? doctorProfiles[0];
  if (assignedDoctor) {
    const soon = new Date();
    soon.setMinutes(soon.getMinutes() + 10);
    await prisma.appointment.deleteMany({ where: { patientId: customer.id } });
    await prisma.appointment.create({
      data: {
        patientId: customer.id,
        doctorId: assignedDoctor.id,
        scheduledDate: soon,
        timeSlot: '10:30 AM',
        durationMin: 15,
        fee: assignedDoctor.fee,
        status: 'scheduled',
        consultationType: 'VIDEO',
        agoraChannel: 'cholbe_seed_consult_01',
        paymentMethod: 'BKASH',
      },
    });
  }

  console.log('Seed complete:');
  console.log('  Admin:    admin@cholbe.com / Password123!');
  console.log('  Customer: rayhan@gmail.com / Password123!');
  console.log('  Vendor:   vendor@cholbe.com / Password123!');
  console.log('  Doctor:   doctor@cholbe.com / Password123!');
  console.log(`  Pharmacy products: ${PHARMACY_PRODUCTS.length}`);
  console.log(`  Doctors seeded: ${doctorProfiles.length + 1}`);
  console.log(`  Specialties seeded: ${Object.keys(specialties).length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
