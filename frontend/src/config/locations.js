// Suggested farm locations ("City, State") for the weather lookup, grouped by state / UT.
// These are only suggestions: any "City, State" can be typed with "Custom Location".
// The backend geocodes the text, so names are plain, well-known places.
export const LOCATIONS_BY_STATE = {
  'Andhra Pradesh': ['Guntur', 'Vijayawada', 'Visakhapatnam', 'Kurnool', 'Tirupati', 'Nellore', 'Anantapur', 'Rajahmundry'],
  'Arunachal Pradesh': ['Itanagar', 'Tawang', 'Pasighat'],
  'Assam': ['Guwahati', 'Jorhat', 'Dibrugarh', 'Silchar', 'Tezpur'],
  'Bihar': ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Purnia', 'Darbhanga'],
  'Chhattisgarh': ['Raipur', 'Bilaspur', 'Durg', 'Jagdalpur', 'Korba'],
  'Goa': ['Panaji', 'Margao'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Rajkot', 'Vadodara', 'Junagadh', 'Bhavnagar', 'Anand'],
  'Haryana': ['Karnal', 'Hisar', 'Ambala', 'Rohtak', 'Gurugram', 'Sirsa'],
  'Himachal Pradesh': ['Shimla', 'Mandi', 'Kullu', 'Solan'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Hazaribagh'],
  'Karnataka': ['Mandya', 'Bengaluru', 'Mysuru', 'Belagavi', 'Hubballi', 'Davangere', 'Shivamogga', 'Kalaburagi', 'Raichur'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Palakkad', 'Alappuzha', 'Kottayam'],
  'Ladakh': ['Leh', 'Kargil'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Hoshangabad'],
  'Maharashtra': ['Pune', 'Nashik', 'Nagpur', 'Aurangabad', 'Kolhapur', 'Solapur', 'Amravati', 'Latur', 'Sangli'],
  'Manipur': ['Imphal'],
  'Meghalaya': ['Shillong'],
  'Mizoram': ['Aizawl'],
  'Nagaland': ['Kohima', 'Dimapur'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Sambalpur', 'Berhampur', 'Balasore'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Udaipur', 'Bikaner', 'Ajmer', 'Sri Ganganagar'],
  'Sikkim': ['Gangtok'],
  'Tamil Nadu': ['Coimbatore', 'Salem', 'Chennai', 'Thanjavur', 'Madurai', 'Erode', 'Tiruchirappalli', 'Tirunelveli', 'Vellore', 'Thoothukudi', 'Dindigul', 'Namakkal', 'Nagapattinam', 'Kanyakumari'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam'],
  'Tripura': ['Agartala'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Meerut', 'Prayagraj', 'Gorakhpur', 'Bareilly', 'Aligarh'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Haldwani', 'Rudrapur'],
  'West Bengal': ['Kolkata', 'Siliguri', 'Durgapur', 'Asansol', 'Bardhaman', 'Malda'],
  'Andaman and Nicobar Islands': ['Port Blair'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Silvassa', 'Daman'],
  'Delhi': ['New Delhi'],
  'Lakshadweep': ['Kavaratti'],
  'Puducherry': ['Puducherry', 'Karaikal'],
};

export const LOCATION_GROUPS = Object.entries(LOCATIONS_BY_STATE).map(([state, cities]) => ({
  state,
  options: cities.map((c) => `${c}, ${state}`),
}));

export const ALL_LOCATIONS = LOCATION_GROUPS.flatMap((g) => g.options);
