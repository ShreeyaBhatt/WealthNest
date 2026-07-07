require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("./src/config/db");
const User = require("./src/models/User");
const Family = require("./src/models/Family");
const Member = require("./src/models/Member");
const Investment = require("./src/models/Investment");
const Transaction = require("./src/models/Transaction");
const Insight = require("./src/models/Insight");
const Statement = require("./src/models/Statement");
const { recalculateInvestment } = require("./src/utils/portfolio");

const email = "amit.patel@wealthnest.demo";
const password = "PatelDemo@123";

function monthDate(start, offset) {
  const d = new Date(start);
  d.setMonth(d.getMonth() + offset);
  return d;
}

async function clearExisting(userId) {
  const families = await Family.find({ admin: userId });
  const familyIds = families.map((f) => f._id);
  const investments = await Investment.find({ familyId: { $in: familyIds } });
  await Transaction.deleteMany({ investmentId: { $in: investments.map((i) => i._id) } });
  await Investment.deleteMany({ familyId: { $in: familyIds } });
  await Member.deleteMany({ familyId: { $in: familyIds } });
  await Statement.deleteMany({ familyId: { $in: familyIds } });
  await Insight.deleteMany({ familyId: { $in: familyIds } });
  await Family.deleteMany({ admin: userId });
}

async function createSip({ familyId, memberId, name, type = "MF", count, monthlySip, unitsPerBuy, lastPrice, category, goalAmount, start }) {
  const investment = await Investment.create({
    familyId,
    memberId,
    name,
    type,
    monthlySip,
    sipCategory: category,
    goalAmount
  });
  for (let i = 0; i < count; i += 1) {
    await Transaction.create({
      investmentId: investment._id,
      type: "BUY",
      date: monthDate(start, i),
      amount: monthlySip,
      units: unitsPerBuy,
      price: i === count - 1 ? lastPrice : 100
    });
  }
  return recalculateInvestment(investment._id);
}

async function createSingle({ familyId, memberId, name, type, amount, units, price, date, sipCategory = "", goalAmount = 0 }) {
  const investment = await Investment.create({
    familyId,
    memberId,
    name,
    type,
    monthlySip: 0,
    sipCategory,
    goalAmount
  });
  await Transaction.create({
    investmentId: investment._id,
    type: type === "FD" || type === "PPF" ? "DEPOSIT" : "BUY",
    date,
    amount,
    units,
    price
  });
  return recalculateInvestment(investment._id);
}

async function seed() {
  await connectDB();

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: "Amit Patel",
      email,
      mobile: "9876543210",
      passwordHash: await bcrypt.hash(password, 12)
    });
  }
  await clearExisting(user._id);

  const family = await Family.create({
    name: "Patel Family",
    admin: user._id,
    city: "Ahmedabad",
    description: "Stage 1 demo portfolio for WealthNest FSD-2 + FCSP-2 showcase"
  });

  const members = await Member.create([
    { familyId: family._id, name: "Amit Patel", relationship: "Self", dob: "1982-04-12" },
    { familyId: family._id, name: "Pooja Patel", relationship: "Spouse", dob: "1985-09-19" },
    { familyId: family._id, name: "Rohan Patel", relationship: "Son", dob: "2012-06-08" },
    { familyId: family._id, name: "Sneha Patel", relationship: "Daughter", dob: "2016-02-14" }
  ]);
  family.members = members.map((m) => m._id);
  await family.save();

  const [amit, pooja, rohan] = members;

  await createSip({
    familyId: family._id,
    memberId: amit._id,
    name: "HDFC Nifty 50",
    count: 27,
    monthlySip: 10000,
    unitsPerBuy: 100,
    lastPrice: 120,
    category: "nifty50",
    goalAmount: 2500000,
    start: "2022-01-10"
  });

  await createSip({
    familyId: family._id,
    memberId: pooja._id,
    name: "ICICI Bluechip",
    count: 18,
    monthlySip: 8000,
    unitsPerBuy: 80,
    lastPrice: 145.833333,
    category: "largecap",
    goalAmount: 1600000,
    start: "2022-10-10"
  });

  await createSip({
    familyId: family._id,
    memberId: rohan._id,
    name: "Mirae ELSS for Rohan",
    type: "ELSS",
    count: 6,
    monthlySip: 5000,
    unitsPerBuy: 50,
    lastPrice: 143.166667,
    category: "elss",
    goalAmount: 800000,
    start: "2023-10-10"
  });

  await createSingle({
    familyId: family._id,
    memberId: amit._id,
    name: "Reliance Industries",
    type: "Stock",
    amount: 122500,
    units: 50,
    price: 2450,
    date: "2023-05-05"
  });

  await createSingle({
    familyId: family._id,
    memberId: rohan._id,
    name: "TCS for Rohan",
    type: "Stock",
    amount: 19000,
    units: 5,
    price: 3800,
    date: "2023-08-15"
  });

  await createSingle({
    familyId: family._id,
    memberId: pooja._id,
    name: "SBI FD",
    type: "FD",
    amount: 200000,
    units: 200000,
    price: 1,
    date: "2023-01-01",
    sipCategory: "debt"
  });

  await createSingle({
    familyId: family._id,
    memberId: amit._id,
    name: "Amit PPF",
    type: "PPF",
    amount: 172000,
    units: 172000,
    price: 1,
    date: "2023-04-01",
    sipCategory: "debt"
  });

  await createSingle({
    familyId: family._id,
    memberId: pooja._id,
    name: "Pooja PPF",
    type: "PPF",
    amount: 112000,
    units: 112000,
    price: 1,
    date: "2023-04-01",
    sipCategory: "debt"
  });

  const total = (await Investment.find({ familyId: family._id })).reduce((sum, inv) => sum + inv.currentValue, 0);
  console.log("Patel Family seeded");
  console.log(`Login: ${email} / ${password}`);
  console.log(`Stage 1 dashboard total: Rs ${total.toLocaleString("en-IN")}`);
  await process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
