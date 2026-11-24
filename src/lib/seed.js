// Demo data: 20 workers, 8 employers, 8 jobs, testimonials, requests and chats.
const DAY = 86400000;
const HOUR = 3600000;

const W = (id, name, gender, age, role, area, city, lat, lng, exp, wage, wageType, workType, langs, stars, idStatus, police, extra = {}) => ({
  id, role: 'worker', name, gender, age, primaryRole: role, area, city, lat, lng,
  experience: exp, wage, wageType, workType, languages: langs, seedStars: stars,
  idStatus, policeStatus: police, ...extra,
});

const portrait = (g, n) => `https://randomuser.me/api/portraits/${g === 'F' ? 'women' : 'men'}/${n}.jpg`;

const workersRaw = [
  W('w1', 'Sunita Devi', 'F', 38, 'maid', 'Krishna Nagar', 'Mathura', 27.4980, 77.6690, 12, 9000, 'month', 'parttime', ['Hindi', 'Braj'], [5, 5, 4, 5], 'verified', 'verified', { skills: ['Cleaning', 'Utensils', 'Laundry', 'Ironing'], description: 'I have worked in 4 homes in Krishna Nagar. Honest and on time. Morning shift preferred.', pastJobs: ['Gupta family, 6 years', 'Dr. Mehta residence, 4 years'], rehired: 1 }),
  W('w2', 'Kamla Sharma', 'F', 45, 'maid', 'Dampier Nagar', 'Mathura', 27.4870, 77.6800, 18, 11000, 'month', 'permanent', ['Hindi', 'Braj'], [4, 4, 5], 'verified', 'none', { skills: ['Cleaning', 'Cooking basics', 'Child care'], description: 'Full-day house help. Can also cook simple meals and look after children.', pastJobs: ['Bansal family, 10 years'] }),
  W('w3', 'Rekha Kumari', 'F', 26, 'maid', 'Raman Reti', 'Vrindavan', 27.5790, 77.6960, 3, 8000, 'month', 'parttime', ['Hindi', 'Bengali'], [4, 4], 'pending', 'none', { skills: ['Cleaning', 'Laundry'], description: 'Looking for part-time work in Vrindavan, mornings or evenings.', pastJobs: ['Ashram guest house, 2 years'] }),
  W('w4', 'Ramesh Yadav', 'M', 42, 'cook', 'Govind Nagar', 'Mathura', 27.5040, 77.6780, 15, 16000, 'month', 'permanent', ['Hindi', 'Braj'], [5, 5, 5, 4, 5], 'verified', 'verified', { skills: ['North Indian', 'Satvik food', 'Sweets', 'Party cooking'], description: 'Cook with 15 years experience. Expert in satvik and Braj style food. No onion-garlic cooking also.', pastJobs: ['Hotel Brijwasi, 7 years', 'Agarwal family, 5 years'], demo: true, rehired: 1 }),
  W('w5', 'Anita Chauhan', 'F', 34, 'cook', 'Civil Lines', 'Mathura', 27.4890, 77.6650, 8, 12000, 'month', 'parttime', ['Hindi', 'English'], [5, 4, 4], 'verified', 'none', { skills: ['North Indian', 'South Indian', 'Tiffin'], description: 'Home-style cooking for families. Clean and hygienic. Two shifts possible.', pastJobs: ['Saxena family, 5 years'] }),
  W('w6', 'Bikash Das', 'M', 29, 'cook', 'Kamla Nagar', 'Agra', 27.1800, 78.0120, 5, 14000, 'month', 'permanent', ['Bengali', 'Hindi'], [4, 4, 4, 3, 4], 'none', 'none', { skills: ['Bengali', 'Chinese', 'Tandoor'], description: 'Restaurant cook, now looking for a home or small hotel job in Agra.', pastJobs: ['Dhaba on NH-19, 3 years'] }),
  W('w7', 'Savitri Mishra', 'F', 52, 'caretaker', 'Krishna Nagar', 'Mathura', 27.5010, 77.6640, 20, 18000, 'month', 'permanent', ['Hindi', 'Braj'], [5, 5, 5, 5, 5, 4], 'verified', 'verified', { skills: ['Elderly care', 'Medicine reminders', 'Bedridden care', 'Live-in'], description: 'Caring for elders is my life work. Patient, gentle and experienced with bedridden patients.', pastJobs: ['Late Sh. Goyal ji, 8 years', 'Nursing home, 5 years'], rehired: 2 }),
  W('w8', 'Pooja Singh', 'F', 31, 'caretaker', 'Sector 62', 'Noida', 28.5700, 77.3200, 6, 22000, 'month', 'permanent', ['Hindi', 'English'], [5, 4, 5], 'verified', 'none', { skills: ['Nursing aide', 'Physiotherapy support', 'Baby care'], description: 'Trained nursing aide (GNM course). Day shift preferred.', pastJobs: ['Fortis home care, 3 years'] }),
  W('w9', 'Mohan Lal', 'M', 55, 'gardener', 'Radhika Vihar', 'Mathura', 27.4800, 77.6900, 20, 10000, 'month', 'parttime', ['Braj', 'Hindi'], [4, 5, 4], 'none', 'none', { skills: ['Lawn care', 'Kitchen garden', 'Pruning'], description: 'Mali with 20 years experience. I can take care of 3–4 homes in one area.', pastJobs: ['Collectorate garden, 10 years'] }),
  W('w10', 'Suresh Kumar', 'M', 36, 'gardener', 'Chhatikara Road', 'Vrindavan', 27.5830, 77.7050, 9, 9500, 'month', 'parttime', ['Hindi'], [4, 4], 'none', 'none', { skills: ['Lawn care', 'Potted plants', 'Terrace garden'], description: 'Terrace and pot gardens are my speciality.', pastJobs: ['ISKCON guest house, 4 years'] }),
  W('w11', 'Imran Khan', 'M', 33, 'plumber', 'Mandi Samiti', 'Mathura', 27.4950, 77.6850, 10, 600, 'day', 'daily', ['Hindi', 'Urdu'], [5, 4, 5, 5], 'verified', 'verified', { skills: ['Leak repair', 'Bathroom fitting', 'Motor & tank'], description: 'All plumbing work. Quick service in Mathura city.', pastJobs: ['Self-employed, 10 years'] }),
  W('w12', 'Rajesh Verma', 'M', 40, 'plumber', 'NH-19 Highway', 'Mathura', 27.5100, 77.6600, 14, 700, 'day', 'daily', ['Hindi'], [4, 4, 4], 'pending', 'none', { skills: ['Pipe fitting', 'Geyser', 'New construction'], description: 'Plumbing contractor for new houses and repairs.', pastJobs: ['Builders in Mathura, 14 years'] }),
  W('w13', 'Deepak Gupta', 'M', 28, 'electrician', 'Gaushala Nagar', 'Mathura', 27.4850, 77.6750, 4, 650, 'day', 'daily', ['Hindi', 'English'], [5, 4], 'verified', 'none', { skills: ['Wiring', 'Inverter', 'AC fitting'], description: 'ITI electrician. Inverter, AC and full house wiring.', pastJobs: ['Electrical shop, 4 years'] }),
  W('w14', 'Arjun Tomar', 'M', 37, 'electrician', 'Sanjay Place', 'Agra', 27.1700, 78.0000, 12, 800, 'day', 'daily', ['Hindi'], [4, 5, 4], 'verified', 'none', { skills: ['Commercial wiring', 'Panel work', 'CCTV'], description: 'Shop and office electrical work, CCTV installation.', pastJobs: ['Contractor, 12 years'] }),
  W('w15', 'Balwant Singh', 'M', 48, 'security', 'Birla Mandir', 'Mathura', 27.5150, 77.6700, 16, 13000, 'month', 'permanent', ['Hindi', 'Punjabi'], [4, 4, 5, 4], 'verified', 'verified', { skills: ['Night duty', 'Gate management', 'Ex-army'], description: 'Retired army jawan. Night or day duty for society, shop or bungalow.', pastJobs: ['Indian Army, 15 years', 'Society guard, 1 year'] }),
  W('w16', 'Vikram Chaudhary', 'M', 30, 'security', 'Sector 14', 'Gurugram', 28.4600, 77.0300, 7, 15000, 'month', 'permanent', ['Hindi', 'English'], [4, 4], 'none', 'none', { skills: ['Office security', 'CCTV monitoring'], description: 'Office and mall security experience.', pastJobs: ['SIS security, 5 years'] }),
  W('w17', 'Neha Agarwal', 'F', 24, 'showroom', 'Holi Gate', 'Mathura', 27.4960, 77.6800, 2, 10000, 'month', 'permanent', ['Hindi', 'English'], [5, 4, 5], 'verified', 'none', { skills: ['Billing', 'Customer handling', 'Saree draping'], description: 'Graduate, good with customers and billing software.', pastJobs: ['Saree shop, 2 years'] }),
  W('w18', 'Rahul Saini', 'M', 22, 'showroom', 'Chowk Bazaar', 'Mathura', 27.4900, 77.6720, 1, 8500, 'month', 'permanent', ['Hindi'], [4, 4], 'none', 'none', { skills: ['Stock keeping', 'Counter sales'], description: 'Hard-working, ready to learn. Can join immediately.', pastJobs: ['Mobile shop, 1 year'] }),
  W('w19', 'Mukesh Thakur', 'M', 44, 'driver', 'Sadar Bazaar', 'Mathura', 27.4780, 77.6780, 18, 17000, 'month', 'permanent', ['Hindi', 'Braj', 'English'], [5, 5, 4, 5, 5], 'verified', 'verified', { skills: ['Car', 'Highway driving', 'Delhi–Agra routes'], description: 'Safe driver, 18 years, no accidents. Knows Delhi, Agra and Jaipur routes well.', pastJobs: ['Family driver, 9 years', 'Taxi, 6 years'] }),
  W('w20', 'Sanjay Pal', 'M', 35, 'driver', 'Masani', 'Mathura', 27.5060, 77.6900, 9, 15000, 'month', 'permanent', ['Hindi'], [4, 5, 4], 'none', 'none', { skills: ['Car', 'School pick-up', 'Tempo'], description: 'Family and school pick-up driver.', pastJobs: ['School van, 5 years'] }),
];

const portraitNums = [44, 65, 12, 32, 47, 22, 68, 26, 75, 41, 36, 52, 18, 60, 71, 29, 33, 15, 81, 57];

const reviewers = ['Agarwal family', 'Dr. Mehta', 'Mrs. Bansal', 'Gupta ji', 'Saxena family', 'Mr. Khandelwal', 'Mrs. Kapoor', 'Shri Radhe Sarees'];
const reviewTexts = {
  5: ['Very honest and hard-working. Highly recommend.', 'Excellent work, always on time.', 'Like family now. Very trustworthy.'],
  4: ['Good work, sometimes late but informs in advance.', 'Reliable and polite.', 'Good skills, would hire again.'],
  3: ['Okay work, needs some guidance.'],
};

export function buildSeed() {
  const now = Date.now();
  const users = [];
  const reviews = [];

  workersRaw.forEach((w, i) => {
    const { seedStars, ...rest } = w;
    users.push({
      ...rest,
      photo: portrait(w.gender, portraitNums[i]),
      phone: `98${String(37000000 + i * 104729).slice(0, 8)}`,
      available: i % 7 !== 3,
      createdAt: now - (i * 3 + 2) * DAY,
      views: 20 + ((i * 37) % 140),
      referralCode: `KS${w.name.split(' ')[0].toUpperCase()}${i + 10}`,
      idType: w.idStatus !== 'none' ? 'Aadhaar' : '',
      idLast4: w.idStatus !== 'none' ? String(1000 + i * 373).slice(-4) : '',
    });
    seedStars.forEach((s, j) => {
      reviews.push({
        id: `r_${w.id}_${j}`, workerId: w.id, employerId: null,
        reviewerName: reviewers[(i + j) % reviewers.length],
        stars: s, tags: ['Punctual', 'Honest', 'Skilled', 'Clean', 'Polite'].filter((_, k) => (i + j + k) % 2 === 0).slice(0, 3),
        text: reviewTexts[s][(i + j) % reviewTexts[s].length],
        createdAt: now - (j + 1) * 40 * DAY,
      });
    });
  });

  const E = (id, name, role, businessName, businessType, area, city, lat, lng, photo, extra = {}) => ({
    id, role, name, businessName, businessType, area, city, lat, lng, photo,
    phone: `99${String(27000000 + lat * 1000).slice(0, 8)}`, createdAt: now - 20 * DAY,
    credits: 0, freeUsed: false, plan: null, idStatus: 'none', policeStatus: 'none', languages: ['Hindi'], ...extra,
  });

  users.push(
    E('e1', 'Priya Agrawal', 'household', 'Agrawal Family', 'Household', 'Krishna Nagar', 'Mathura', 27.4995, 77.6710, portrait('F', 90), { demo: true, freeUsed: true, credits: 1, description: 'Family of 5 with elderly parents. Looking for reliable help.' }),
    E('e2', 'Ravi Sharma', 'household', 'Sharma Family', 'Household', 'Dampier Nagar', 'Mathura', 27.4860, 77.6820, portrait('M', 85)),
    E('e3', 'Gopal Khandelwal', 'household', 'Khandelwal Niwas', 'Household', 'Raman Reti', 'Vrindavan', 27.5770, 77.6990, portrait('M', 88)),
    E('e4', 'Meera Kapoor', 'household', 'Kapoor Family', 'Household', 'Sector 50', 'Noida', 28.5680, 77.3250, portrait('F', 79)),
    E('e5', 'Anil Goyal', 'business', 'Shri Radhe Saree Showroom', 'Saree showroom', 'Holi Gate', 'Mathura', 27.4970, 77.6790, portrait('M', 77), { demo: true, plan: { name: 'basic', until: now + 25 * DAY }, credits: 17, description: 'Family-run saree showroom since 1982. 12 staff.' }),
    E('e6', 'Brijesh Agarwal', 'business', 'Brijwasi Mithai Wala', 'Sweet shop', 'Chowk Bazaar', 'Mathura', 27.4930, 77.6760, portrait('M', 70)),
    E('e7', 'Kavita Jain', 'business', 'Govinda Rasoi', 'Restaurant', 'NH-19 Highway', 'Mathura', 27.5120, 77.6620, portrait('F', 72)),
    E('e8', 'Dr. Alok Saxena', 'business', 'Shanti Care Clinic', 'Clinic', 'Civil Lines', 'Mathura', 27.4880, 77.6640, portrait('M', 66)),
    { id: 'admin', role: 'admin', name: 'KaamSetu Admin', photo: '', lat: 27.4924, lng: 77.6737, demo: true, createdAt: now - 60 * DAY, languages: ['Hindi', 'English'] }
  );

  const J = (id, employerId, role, place, timings, workType, pay, payType, description, extra = {}) => {
    const e = users.find((u) => u.id === employerId);
    return { id, employerId, role, place, timings, workType, pay, payType, description, lat: e.lat, lng: e.lng, open: true, createdAt: now - 3 * DAY, ...extra };
  };
  const jobs = [
    J('j1', 'e1', 'cook', 'home', '7–10 AM & 6–9 PM', 'permanent', 14000, 'month', 'Cook for family of 5. Satvik food, no onion-garlic on Tuesdays.'),
    J('j2', 'e2', 'maid', 'home', '8–11 AM', 'parttime', 8000, 'month', 'Cleaning, utensils and laundry for a 3BHK.'),
    J('j3', 'e3', 'caretaker', 'home', 'Live-in', 'permanent', 16000, 'month', 'Caretaker for 78-year-old father. Food and room provided.'),
    J('j4', 'e4', 'driver', 'home', '9 AM–7 PM', 'permanent', 18000, 'month', 'Family driver for Noida–Delhi office runs. Sundays off.'),
    J('j5', 'e5', 'showroom', 'shop', '10 AM–8 PM', 'permanent', 11000, 'month', 'Saree sales staff. Customer handling and draping. Festive bonus.', { urgentUntil: now + 40 * HOUR }),
    J('j6', 'e6', 'cook', 'shop', '6 AM–2 PM', 'permanent', 13000, 'month', 'Halwai helper for sweets and namkeen. Experience in peda preferred.'),
    J('j7', 'e7', 'security', 'shop', '8 PM–8 AM', 'permanent', 12000, 'month', 'Night security guard for restaurant and parking.'),
    J('j8', 'e8', 'maid', 'shop', '9 AM–5 PM', 'permanent', 9500, 'month', 'Cleaning staff for clinic. Hygiene training will be given.'),
  ];

  const R = (id, fromId, toId, status, ageH, extra = {}) => ({ id, fromId, toId, status, createdAt: now - ageH * HOUR, jobId: null, phoneRevealed: false, ...extra });
  const requests = [
    // Demo worker (w4) — 4 pending received
    R('q1', 'e1', 'w4', 'pending', 5, { jobId: 'j1' }),
    R('q2', 'e6', 'w4', 'pending', 12, { jobId: 'j6' }),
    R('q3', 'e7', 'w4', 'pending', 20),
    R('q4', 'e3', 'w4', 'pending', 30),
    // Demo household (e1): q1 is pending sent; accepted with chat; not available
    R('q5', 'e1', 'w1', 'accepted', 50, { phoneRevealed: true, respondedAt: now - 48 * HOUR }),
    R('q6', 'e1', 'w9', 'declined', 80, { respondedAt: now - 70 * HOUR }),
    // Demo business (e5)
    R('q7', 'e5', 'w17', 'accepted', 26, { phoneRevealed: true, respondedAt: now - 24 * HOUR }),
    R('q8', 'w18', 'e5', 'pending', 6, { jobId: 'j5' }),
  ];

  const M = (reqId, fromId, text, agoMin) => ({ id: `m_${reqId}_${agoMin}`, reqId, fromId, text, at: now - agoMin * 60000, read: true });
  const messages = [
    M('q5', 'e1', 'Namaste Sunita ji, we saw your profile. Are you free for morning work?', 2860),
    M('q5', 'w1', 'Namaste didi. Yes, I am free from 7 to 11 in the morning.', 2840),
    M('q5', 'e1', 'What is your expected salary for cleaning and utensils?', 2830),
    M('q5', 'w1', '₹9,000 per month. Sundays off.', 2800),
    M('q5', 'e1', 'Okay. Can you start Monday?', 2790),
    { ...M('q5', 'w1', 'Yes, I will come on Monday at 7 AM. 🙏', 2780), read: false },
    M('q7', 'e5', 'Hello Neha, we need sales staff for the festive season. Interested?', 1400),
    M('q7', 'w17', 'Yes sir, I have 2 years experience in saree showroom.', 1380),
  ];

  const swipes = [
    { userId: 'e1', targetId: 'w4', dir: 'right', at: now - 5 * HOUR },
    { userId: 'e1', targetId: 'w1', dir: 'right', at: now - 50 * HOUR },
    { userId: 'e1', targetId: 'w9', dir: 'right', at: now - 80 * HOUR },
    { userId: 'e5', targetId: 'w17', dir: 'right', at: now - 26 * HOUR },
  ];

  const notifications = [
    { id: 'n1', userId: 'w4', text: 'Priya Agrawal sent you a connection request', textHi: 'प्रिया अग्रवाल ने आपको अनुरोध भेजा', type: 'request', at: now - 5 * HOUR, read: false, link: '/app/requests' },
    { id: 'n2', userId: 'e1', text: 'Sunita Devi accepted your request', textHi: 'सुनीता देवी ने आपका अनुरोध स्वीकार किया', type: 'accepted', at: now - 48 * HOUR, read: false, link: '/app/chat/q5' },
    { id: 'n3', userId: 'e1', text: 'Mohan Lal is not available right now', textHi: 'मोहन लाल अभी उपलब्ध नहीं हैं', type: 'declined', at: now - 70 * HOUR, read: true, link: '/app/requests' },
  ];

  const transactions = [
    { id: 't1', userId: 'e1', amount: 0, credits: 1, desc: 'First connection free', at: now - 48 * HOUR },
    { id: 't2', userId: 'e1', amount: 99, credits: 1, desc: '1 connection credit', at: now - 30 * HOUR },
    { id: 't3', userId: 'e5', amount: 499, credits: 20, desc: 'Business Basic plan (30 days)', at: now - 5 * DAY },
    { id: 't4', userId: 'e5', amount: 0, credits: -1, desc: 'Connection: Neha Agarwal', at: now - 24 * HOUR },
  ];

  const prefs = {
    e1: { role: '', place: 'home', hours: '', workType: 'any', start: '', budgetMin: 5000, budgetMax: 25000, languages: [], gender: 'any', maxDistance: 15, verifiedOnly: false },
    e5: { role: '', place: 'shop', hours: '10 AM–8 PM', workType: 'permanent', start: '', budgetMin: 7000, budgetMax: 20000, languages: [], gender: 'any', maxDistance: 15, verifiedOnly: false },
    w4: { skills: ['North Indian', 'Satvik food', 'Sweets'], categories: ['cook'], maxDistance: 15, workType: 'any', hours: '' },
  };

  const verifications = [
    { id: 'v1', userId: 'w3', kind: 'id', idType: 'Aadhaar', last4: '4821', image: '', status: 'pending', at: now - 10 * HOUR },
    { id: 'v2', userId: 'w12', kind: 'id', idType: 'Voter ID', last4: '7713', image: '', status: 'pending', at: now - 30 * HOUR },
    { id: 'v3', userId: 'w2', kind: 'police', idType: 'Police certificate', last4: '', image: '', status: 'pending', at: now - 4 * HOUR },
  ];

  const reports = [
    { id: 'rp1', reporterId: 'e2', targetId: 'w16', reason: 'Asked for advance money before meeting', status: 'open', at: now - 20 * HOUR },
  ];

  // Historic platform activity for admin charts (last 8 weeks)
  const activity = [
    { week: 'W1', signups: 18, swipes: 240, requests: 60, accepted: 31, revenue: 1890 },
    { week: 'W2', signups: 24, swipes: 310, requests: 77, accepted: 42, revenue: 2740 },
    { week: 'W3', signups: 31, swipes: 420, requests: 96, accepted: 55, revenue: 3610 },
    { week: 'W4', signups: 29, swipes: 465, requests: 102, accepted: 58, revenue: 4120 },
    { week: 'W5', signups: 40, swipes: 610, requests: 131, accepted: 79, revenue: 5980 },
    { week: 'W6', signups: 46, swipes: 720, requests: 150, accepted: 88, revenue: 6870 },
    { week: 'W7', signups: 52, swipes: 860, requests: 171, accepted: 104, revenue: 8240 },
    { week: 'W8', signups: 61, swipes: 990, requests: 196, accepted: 121, revenue: 9630 },
  ];

  return {
    version: 1, currentUserId: null, lang: 'en',
    users, jobs, reviews, requests, messages, swipes, notifications, transactions, prefs,
    verifications, reports, activity, saved: [], referrals: [],
  };
}

export const TESTIMONIALS = [
  { name: 'Priya A.', city: 'Mathura', role: 'Household', text: 'Found a cook in two days without paying any agency. We chatted first, then called. So simple.', textHi: 'दो दिन में रसोइया मिल गया, बिना एजेंसी के पैसे दिए।' },
  { name: 'Sunita D.', city: 'Mathura', role: 'Maid', text: 'Earlier the agency took my first month salary. Now I get full pay and choose homes near me.', textHi: 'पहले एजेंसी पहली तनख्वाह ले लेती थी। अब पूरा पैसा मिलता है।' },
  { name: 'Anil G.', city: 'Mathura', role: 'Saree showroom', text: 'Hired 4 festive staff in one week. The verified badges give us confidence.', textHi: 'एक हफ़्ते में 4 स्टाफ़ रखे। वेरिफ़ाइड बैज से भरोसा मिलता है।' },
  { name: 'Savitri M.', city: 'Mathura', role: 'Caretaker', text: 'My reviews from past families help new families trust me. I got a live-in job quickly.', textHi: 'पुराने परिवारों के रिव्यू से नए परिवार भरोसा करते हैं।' },
  { name: 'Meera K.', city: 'Noida', role: 'Household', text: 'The map showed a driver 2 km away. He started the next Monday.', textHi: 'नक्शे पर 2 कि.मी. दूर ड्राइवर मिला।' },
  { name: 'Imran K.', city: 'Mathura', role: 'Plumber', text: 'I get daily work calls directly from homes near the mandi. No middleman cut.', textHi: 'मंडी के पास के घरों से सीधा काम मिलता है।' },
];
