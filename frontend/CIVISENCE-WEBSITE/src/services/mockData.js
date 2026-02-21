export const adminStatsSeed = {
  totalComplaints: 1824,
  resolved: 1336,
  pending: 348,
  highPriority: 102,
  duplicates: 38,
};

export const monthlyComplaints = [
  { month: "Jan", complaints: 118, resolved: 89, pending: 29 },
  { month: "Feb", complaints: 132, resolved: 101, pending: 31 },
  { month: "Mar", complaints: 154, resolved: 117, pending: 37 },
  { month: "Apr", complaints: 168, resolved: 130, pending: 38 },
  { month: "May", complaints: 186, resolved: 141, pending: 45 },
  { month: "Jun", complaints: 173, resolved: 128, pending: 45 },
  { month: "Jul", complaints: 161, resolved: 121, pending: 40 },
  { month: "Aug", complaints: 175, resolved: 136, pending: 39 },
  { month: "Sep", complaints: 164, resolved: 126, pending: 38 },
  { month: "Oct", complaints: 149, resolved: 116, pending: 33 },
  { month: "Nov", complaints: 142, resolved: 113, pending: 29 },
  { month: "Dec", complaints: 128, resolved: 98, pending: 30 },
];

export const categoryDistribution = [
  { name: "Road Damage", value: 29 },
  { name: "Water Supply", value: 18 },
  { name: "Waste Mgmt", value: 22 },
  { name: "Street Light", value: 16 },
  { name: "Public Safety", value: 15 },
];

export const municipalPerformance = [
  { office: "North Division", resolvedRate: 91, avgTurnaroundDays: 2.4 },
  { office: "Central Division", resolvedRate: 88, avgTurnaroundDays: 2.7 },
  { office: "East Division", resolvedRate: 84, avgTurnaroundDays: 3.1 },
  { office: "West Division", resolvedRate: 81, avgTurnaroundDays: 3.4 },
  { office: "South Division", resolvedRate: 79, avgTurnaroundDays: 3.9 },
];

export const cityComplaintClusters = [
  { id: "c1", lat: 12.9742, lng: 77.5898, count: 84, severity: "high" },
  { id: "c2", lat: 12.9794, lng: 77.6027, count: 57, severity: "medium" },
  { id: "c3", lat: 12.9631, lng: 77.5872, count: 35, severity: "low" },
  { id: "c4", lat: 12.9877, lng: 77.5724, count: 44, severity: "medium" },
  { id: "c5", lat: 12.9582, lng: 77.6144, count: 73, severity: "high" },
  { id: "c6", lat: 12.9481, lng: 77.5815, count: 28, severity: "low" },
  { id: "c7", lat: 12.9394, lng: 77.6061, count: 63, severity: "high" },
  { id: "c8", lat: 12.9911, lng: 77.6189, count: 41, severity: "medium" },
];

export const sensitiveLocationsSeed = [
  { id: "s1", name: "City Hospital", lat: 12.9721, lng: 77.5998, type: "Hospital" },
  { id: "s2", name: "Central School", lat: 12.9678, lng: 77.6044, type: "School" },
  { id: "s3", name: "Water Treatment Unit", lat: 12.9543, lng: 77.5922, type: "Utility" },
  { id: "s4", name: "Metro Exchange", lat: 12.9866, lng: 77.5955, type: "Transit" },
];

export const allComplaintsSeed = [
  {
    id: "CMP-1092",
    title: "Sewage overflow near market",
    category: "Waste Mgmt",
    status: "Pending",
    priority: "High",
    date: "2026-02-18",
    location: "Central Market",
    municipal: "Central Division",
  },
  {
    id: "CMP-1091",
    title: "Street lights not working",
    category: "Street Light",
    status: "In Progress",
    priority: "Medium",
    date: "2026-02-16",
    location: "Ward 11",
    municipal: "North Division",
  },
  {
    id: "CMP-1089",
    title: "Pothole chain on MG Road",
    category: "Road Damage",
    status: "Resolved",
    priority: "High",
    date: "2026-02-14",
    location: "MG Road",
    municipal: "Central Division",
  },
  {
    id: "CMP-1084",
    title: "Garbage collection skipped",
    category: "Waste Mgmt",
    status: "Pending",
    priority: "Medium",
    date: "2026-02-13",
    location: "Ward 07",
    municipal: "East Division",
  },
  {
    id: "CMP-1081",
    title: "Water leakage on service lane",
    category: "Water Supply",
    status: "Resolved",
    priority: "Low",
    date: "2026-02-11",
    location: "Lakeside Block",
    municipal: "South Division",
  },
  {
    id: "CMP-1078",
    title: "Unsafe cable hanging",
    category: "Public Safety",
    status: "In Progress",
    priority: "High",
    date: "2026-02-09",
    location: "Tech Park Gate 2",
    municipal: "West Division",
  },
  {
    id: "CMP-1075",
    title: "Storm drain clogged",
    category: "Water Supply",
    status: "Resolved",
    priority: "Medium",
    date: "2026-02-08",
    location: "Ward 03",
    municipal: "North Division",
  },
  {
    id: "CMP-1070",
    title: "Broken divider reflectors",
    category: "Road Damage",
    status: "Pending",
    priority: "Low",
    date: "2026-02-06",
    location: "Airport Flyover",
    municipal: "West Division",
  },
];

export const municipalAssignedComplaintsSeed = [
  {
    id: "MUN-551",
    title: "Overflowing garbage point",
    status: "Pending",
    priority: "High",
    sector: "Zone A / Ward 11",
    reportedAt: "2026-02-19",
    remarks: "",
  },
  {
    id: "MUN-547",
    title: "Damaged zebra crossing",
    status: "In Progress",
    priority: "Medium",
    sector: "Zone A / Ward 08",
    reportedAt: "2026-02-17",
    remarks: "Material requested",
  },
  {
    id: "MUN-542",
    title: "Waterline pressure drop",
    status: "Pending",
    priority: "High",
    sector: "Zone A / Ward 06",
    reportedAt: "2026-02-15",
    remarks: "",
  },
  {
    id: "MUN-531",
    title: "Streetlight outage",
    status: "Resolved",
    priority: "Low",
    sector: "Zone A / Ward 03",
    reportedAt: "2026-02-10",
    remarks: "Restored with new ballast",
  },
];

export const issueTrends = [
  { month: "Sep", sanitation: 36, roads: 27, utilities: 21 },
  { month: "Oct", sanitation: 42, roads: 30, utilities: 24 },
  { month: "Nov", sanitation: 38, roads: 26, utilities: 28 },
  { month: "Dec", sanitation: 34, roads: 29, utilities: 26 },
  { month: "Jan", sanitation: 46, roads: 31, utilities: 33 },
  { month: "Feb", sanitation: 39, roads: 28, utilities: 30 },
];

export const resolutionPerformance = [
  { week: "W1", resolved: 18, backlog: 26 },
  { week: "W2", resolved: 22, backlog: 22 },
  { week: "W3", resolved: 26, backlog: 19 },
  { week: "W4", resolved: 29, backlog: 16 },
];

export const citizenProfileSeed = {
  name: "Aarav Kumar",
  email: "citizen@civisense.ai",
  phone: "+91 99887 55443",
  ward: "Ward 11",
  address: "34 Garden Street, Metro City",
  photo:
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=320&q=80",
};

export const citizenComplaintsSeed = [
  {
    id: "CIT-301",
    title: "Water logging after rain",
    category: "Water Supply",
    status: "Pending",
    priority: "High",
    date: "2026-02-19",
    location: "Ward 11",
  },
  {
    id: "CIT-288",
    title: "Uncollected waste bins",
    category: "Waste Mgmt",
    status: "In Progress",
    priority: "Medium",
    date: "2026-02-15",
    location: "Garden Street",
  },
  {
    id: "CIT-270",
    title: "Flickering street lights",
    category: "Street Light",
    status: "Resolved",
    priority: "Low",
    date: "2026-02-09",
    location: "School Road",
  },
];

export const citizenTimelineByComplaint = {
  "CIT-301": [
    { label: "Complaint Submitted", timestamp: "2026-02-19 09:10" },
    { label: "AI Classification Complete", timestamp: "2026-02-19 09:11" },
    { label: "Assigned to Municipal Office", timestamp: "2026-02-19 09:20" },
  ],
  "CIT-288": [
    { label: "Complaint Submitted", timestamp: "2026-02-15 14:02" },
    { label: "Assigned to Zone A Team", timestamp: "2026-02-15 14:24" },
    { label: "Field Team En Route", timestamp: "2026-02-16 10:35" },
  ],
  "CIT-270": [
    { label: "Complaint Submitted", timestamp: "2026-02-09 11:43" },
    { label: "Electrical Team Assigned", timestamp: "2026-02-09 12:10" },
    { label: "Issue Resolved", timestamp: "2026-02-10 08:16" },
  ],
};
