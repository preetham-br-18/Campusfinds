export const APP_NAME = "CampusFind";
export const APP_TAGLINE = "Lost it? Find it. Found it? Return it.";
export const APP_DEVELOPER = "Preetham B R";

export const CAMPUS_DEPARTMENTS = [
  "CSE",
  "CSE(AIML)",
  "CSE(DS)",
  "ECE",
  "ISE",
  "CIVIL",
  "CYBER SECURITY",
  "MECHANICAL"
];

export const DEFAULT_CATEGORIES = [
  "Electronics",
  "Mobile Phones",
  "Earphones",
  "Wallet",
  "Keys",
  "ID Card",
  "Documents",
  "Books",
  "Bag",
  "Clothing",
  "Jewellery",
  "Accessories",
  "Water Bottle",
  "Laptop",
  "Charger",
  "Other"
];

export const DEFAULT_LOCATIONS = [
  { id: "main-block", name: "Main Block", description: "Academic and faculty departments" },
  { id: "library", name: "Library", description: "Central Library and study areas" },
  { id: "canteen", name: "Canteen & Food Court", description: "Main dining hall" },
  { id: "laboratory", name: "Laboratory Complex", description: "Engineering & Science labs" },
  { id: "auditorium", name: "Auditorium", description: "Event halls and seminar rooms" },
  { id: "parking", name: "Parking Area", description: "Two-wheeler and four-wheeler parking" },
  { id: "ground", name: "College Ground", description: "Athletic track and outdoor grounds" },
  { id: "hostel", name: "Hostel Blocks", description: "Student residential dorms" },
  { id: "bus-stop", name: "Campus Bus Stop", description: "Main bus terminal" },
  { id: "sports-area", name: "Sports Arena & Gym", description: "Indoor gym and courts" },
  { id: "admin-office", name: "Administrative Office", description: "Dean and registrar office" },
  { id: "student-center", name: "Student Activity Center", description: "Clubs and student union" }
];

export const DEFAULT_HANDOVER_LOCATIONS = [
  "College Security Office (Main Gate)",
  "Central Reception Desk (Main Block)",
  "Central Library Information Counter",
  "Dean of Students Administrative Desk"
];

export const ABUSE_REASONS = [
  { id: 'fake_listing', label: 'Fake listing or fabricated report' },
  { id: 'spam', label: 'Spam or unsolicited advertising' },
  { id: 'scam', label: 'Suspected scam or reward extortion' },
  { id: 'wrong_information', label: 'Misleading or incorrect information' },
  { id: 'inappropriate_content', label: 'Inappropriate language or imagery' },
  { id: 'duplicate', label: 'Duplicate report of an existing item' },
  { id: 'other', label: 'Other violation of campus safety guidelines' }
];
