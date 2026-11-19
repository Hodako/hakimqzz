// Comprehensive Bangladesh Geographic Dataset: Divisions, Districts, Upazilas/Thanas, Unions/Areas
// Formatted for SteadFast Courier & E-Commerce Delivery Address Generation

export interface BdDivision {
  name: string;
  nameBn: string;
  districts: BdDistrict[];
}

export interface BdDistrict {
  name: string;
  nameBn: string;
  upazilas: BdUpazila[];
}

export interface BdUpazila {
  name: string;
  nameBn: string;
  unions?: string[];
}

export const BD_GEO_DATA: BdDivision[] = [
  {
    name: "Dhaka",
    nameBn: "ঢাকা",
    districts: [
      {
        name: "Dhaka",
        nameBn: "ঢাকা",
        upazilas: [
          { name: "Dhanmondi", nameBn: "ধানমন্ডি", unions: ["Dhanmondi R/A", "Rayerbazar", "Shankar", "Sukrabad", "Sobhanbag"] },
          { name: "Gulshan", nameBn: "গুলশান", unions: ["Gulshan 1", "Gulshan 2", "Niketan", "Baridhara", "Baridhara DOHS"] },
          { name: "Banani", nameBn: "বনানী", unions: ["Banani Model Town", "Banani DOHS", "Chairman Bari", "Kakoli"] },
          { name: "Uttara", nameBn: "উত্তরা", unions: ["Sector 1-5", "Sector 6-10", "Sector 11-14", "Uttara Model Town", "Diabari"] },
          { name: "Mirpur", nameBn: "মিরপুর", unions: ["Mirpur 1", "Mirpur 2", "Mirpur 10", "Mirpur 11", "Mirpur 12", "Pallabi", "Shewrapara", "Kazipara"] },
          { name: "Mohammadpur", nameBn: "মোহাম্মদপুর", unions: ["Town Hall", "Salimullah Road", "Tajmahal Road", "Noorjahan Road", "Babor Road", "Bosila", "Japan Garden City"] },
          { name: "Badda", nameBn: "বাড্ডা", unions: ["Middle Badda", "North Badda", "South Badda", "Merul Badda", "Aftabnagar"] },
          { name: "Khilgaon", nameBn: "খিলগাঁও", unions: ["Goron", "Tilpapara", "Khidmah", "Taltola", "Khilgaon PWD"] },
          { name: "Motijheel", nameBn: "মতিঝিল", unions: ["Dilkusha", "Arambagh", "Fakirapool", "Kamalapur"] },
          { name: "Paltan", nameBn: "পল্টন", unions: ["Naya Paltan", "Purana Paltan", "Bijoynagar", "Topkhana Road"] },
          { name: "Jatrabari", nameBn: "যাত্রাবাড়ী", unions: ["Sayedabad", "Dholairpar", "Bibir Bagicha", "Konapara", "Matuail"] },
          { name: "Savar", nameBn: "সাভার", unions: ["Savar Pourashava", "Ashulia", "Birulia", "Pathalia", "Dhamsona", "Shimulia", "Tetuljhora"] },
          { name: "Keraniganj", nameBn: "কেরানীগঞ্জ", unions: ["Zinjira", "Aganagar", "Kalindi", "Ruhitpur", "Basta", "Subhadya", "Taranagar"] },
          { name: "Dhamrai", nameBn: "ধামরাই", unions: ["Dhamrai Pourashava", "Amta", "Baisakanda", "Kulla", "Rowail", "Sutipara"] },
          { name: "Nawabganj", nameBn: "নবাবগঞ্জ", unions: ["Agla", "Bakshonagar", "Bandura", "Baruakhali", "Galimpur", "Kailail", "Sholla"] },
          { name: "Dohar", nameBn: "দোহার", unions: ["Dohar Pourashava", "Bilashpur", "Kusumhati", "Mahmudpur", "Narisha", "Nayabari"] },
        ],
      },
      {
        name: "Gazipur",
        nameBn: "গাজীপুর",
        upazilas: [
          { name: "Gazipur Sadar", nameBn: "গাজীপুর সদর", unions: ["Joydebpur", "Chowrasta", "Board Bazar", "Konabari", "Kashimpur", "Salna"] },
          { name: "Tongi", nameBn: "টঙ্গী", unions: ["Tongi Bazar", "Station Road", "Cherag Ali", "College Gate", "Mill Gate", "Tongi I/A"] },
          { name: "Kaliakair", nameBn: "কালিয়াকৈর", unions: ["Chandra", "Mouchak", "Boali", "Chapair", "Fulbaria", "Madhabpur", "Sreefaltali"] },
          { name: "Sreepur", nameBn: "শ্রীপুর", unions: ["Maona", "Baromi", "Gazipur Union", "Gosinga", "Kaoraid", "Prahladpur", "Telihati"] },
          { name: "Kapasia", nameBn: "কাপাসিয়া", unions: ["Barishab", "Chandpur", "Durbahati", "Ghagutia", "Kapasia Sadar", "Karihata", "Rayed", "Sanmania", "Taraganj"] },
          { name: "Kaliganj", nameBn: "কালীগঞ্জ", unions: ["Kaliganj Pourashava", "Bahadursadi", "Baktarpur", "Jamalpur", "Jangalia", "Moktarpur", "Nagari", "Tumulia"] },
        ],
      },
      {
        name: "Narayanganj",
        nameBn: "নারায়ণগঞ্জ",
        upazilas: [
          { name: "Narayanganj Sadar", nameBn: "নারায়ণগঞ্জ সদর", unions: ["Alirtek", "Bakhtabali", "Enayetnagar", "Fatullah", "Gognagar", "Kashipur", "Kutubpur"] },
          { name: "Bandar", nameBn: "বন্দর", unions: ["Bandar Sadar", "Dhamgar", "Kala Gachhiya", "Madangonj", "Muchhapur", "Musapur"] },
          { name: "Rupganj", nameBn: "রূপগঞ্জ", unions: ["Bhulta", "Golakandail", "Daudpur", "Kayetpara", "Murapara", "Rupganj Sadar", "Tarabo"] },
          { name: "Sonargaon", nameBn: "সোনারগাঁও", unions: ["Barodi", "Baidyerbazar", "Jampur", "Mograpara", "Pirojpur", "Sadipur", "Sanmandi", "Shambhupura"] },
          { name: "Araihazar", nameBn: "আড়াইহাজার", unions: ["Bishnandi", "Brahmandi", "Duptara", "Fatehpur", "Haorpara", "Khadagpur", "Mahmudpur", "Uchitpur"] },
        ],
      },
      {
        name: "Tangail",
        nameBn: "টাঙ্গাইল",
        upazilas: [
          { name: "Tangail Sadar", nameBn: "টাঙ্গাইল সদর", unions: ["Baghil", "Danya", "Gala", "Gharinda", "Hugra", "Kagmari", "Katuli", "Maguradaha", "Porabari"] },
          { name: "Mirzapur", nameBn: "মির্জাপুর", unions: ["Mirzapur Sadar", "Gorai", "Jamurki", "Banail", "Anaitpur", "Fatehpur", "Bhatgram"] },
          { name: "Madhupur", nameBn: "মধুপুর", unions: ["Alokdia", "Aranokhola", "Aushnara", "Golabari", "Kuralia", "Mirzabari", "Sholakuri"] },
          { name: "Gopalpur", nameBn: "গোপালপুর", unions: ["Alamnagar", "Hadira", "Hemnagar", "Jhawail", "Mirzapur", "Nagbari"] },
          { name: "Ghatail", nameBn: "ঘাটাইল", unions: ["Anehola", "Deolabari", "Digar", "Dhalapara", "Jamuria", "Lokmanpur", "Sandhanpur"] },
          { name: "Kalihati", nameBn: "কালিহাতী", unions: ["Bangra", "Balla", "Birbashinda", "Dashkia", "Durgapur", "Nagbari", "Paikara", "Salla"] },
        ],
      },
      {
        name: "Narsingdi",
        nameBn: "নরসিংদী",
        upazilas: [
          { name: "Narsingdi Sadar", nameBn: "নরসিংদী সদর", unions: ["Alokbali", "Amirabad", "Char Madhabpur", "Chinishpur", "Hajipur", "Karimpur", "Meherpara", "Nazarpur", "Paikarchar", "Silmandi"] },
          { name: "Palash", nameBn: "পলাশ", unions: ["Char Sindur", "Danga", "Gazaria", "Jinardi"] },
          { name: "Shibpur", nameBn: "শিবপুর", unions: ["Ayubpur", "Baghaba", "Chakradha", "Dulalpur", "Jadarchar", "Joynagar", "Putia", "Sadharchar"] },
          { name: "Raipura", nameBn: "রায়পুরা", unions: ["Alipura", "Amirganj", "Banshgari", "Chanderkandi", "Mirzanagar", "Musapur", "Nilakhya", "Paratoli"] },
          { name: "Monohardi", nameBn: "মনোহরদী", unions: ["Barachapa", "Chalakchar", "Daudpur", "Gotashia", "Kanchikata", "Khidirpur", "Sukkurpur"] },
          { name: "Belabo", nameBn: "বেলাবো", unions: ["Amlabo", "Bajnaba", "Belabo Sadar", "Char Ujirpur", "Narayanpur", "Patuli", "Sallabad"] },
        ],
      },
      {
        name: "Faridpur",
        nameBn: "ফরিদপুর",
        upazilas: [
          { name: "Faridpur Sadar", nameBn: "ফরিদপুর সদর", unions: ["Aliabad", "Ambikapur", "Char Madhabdia", "Decreer Char", "Gerechar", "Ishannagar", "Kanaipur", "Machpara"] },
          { name: "Boalmari", nameBn: "বোয়ালমারী", unions: ["Boalmari Sadar", "Chatul", "Dadpur", "Ghoshpur", "Gunbaha", "Moina", "Paramandi", "Satair", "Shekhor"] },
          { name: "Bhanga", nameBn: "ভাঙ্গা", unions: ["Algi", "Bhanga Sadar", "Chandra", "Gharua", "Hamirdi", "Kalamridha", "Kaoliabari", "Manikdah", "Nasirabad", "Nurullaganj", "Tujarpur"] },
          { name: "Madhukhali", nameBn: "মধুখালী", unions: ["Bagat", "Dumain", "Gajaria", "Jahapur", "Kamarkhali", "Korkandi", "Madhukhali Sadar", "Megchami", "Naopara", "Raipur"] },
          { name: "Nagarkanda", nameBn: "নগরকান্দা", unions: ["Char Jashore", "Dhaoa", "Fulbaria", "Kodalia", "Laskar", "Nagarkanda Sadar", "Pukuria", "Rampur", "Talma"] },
        ],
      },
      {
        name: "Manikganj",
        nameBn: "মানিকগঞ্জ",
        upazilas: [
          { name: "Manikganj Sadar", nameBn: "মানিকগঞ্জ সদর", unions: ["Atigram", "Betila Mitara", "Bhararia", "Dighi", "Garpara", "Hatipara", "Jaagir", "Nabagram", "Putail"] },
          { name: "Singair", nameBn: "সিংগাইর", unions: ["Baldhara", "Baira", "Charigram", "Dharalla", "Jamirta", "Joymantop", "Saista", "Singair Sadar", "Talebpur"] },
          { name: "Saturia", nameBn: "সাটুরিয়া", unions: ["Baliati", "Baraid", "Dargagram", "Dhanikhola", "Fukurati", "Haragach", "Saturia Sadar", "Tilli"] },
          { name: "Shivalaya", nameBn: "শিবালয়", unions: ["Aricha", "Shivalaya Sadar", "Tebaria", "Uthali", "Ulay", "Nali"] },
        ],
      },
      {
        name: "Munshiganj",
        nameBn: "মুন্সীগঞ্জ",
        upazilas: [
          { name: "Munshiganj Sadar", nameBn: "মুন্সীগঞ্জ সদর", unions: ["Adhara", "Bajrayogini", "Banglabazar", "Char Kewar", "Mirkadim", "Mollahkandi", "Panchasar", "Rampur", "Silchar"] },
          { name: "Srinagar", nameBn: "শ্রীনগর", unions: ["Baghra", "Barigaon", "Birtara", "Hashara", "Kola", "Kukutia", "Patabhog", "Rarikhal", "Sholaghar", "Srinagar Sadar", "Tantar"] },
          { name: "Sirajdikhan", nameBn: "সিরাজদিখান", unions: ["Baluchar", "Basail", "Boyragadi", "Chitrakot", "Ichhapura", "Jainasar", "Kola", "Latobdi", "Malkhanagar", "Madhyapara", "Roshunia"] },
          { name: "Lohajang", nameBn: "লৌহজং", unions: ["Bejgaon", "Baultoli", "Gaodia", "Haldia", "Kanakshar", "Khidirpara", "Kumarbhog", "Lohajang Sadar", "Medinimondol"] },
          { name: "Tongibari", nameBn: "টঙ্গিবাড়ী", unions: ["Abdullapur", "Autshahi", "Baghia", "Betka", "Dhipur", "Hasail Banari", "Josholong", "Kamarkhali", "Kathadia Shimulia", "Sonarang"] },
          { name: "Gazaria", nameBn: "গজারিয়া", unions: ["Balumath", "Baushia", "Bhaberchar", "Gazaria Sadar", "Gohorpur", "Hossendi", "Imampur", "Tengarchar"] },
        ],
      },
      {
        name: "Kishoreganj",
        nameBn: "কিশোরগঞ্জ",
        upazilas: [
          { name: "Kishoreganj Sadar", nameBn: "কিশোরগঞ্জ সদর", unions: ["Binnati", "Boula", "Danapatuli", "Jasodal", "Karatia", "Koilakuri", "Mahinanda", "Maria", "Rashidabad"] },
          { name: "Bhairab", nameBn: "ভৈরব", unions: ["Aganagar", "Bhairab Pourashava", "Ghazaria", "Kalikaprashad", "Sadullahpur", "Shimulkandi", "Sreenagar"] },
          { name: "Bajitpur", nameBn: "বাজিতপুর", unions: ["Baliardi", "Dilarpur", "Gajirghat", "Halimpur", "Humaipur", "Kailaghat", "Pirijpur", "Sararchar"] },
        ],
      },
    ],
  },
  {
    name: "Chattogram",
    nameBn: "চট্টগ্রাম",
    districts: [
      {
        name: "Chattogram",
        nameBn: "চট্টগ্রাম",
        upazilas: [
          { name: "Kotwali", nameBn: "কোতোয়ালী", unions: ["Anderkilla", "Jamal Khan", "Enayet Bazar", "Feringi Bazar", "Patharghata", "Alkaran"] },
          { name: "Panchlaish", nameBn: "পাঁচলাইশ", unions: ["Nasirabad", "Muradpur", "Chawkbazar", "Sholoshohor", "GEC Circle", "Khulshi"] },
          { name: "Halishahar", nameBn: "হালিশহর", unions: ["North Halishahar", "South Halishahar", "Chowdhury Para", "F Block", "G Block"] },
          { name: "Agrabad", nameBn: "আগ্রাবাদ", unions: ["Commercial Area", "Chotopole", "Badamtoli", "Access Road", "Muhuri Para"] },
          { name: "Double Mooring", nameBn: "ডবল মুরিং", unions: ["Dewanhat", "Mogultuli", "Pathantooly", "Madarbari", "Sadarghat"] },
          { name: "Patenga", nameBn: "পতেঙ্গা", unions: ["Airport Area", "Sea Beach", "Katgor", "Steel Mill", "Naval Academy"] },
          { name: "Sitakunda", nameBn: "সীতাকুণ্ড", unions: ["Barabkunda", "Bhatiyari", "Kumira", "Salimpur", "Sitakunda Sadar", "Sonaichhari", "Syedpur"] },
          { name: "Mirsharai", nameBn: "মীরসরাই", unions: ["Baraiyarhat", "Durgapur", "Hinguli", "Ichhakhali", "Karerhat", "Katachhara", "Mithanala", "Zorarganj"] },
          { name: "Hathazari", nameBn: "হাটহাজারী", unions: ["Burischar", "Chikandandi", "Fatehpur", "Forhadabad", "Garduara", "Guman Mordon", "Mekhal"] },
          { name: "Patiya", nameBn: "পটিয়া", unions: ["Asia", "Bara Uthan", "Bhatikhari", "Chhanahara", "Dhaorkhali", "Habilashdwip", "Junglekhali", "Kelishahar", "Kharana", "Kusumpura"] },
          { name: "Raozan", nameBn: "রাউজান", unions: ["Baghwan", "Binajuri", "Chikdair", "Dabua", "Gohira", "Haladia", "Kadapara", "Noapara", "Pahartali", "Urkirchar"] },
          { name: "Boalkhali", nameBn: "বোয়ালখালী", unions: ["Ahla Karaldenga", "Amuchia", "Charandwip", "Popadia", "Purba Gomdandi", "Sakpura", "Saroatoli", "Sreepur Kharandwip"] },
          { name: "Anwara", nameBn: "আনোয়ারা", unions: ["Anwara Sadar", "Barasat", "Barakhain", "Battali", "Burumchhari", "Chatari", "Haildhar", "Paruapara", "Roypur"] },
        ],
      },
      {
        name: "Cox's Bazar",
        nameBn: "কক্সবাজার",
        upazilas: [
          { name: "Cox's Bazar Sadar", nameBn: "কক্সবাজার সদর", unions: ["Kolatoli", "Laboni", "Jhilwanja", "Khurushkul", "Patali Machhuakhali", "Chowfaldandi", "Barabil"] },
          { name: "Teknaf", nameBn: "টেকনাফ", unions: ["Baharchhara", "Nhilla", "Sabrang", "Saint Martin", "Teknaf Sadar", "Whykong"] },
          { name: "Ukhia", nameBn: "উখিয়া", unions: ["Haldia Palong", "Jalia Palong", "Palong Khali", "Rajnapalong", "Rajnapalong Bazar", "Ramu"] },
          { name: "Ramu", nameBn: "রামু", unions: ["Chakmarkul", "Dakkhin Mithachhari", "Fatekharkul", "Garjania", "Idghar", "Jourianatoli", "Kachhapia", "Rashidnagar"] },
          { name: "Chakaria", nameBn: "চকোরিয়া", unions: ["Baraitali", "Bheola Manikchar", "Chiringa", "Dulahazara", "Fashiakhali", "Harbang", "Kakara", "Konakhali", "Lakharchar", "Matamuhuri"] },
        ],
      },
      {
        name: "Cumilla",
        nameBn: "কুমিল্লা",
        upazilas: [
          { name: "Cumilla Adarsha Sadar", nameBn: "কুমিল্লা আদর্শ সদর", unions: ["Amratali", "Durgapur North", "Durgapur South", "Jagannathpur", "Kalirbazar", "Kandirpar", "Kotwali", "Mogbari", "Panchthubi"] },
          { name: "Cumilla Sadar Dakshin", nameBn: "কুমিল্লা সদর দক্ষিণ", unions: ["Bagmara", "Barapara", "Belghar", "Bijoypur", "Bholain", "Chouara", "Ghilatoli", "Perul"] },
          { name: "Daudkandi", nameBn: "দাউদকান্দি", unions: ["Baragojaria", "Bara Kandi", "Daulatpur", "Eliotganj", "Gouripur", "Jagatpur", "Maruka", "Mohammadpur", "Panchgachhia", "Sundalpur"] },
          { name: "Chandina", nameBn: "চান্দিনা", unions: ["Barkait", "Bataghasia", "Dollai Nawabpur", "Gojaria", "Kerankhal", "Madhaiya", "Maijkhar", "Suhilpur"] },
          { name: "Debidwar", nameBn: "দেবিদ্বার", unions: ["Barkamta", "Balla", "Chamiachara", "Dakshin Gunaighar", "Fatehpur", "Jafarganj", "Mohonpur", "Rasulpur", "Subil", "Yousufpur"] },
          { name: "Burichang", nameBn: "বুড়িচং", unions: ["Bakshimul", "Burichang Sadar", "Mainamati", "Mokam", "Pirjatrapur", "Rajapur", "Sholanal", "Varalpur"] },
          { name: "Brahmanpara", nameBn: "ব্রাহ্মণপাড়া", unions: ["Brahmanpara Sadar", "Chandla", "Dulalpur", "Madhabpur", "Malapara", "Sahebabad", "Shashidal", "Sidhai"] },
          { name: "Laksam", nameBn: "লাকসাম", unions: ["Bakoi", "Gobindapur", "Kandirpar", "Laksam Pourashava", "Mudafarganj", "Uttarda"] },
        ],
      },
      {
        name: "Brahmanbaria",
        nameBn: "ব্রাহ্মণবাড়িয়া",
        upazilas: [
          { name: "Brahmanbaria Sadar", nameBn: "ব্রাহ্মণবাড়িয়া সদর", unions: ["Basudeb", "Budhhil", "Majlishpur", "Natai North", "Natai South", "Padmapur", "Ramrail", "Sadekpur", "Suhilpur", "Talshahar East"] },
          { name: "Ashuganj", nameBn: "আশুগঞ্জ", unions: ["Araisidha", "Ashuganj Sadar", "Char Chartala", "Durgapur", "Lalpur", "Sharifpur", "Tarua"] },
          { name: "Kasba", nameBn: "কসবা", unions: ["Badhair", "Bayek", "Gopinathpur", "Kasba Pourashava", "Kayempur", "Kharera", "Kuti", "Mehari", "Mulagram"] },
          { name: "Nabinagar", nameBn: "নবীনগর", unions: ["Barail", "Bitghar", "Baraikandi", "Chalitachara", "Ibrahimpur", "Jinodpur", "Kaitala", "Laur Fatehpur", "Nabinagar Sadar", "Rasullabad", "Salimganj", "Shibpur"] },
        ],
      },
      {
        name: "Feni",
        nameBn: "ফেনী",
        upazilas: [
          { name: "Feni Sadar", nameBn: "ফেনী সদর", unions: ["Baligaon", "Barahipur", "Dholia", "Fazilpur", "Forhadnagar", "Kalidah", "Kazirbagh", "Lemua", "Matobi", "Panchgachhia", "Sanua", "Sharshadi"] },
          { name: "Daganbhuiyan", nameBn: "দাগনভূঞা", unions: ["Daganbhuiyan Sadar", "Jayloskor", "Matubhuiyan", "Purba Chandrapur", "Rajapur", "Ramonagar", "Sindurpur", "Yakubpur"] },
          { name: "Chhagalnaiya", nameBn: "ছাগলনাইয়া", unions: ["Chhagalnaiya Pourashava", "Gopal", "Mahamaya", "Pathannagar", "Radhanagar", "Rajnagar", "Shuvapur"] },
        ],
      },
      {
        name: "Noakhali",
        nameBn: "নোয়াখালী",
        upazilas: [
          { name: "Noakhali Sadar", nameBn: "নোয়াখালী সদর", unions: ["Aojbalia", "Ashwadia", "Binodpur", "Dadpur", "Dakkhin Dharmapur", "Dharmapur", "Eojbalia", "Kadirhanif", "Kaladaraf", "Neajpur", "Noannoi", "Underchar"] },
          { name: "Begumganj", nameBn: "বেগমগঞ্জ", unions: ["Amanullapur", "Chayani", "Durgapur", "Eklashpur", "Gopalpur", "Hazipur", "Jirabali", "Kadirpur", "Mirwarishpur", "Narottampur", "Rajaganj", "Rasulpur"] },
          { name: "Senbagh", nameBn: "সেনবাগ", unions: ["Arjuntala", "Barachatla", "Chhatarpaia", "Dumuria", "Kabilpur", "Kadra", "Kesharpar", "Mohammadpur", "Nabiabad", "Senbagh Pourashava"] },
          { name: "Companiganj", nameBn: "কোম্পানীগঞ্জ", unions: ["Basurhat", "Char Elahi", "Char Fakira", "Char Hazari", "Char Kakra", "Char Parboti", "Musapur", "Rampur", "Sirajpur"] },
        ],
      },
    ],
  },
  {
    name: "Rajshahi",
    nameBn: "রাজশাহী",
    districts: [
      {
        name: "Rajshahi",
        nameBn: "রাজশাহী",
        upazilas: [
          { name: "Boalia", nameBn: "বোয়ালিয়া", unions: ["Saheb Bazar", "Alupatty", "Ghoramara", "Rani Bazar", "Shiroil", "Kazihata"] },
          { name: "Motihar", nameBn: "মতিহার", unions: ["RU Campus", "Binodpur", "Meherchandi", "Kajla", "Budhpara"] },
          { name: "Rajpara", nameBn: "রাজপাড়া", unions: ["Court Station", "Laxmipur", "Bhadra", "Terokhadia", "Keshabpur"] },
          { name: "Paba", nameBn: "পবা", unions: ["Damkur", "Darshanpara", "Harian", "Huzuripara", "Katakhali", "Parila", "Nowhata"] },
          { name: "Godagari", nameBn: "গোদাগাড়ী", unions: ["Basudevpur", "Char Asariadaha", "Deopara", "Gogram", "Godagari Pourashava", "Matikata", "Mohonpur", "Pakri", "Rishikul"] },
          { name: "Bagmara", nameBn: "বাগমারা", unions: ["Basupara", "Bhabaniganj", "Dippur", "Ganinagar", "Gobindapara", "Hamirkutsa", "Jhupara", "Kacharikoalpara", "Nordas", "Sonadanga", "Taherpur", "Yogipara"] },
        ],
      },
      {
        name: "Bogura",
        nameBn: "বগুড়া",
        upazilas: [
          { name: "Bogura Sadar", nameBn: "বগুড়া সদর", unions: ["Chowdhury Bazar", "Namazgarh", "Baropur", "Fapore", "Gokul", "Lahiri Para", "Namuja", "Nishindara", "Noongola", "Rajapur", "Sekherkola", "Shabgram"] },
          { name: "Sherpur", nameBn: "শেরপুর", unions: ["Bhabanipur", "Garidaha", "Khamarkandi", "Kusumbi", "Mirzapur", "Ranirhat", "Sherpur Pourashava", "Suwagari", "Simabari", "Uzirpur", "Vobanipur"] },
          { name: "Shajahanpur", nameBn: "শাজাহানপুর", unions: ["Amrool", "Ariadaha", "Ashekpur", "Chopanagar", "Gohail", "Kharua", "Madla", "Majhira", "Shajahanpur Sadar"] },
          { name: "Gabtali", nameBn: "গাবতলী", unions: ["Baluail", "Durgahata", "Gabtali Sadar", "Ichhamati", "Kagail", "Naruamala", "Nasirpur", "Rameswarpur", "Sonatola", "Sukhanpukur", "Tarafsartaj"] },
          { name: "Shibganj", nameBn: "শিবগঞ্জ", unions: ["Atmul", "Bihari", "Buriganj", "Deoli", "Kichak", "Maidanhatta", "Mokamtola", "Pirab", "Raynagar", "Saidpur", "Shibganj Sadar"] },
        ],
      },
      {
        name: "Pabna",
        nameBn: "পাবনা",
        upazilas: [
          { name: "Pabna Sadar", nameBn: "পাবনা সদর", unions: ["Atgharia", "Bharara", "Char Tarapur", "Dapunia", "Dogachhi", "Gayeshpur", "Hemayetpur", "Maligachha", "Pabna Pourashava", "Sadullahpur"] },
          { name: "Ishwardi", nameBn: "ঈশ্বরদী", unions: ["Dashuria", "Ishwardi Pourashava", "Lakshimikunda", "Muladuli", "Paksey", "Ruppur", "Sahapur", "Silimpur"] },
          { name: "Santhia", nameBn: "সাঁথিয়া", unions: ["Afra", "Ataikula", "Bara Gram", "Dhulauri", "Gourigram", "Karimpur", "Kashinathpur", "Khetupara", "Nandanpur", "Rampur", "Santhia Pourashava"] },
        ],
      },
      {
        name: "Sirajganj",
        nameBn: "সিরাজগঞ্জ",
        upazilas: [
          { name: "Sirajganj Sadar", nameBn: "সিরাজগঞ্জ সদর", unions: ["Bagbati", "Bahuka", "Chhongachha", "Kalia Haripur", "Khokshabari", "Mechhra", "Ratanpur", "Saydabad", "Sirajganj Pourashava", "Soydabad"] },
          { name: "Shahjadpur", nameBn: "শাহজাদপুর", unions: ["Beltail", "Garah", "Habibpur", "Jalalpur", "Kayempur", "Khukni", "Nandina", "Porjana", "Potajia", "Rupbati", "Sonatoni"] },
          { name: "Ullapara", nameBn: "উল্লাপাড়া", unions: ["Bangala", "Barahar", "Bara Pangashi", "Durgapur", "Hatkumrul", "Mohonpur", "Panchakroshi", "Purnimaganti", "Salap", "Ullapara Pourashava", "Ullapara Sadar"] },
        ],
      },
    ],
  },
  {
    name: "Khulna",
    nameBn: "খুলনা",
    districts: [
      {
        name: "Khulna",
        nameBn: "খুলনা",
        upazilas: [
          { name: "Khulna Sadar", nameBn: "খুলনা সদর", unions: ["Dakbangla", "Boyra", "Khalishpur", "Daulatpur", "Sonadanga", "Rupsha Ferry Ghat", "Nirala", "Gollamari"] },
          { name: "Sonadanga", nameBn: "সোনাডাঙ্গা", unions: ["Sonadanga Bus Stand", "Mujgunni", "Choto Boyra", "Boyra Main Road", "KDA Avenue"] },
          { name: "Khalishpur", nameBn: "খালিশপুর", unions: ["Khalishpur I/A", "BIDC Road", "Chitrali", "Goalpara", "Peoples Gate"] },
          { name: "Rupsha", nameBn: "রূপসা", unions: ["Aichgati", "Ghatbhog", "Naihati", "Rupsha Sadar", "Sreefaltola", "Tilok"] },
          { name: "Dumuria", nameBn: "ডুমুরিয়া", unions: ["Atlia", "Bhandarpara", "Dhamalia", "Dumuria Sadar", "Gutudia", "Kharia", "Magurkhali", "Rangpur", "Raghunathpur", "Rudraghona", "Sahosh", "Sobhana"] },
        ],
      },
      {
        name: "Jashore",
        nameBn: "যশোর",
        upazilas: [
          { name: "Jashore Sadar", nameBn: "যশোর সদর", unions: ["Basundia", "Chanchra", "Chowgachha", "Deyara", "Fatehpur", "Haibatpur", "Ichhali", "Kashimpur", "Kashobpur", "Narendrapur", "Nawapara", "Rajarhat", "Upashahar"] },
          { name: "Jhikargachha", nameBn: "ঝিকরগাছা", unions: ["Bankra", "Gadkhali", "Ganganandapur", "Hajirbagh", "Jhikargachha Sadar", "Magura", "Nabharan", "Panisara", "Sankarpur", "Shimulia"] },
          { name: "Sharsha", nameBn: "শার্শা", unions: ["Benapole", "Benapole Port", "Bagachra", "Bahadurpur", "Dihi", "Goga", "Kayba", "Lakshmanpur", "Nizampur", "Sharsha Sadar", "Ulashi"] },
        ],
      },
      {
        name: "Kushtia",
        nameBn: "কুষ্টিয়া",
        upazilas: [
          { name: "Kushtia Sadar", nameBn: "কুষ্টিয়া সদর", unions: ["Alampur", "Barakhada", "Battail", "Harinakundu", "Harinarayanpur", "Jhaudia", "Kushtia Pourashava", "Monohardia", "Piarpur", "Ujangram"] },
          { name: "Kumarkhali", nameBn: "কুমারখালী", unions: ["Bagulat", "Chandur", "Chapra", "Char Sadipur", "Jodunathpur", "Kumarkhali Pourashava", "Nandanalalpur", "Panti", "Sadaki", "Shelaidaha"] },
          { name: "Bheramara", nameBn: "ভেড়ামারা", unions: ["Bahirchar", "Bheramara Pourashava", "Baraikandi", "Chandgram", "Dharampur", "Junadah", "Mokarimpur"] },
        ],
      },
    ],
  },
  {
    name: "Barishal",
    nameBn: "বরিশাল",
    districts: [
      {
        name: "Barishal",
        nameBn: "বরিশাল",
        upazilas: [
          { name: "Barishal Sadar", nameBn: "বরিশাল সদর", unions: ["Band Road", "Natun Bazar", "Rupatali", "Kawnia", "Amtala", "Chandpura", "Char Baria", "Char Kawa", "Char Monai", "Jagua", "Kashipur", "Raypasha Karapur", "Shayestabad", "Tungibaria"] },
          { name: "Bakerganj", nameBn: "বাকেরগঞ্জ", unions: ["Bara Pasha", "Char Amaddi", "Darial", "Durgapur", "Faridpur", "Garuria", "Kabai", "Kakonkathi", "Nalchity", "Padmabati", "Rongoshree"] },
          { name: "Babuganj", nameBn: "বাবুগঞ্জ", unions: ["Chandpasha", "Dehergati", "Kedarpur", "Madhabpasha", "Rahmatpur", "Sulak"] },
        ],
      },
      {
        name: "Patuakhali",
        nameBn: "পটুয়াখালী",
        upazilas: [
          { name: "Patuakhali Sadar", nameBn: "পটুয়াখালী সদর", unions: ["Auliapur", "Badarpur", "Chowdhury Bazar", "Itbaria", "Kalikapur", "Kamalapur", "Lauhati", "Madarbunia", "Marichbunia", "Patuakhali Pourashava"] },
          { name: "Kalapara", nameBn: "কলাপাড়া", unions: ["Chakamaiya", "Dhankhali", "Kuakata", "Lalua", "Mahipur", "Mithaganj", "Nilganj", "Tiakhali"] },
        ],
      },
    ],
  },
  {
    name: "Sylhet",
    nameBn: "সিলেট",
    districts: [
      {
        name: "Sylhet",
        nameBn: "সিলেট",
        upazilas: [
          { name: "Sylhet Sadar", nameBn: "সিলেট সদর", unions: ["Zinda Bazar", "Amberkhana", "Bandar Bazar", "Shibganj", "Upashahar", "Tilagarh", "Khadimnagar", "Khadimpara", "Tukerbazar", "Mogla Bazar", "Jalalabad"] },
          { name: "Beanibazar", nameBn: "বিয়ানীবাজার", unions: ["Alinagar", "Beanibazar Pourashava", "Charkhai", "Dubag", "Kurar Bazar", "Mollahapur", "Muraroi", "Sheola", "Tilpara"] },
          { name: "Golapganj", nameBn: "গোলাপগঞ্জ", unions: ["Amura", "Badepasha", "Bhadeshwar", "Budhbaribazar", "Dhaka Dakhin", "Golapganj Pourashava", "Lakshanaband", "Sharifganj"] },
        ],
      },
      {
        name: "Moulvibazar",
        nameBn: "মৌলভীবাজার",
        upazilas: [
          { name: "Moulvibazar Sadar", nameBn: "মৌলভীবাজার সদর", unions: ["Akhailkura", "Amtail", "Chandnighat", "Ekatuna", "Giasnagar", "Kamalpur", "Kholilpur", "Manumukh", "Moulvibazar Pourashava", "Nazirabad"] },
          { name: "Sreemangal", nameBn: "শ্রীমঙ্গল", unions: ["Ashidron", "Bhunabir", "Kalapur", "Kalighat", "Mirzapur", "Rajghat", "Satgaon", "Sindurkhan", "Sreemangal Pourashava"] },
        ],
      },
      {
        name: "Habiganj",
        nameBn: "হবিগঞ্জ",
        upazilas: [
          { name: "Habiganj Sadar", nameBn: "হবিগঞ্জ সদর", unions: ["Gopaya", "Habiganj Pourashava", "Lakhai", "Lokhra", "Nurpur", "Poinda", "Richi", "Sayestanagar", "Tegharia"] },
          { name: "Madhabpur", nameBn: "মাধবপুর", unions: ["Adaoir", "Baghachara", "Bahuamala", "Choumohani", "Dharmaghar", "Jagadishpur", "Madhabpur Pourashava", "Shahjahanpur"] },
        ],
      },
    ],
  },
  {
    name: "Rangpur",
    nameBn: "রংপুর",
    districts: [
      {
        name: "Rangpur",
        nameBn: "রংপুর",
        upazilas: [
          { name: "Rangpur Sadar", nameBn: "রংপুর সদর", unions: ["Jahaj Company Mor", "Dhap", "Kachari Bazar", "Modern Mor", "Pairaband", "Haridebpur", "Mominpur", "Rajendrapur", "Sreerampur", "Tamphat"] },
          { name: "Mithapukur", nameBn: "মিঠাপুকুর", unions: ["Balua Masimpur", "Bara Hazratpur", "Bara Bala", "Chengmari", "Durgapur", "Gopalpur", "Kafrikhal", "Latifpur", "Milor", "Mithapukur Sadar", "Pairaband", "Ranipukur"] },
          { name: "Pirganj", nameBn: "পীরগঞ্জ", unions: ["Baradargah", "Chaitrakol", "Kabirpur", "Madanpur", "Pirganj Pourashava", "Pirganj Sadar", "Roypur", "Shanirhat", "Tukuria"] },
        ],
      },
      {
        name: "Dinajpur",
        nameBn: "দিনাজপুর",
        upazilas: [
          { name: "Dinajpur Sadar", nameBn: "দিনাজপুর সদর", unions: ["Askerpur", "Chehelgazi", "Dinajpur Pourashava", "Fazilpur", "Kamalpur", "Pulhat", "Sankarpur", "Sashtitala", "Sundarban", "Uthrail"] },
          { name: "Birganj", nameBn: "বীরগঞ্জ", unions: ["Bhogdori", "Birganj Pourashava", "Golabari", "Kahanol", "Mohanpur", "Moricha", "Nizpara", "Palashbari", "Satkhamar", "Shatagram", "Suakuri"] },
        ],
      },
    ],
  },
  {
    name: "Mymensingh",
    nameBn: "ময়মনসিংহ",
    districts: [
      {
        name: "Mymensingh",
        nameBn: "ময়মনসিংহ",
        upazilas: [
          { name: "Mymensingh Sadar", nameBn: "ময়মনসিংহ সদর", unions: ["Ganginarpar", "Chhoto Bazar", "Bara Bazar", "Town Hall", "Char Ishwardia", "Char Nilakshia", "Dapunia", "Khagdahar", "Kushtia", "Paranganj", "Sirta"] },
          { name: "Muktagachha", nameBn: "মুক্তাগাছা", unions: ["Basati", "Dapunia", "Ghaghar", "Kashimpur", "Kheruajani", "Kumarghat", "Maniknagar", "Muktagachha Pourashava", "Tarati"] },
          { name: "Trishal", nameBn: "ত্রিশাল", unions: ["Amirabari", "Bailor", "Dhanikhola", "Harirampur", "Kanihari", "Kathal", "Mothbari", "Rampur", "Sakhua", "Trishal Pourashava", "Trishal Sadar"] },
          { name: "Bhaluka", nameBn: "ভালুকা", unions: ["Birunia", "Bhaluka Sadar", "Dhitpur", "Habirbari", "Kachina", "Mallikbari", "Meduar", "Rajoi", "Uthura"] },
        ],
      },
      {
        name: "Jamalpur",
        nameBn: "জামালপুর",
        upazilas: [
          { name: "Jamalpur Sadar", nameBn: "জামালপুর সদর", unions: ["Banshchara", "Digpaith", "Ghoradhap", "Itail", "Jamalpur Pourashava", "Kendua", "Lakshmirchar", "Meshra", "Nandina", "Narundi", "Ranagachha", "Sharifpur", "Titpalla"] },
          { name: "Sarishabari", nameBn: "সরিষাবাড়ী", unions: ["Aona", "Bhatara", "Doail", "Kamrabad", "Mahadan", "Pingna", "Pogaldigha", "Sarishabari Pourashava"] },
        ],
      },
    ],
  },
];

// Helper functions for Cascading Dropdowns
export function getDivisions(): Array<{ name: string; nameBn: string }> {
  return BD_GEO_DATA.map((d) => ({ name: d.name, nameBn: d.nameBn }));
}

export function getDistrictsByDivision(divisionName?: string): Array<{ name: string; nameBn: string }> {
  if (!divisionName) return [];
  const div = BD_GEO_DATA.find(
    (d) => d.name.toLowerCase() === divisionName.toLowerCase() || d.nameBn === divisionName
  );
  if (!div) return [];
  return div.districts.map((d) => ({ name: d.name, nameBn: d.nameBn }));
}

export function getUpazilasByDistrict(districtName?: string): Array<{ name: string; nameBn: string; unions?: string[] }> {
  if (!districtName) return [];
  for (const div of BD_GEO_DATA) {
    const dist = div.districts.find(
      (d) => d.name.toLowerCase() === districtName.toLowerCase() || d.nameBn === districtName
    );
    if (dist) {
      return dist.upazilas.map((u) => ({ name: u.name, nameBn: u.nameBn, unions: u.unions }));
    }
  }
  return [];
}

export function getUnionsByUpazila(districtName?: string, upazilaName?: string): string[] {
  if (!upazilaName) return [];
  const upazilas = getUpazilasByDistrict(districtName);
  const up = upazilas.find(
    (u) => u.name.toLowerCase() === upazilaName.toLowerCase() || u.nameBn === upazilaName
  );
  return up?.unions || [];
}

/**
 * Builds a standardized, SteadFast-ready clean delivery address
 * e.g. "House 12, Road 4, Sector 7, Uttara, Dhaka, Dhaka Division"
 */
export function buildSteadfastAddress(params: {
  division?: string;
  district?: string;
  upazila?: string;
  union?: string;
  addressDetails?: string;
}): string {
  const parts: string[] = [];

  if (params.addressDetails?.trim()) {
    parts.push(params.addressDetails.trim());
  }
  if (params.union?.trim()) {
    parts.push(params.union.trim());
  }
  if (params.upazila?.trim()) {
    parts.push(params.upazila.trim());
  }
  if (params.district?.trim()) {
    parts.push(params.district.trim());
  }
  if (params.division?.trim() && params.division.toLowerCase() !== params.district?.toLowerCase()) {
    parts.push(`${params.division.trim()} Division`);
  }

  return parts.filter(Boolean).join(", ");
}
