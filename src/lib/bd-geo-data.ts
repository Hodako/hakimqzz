// Comprehensive Bangladesh Geographic Dataset: All 8 Divisions, All 64 Districts, Upazilas/Thanas, Unions/Areas
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
  // ── 1. DHAKA DIVISION (13 Districts) ───────────────────────────────────────
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
          { name: "Sakhipur", nameBn: "সখিপুর", unions: ["Bohuria", "Gojaria", "Hatibandha", "Kakua", "Kalia", "Jadobpur"] },
          { name: "Bhuapur", nameBn: "ভূঞাপুর", unions: ["Aloa", "Arjuna", "Falda", "Gabhani", "Gobindasi", "Nikrail"] },
          { name: "Delduar", nameBn: "দেলদুয়ার", unions: ["Atia", "Deoli", "Elasin", "Fazilhati", "Lauhati", "Pathrail"] },
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
          { name: "Sadarpur", nameBn: "সদরপুর", unions: ["Bhasanchar", "Char Bishnupur", "Char Manair", "Dheukhali", "Sadarpur Sadar"] },
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
          { name: "Ghior", nameBn: "ঘিওর", unions: ["Baniachuri", "Balia Khora", "Ghior Sadar", "Nali", "Poyla", "Singjuri"] },
          { name: "Harirampur", nameBn: "হরিরামপুর", unions: ["Azimpur", "Balla", "Boyra", "Chala", "Dhulsunda", "Gopinathpur"] },
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
          { name: "Katiadi", nameBn: "কটিয়াদী", unions: ["Achita", "Chandpur", "Jalalpur", "Katiadi Sadar", "Lohajuri", "Masua", "Mumurdia"] },
          { name: "Pakundia", nameBn: "পাকুন্দিয়া", unions: ["Burudia", "Chandipara", "Charfaradi", "Egarosindur", "Hosendi", "Jangalia", "Pakundia Sadar"] },
          { name: "Kuliarchar", nameBn: "কুলিয়ারচর", unions: ["Chhaysuti", "Gobaria Abdullahpur", "Kuliarchar Sadar", "Ramdi", "Salua"] },
        ],
      },
      {
        name: "Gopalganj",
        nameBn: "গোপালগঞ্জ",
        upazilas: [
          { name: "Gopalganj Sadar", nameBn: "গোপালগঞ্জ সদর", unions: ["Barafa", "Boultali", "Gopinathpur", "Haridaspur", "Jalalabad", "Karpara", "Latifpur", "Raghunathpur", "Sahapur"] },
          { name: "Kashiani", nameBn: "কাশিয়ানী", unions: ["Bethuri", "Hatiara", "Kashiani Sadar", "Maheshpur", "Nizampur", "Orakandi", "Parulia", "Ratoil", "Singa"] },
          { name: "Kotalipara", nameBn: "কোটালীপাড়া", unions: ["Amratali", "Bandhabari", "Ghaghar", "Hiran", "Kandi", "Kushla", "Pinjuri", "Radhaganj", "Sadullapur"] },
          { name: "Muksudpur", nameBn: "মুকসুদপুর", unions: ["Bahugram", "Banshbaria", "Batikamari", "Digsagar", "Gohala", "Kasalia", "Khandarpara", "Mochhra", "Nanikhir", "Raghdi"] },
          { name: "Tungipara", nameBn: "টুঙ্গিপাড়া", unions: ["Baladanga", "Barni", "Dumuria", "Gopalpur", "Kushli", "Patgati", "Tungipara Pourashava"] },
        ],
      },
      {
        name: "Madaripur",
        nameBn: "মাদারীপুর",
        upazilas: [
          { name: "Madaripur Sadar", nameBn: "মাদারীপুর সদর", unions: ["Bahadurpur", "Chikandi", "Dhopabari", "Jhaudi", "Kendua", "Khoajpur", "Mustafapur", "Panchkhola", "Rasti", "Sirkhala"] },
          { name: "Kalkini", nameBn: "কালকিনি", unions: ["Alinagar", "Bhurghata", "Dasherhat", "Enayetnagar", "Gopalpur", "Kunderchar", "Lakshmipur", "Sahebrampur", "Shikarmangol"] },
          { name: "Rajoir", nameBn: "রাজৈর", unions: ["Amgram", "Badarpasha", "Bajitpur", "Haridaspur", "Hoglabari", "Isibpur", "Kabirajpur", "Kadambari", "Khalia", "Paikpara"] },
          { name: "Shibchar", nameBn: "শিবচর", unions: ["Bandarkhola", "Baheratala", "Char Janajat", "Dattapara", "Kadirpur", "Madbarerchar", "Nilokhi", "Panchchar", "Sannyasirchar", "Umedpur"] },
        ],
      },
      {
        name: "Rajbari",
        nameBn: "রাজবাড়ী",
        upazilas: [
          { name: "Rajbari Sadar", nameBn: "রাজবাড়ী সদর", unions: ["Aliabad", "Aladipur", "Banibaha", "Barat", "Chandani", "Dadshi", "Khankhanapur", "Mulghar", "Panchuria", "Ramkantapur", "Shahidwahab"] },
          { name: "Goalando", nameBn: "গোয়ালন্দ", unions: ["Choto Bhakla", "Debagram", "Daulatdia", "Ujanchar"] },
          { name: "Pangsha", nameBn: "পাংশা", unions: ["Bahadurpur", "Babupara", "Habashpur", "Jasai", "Kasba Majhail", "Machpara", "Mourat", "Patta", "Sarisla"] },
          { name: "Baliakandi", nameBn: "বালিয়াকান্দি", unions: ["Baharpur", "Baliakandi Sadar", "Islampur", "Jamalpur", "Jangal", "Nawabpur", "Naria"] },
          { name: "Kalukhali", nameBn: "কালুখালী", unions: ["Boalia", "Kalikapur", "Madapur", "Majhbari", "Mrigi", "Ratandia", "Saoria"] },
        ],
      },
      {
        name: "Shariatpur",
        nameBn: "শরীয়তপুর",
        upazilas: [
          { name: "Shariatpur Sadar", nameBn: "শরীয়তপুর সদর", unions: ["Angaria", "Binodpur", "Chikandi", "Domsar", "Fatehabad", "Mahmudpur", "Palong", "Rudrakar", "Shariatpur Pourashava", "Tulsirchar"] },
          { name: "Naria", nameBn: "নড়িয়া", unions: ["Bhojeswar", "Bijoynagar", "Chamta", "Dingamanik", "Fatehjongpur", "Gharisar", "Jadabpur", "Kedarpur", "Muktars Char", "Nasashan"] },
          { name: "Zanjira", nameBn: "জাজিরা", unions: ["Baher Cher", "Barakandi", "Bilaspur", "Joynagar", "Kandail", "Kunderchar", "Mulna", "Palerchar", "Senerchar", "Zanjira Sadar"] },
          { name: "Bhedarganj", nameBn: "ভেদরগঞ্জ", unions: ["Chhoygaon", "Dakkhin Tarabunia", "Digambarirhat", "Kachikata", "Mahishakhali", "Narayanpur", "Rambhadrapur", "Senerchar"] },
          { name: "Damudya", nameBn: "ডামুড্যা", unions: ["Baneshwardi", "Damudya Pourashava", "Darul Aman", "Dhanmondi", "Islamabad", "Kaneshwardi", "Sidholkura"] },
          { name: "Gosairhat", nameBn: "গোসাইরহাট", unions: ["Alaolpur", "Garkandi", "Gosairhat Sadar", "Idilpur", "Kodaldhoa", "Nalmuri", "Samantasher"] },
        ],
      },
    ],
  },

  // ── 2. CHATTOGRAM DIVISION (11 Districts) ──────────────────────────────────
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
          { name: "Fatikchhari", nameBn: "ফটিকছড়ি", unions: ["Baganbazar", "Bhujpur", "Dharmapur", "Harualchhari", "Kanchannagar", "Nanupur", "Paindong", "Roshangiri"] },
          { name: "Chandanaish", nameBn: "চন্দনাইশ", unions: ["Bailtali", "Barama", "Barkol", "Dhopachhari", "Hashimpur", "Joara", "Kanchannagar"] },
          { name: "Lohagara", nameBn: "লোহাগাড়া", unions: ["Adhunagar", "Amirabad", "Barahatia", "Charamba", "Chunati", "Kalaojan", "Padua", "Putibila"] },
          { name: "Satkania", nameBn: "সাতকানিয়া", unions: ["Bazalia", "Charati", "Dhemsa", "Eochia", "Kaliaish", "Keochia", "Madarsha", "Nalbona", "Sonakania"] },
          { name: "Sandwip", nameBn: "সন্দ্বীপ", unions: ["Amanullah", "Bauria", "Gachhua", "Haramia", "Harispur", "Kalapania", "Maitbhang", "Rahmatpur", "Sarikait"] },
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
          { name: "Pekua", nameBn: "পেকুয়া", unions: ["Barabakia", "Magnama", "Pekua Sadar", "Rajakhali", "Shilkhali", "Tetoilya", "Ujantia"] },
          { name: "Kutubdia", nameBn: "কুতুবদিয়া", unions: ["Ali Akbar Deil", "Baraghop", "Dakshin Dhurung", "Kaiyarbil", "Lemsikhali", "Uttar Dhurung"] },
          { name: "Maheshkhali", nameBn: "মহেশখালী", unions: ["Baramaheshkhali", "Chhotamoheshkhali", "Dhalghata", "Gorakghata", "Hoanak", "Kutubjom", "Matarbari", "Shaplapur"] },
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
          { name: "Homna", nameBn: "হোমনা", unions: ["Asadpur", "Chanderchar", "Dulalpur", "Ghagutia", "Homna Sadar", "Joypur", "Nilakhi"] },
          { name: "Muradnagar", nameBn: "মুরাদনগর", unions: ["Akubpur", "Andikot", "Babuti Para", "Chapitala", "Darora", "Dhamghar", "Jahapur", "Muradnagar Sadar", "Paharpur", "Ramchandrapur"] },
          { name: "Barura", nameBn: "বরুড়া", unions: ["Adda", "Aganagar", "Bhabanipur", "Chagalnaiya", "Galimpur", "Jailgaon", "Laxmipur", "Payalgachha", "Shilmuri"] },
          { name: "Chauddagram", nameBn: "চৌদ্দগ্রাম", unions: ["Alkara", "Batisa", "Cheora", "Chirora", "Ghunabati", "Jagannathdighi", "Kashinagar", "Munshirhat", "Shuvadpur"] },
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
          { name: "Sarail", nameBn: "সরাইল", unions: ["Auraol", "Chunta", "Kalikachha", "Noagaon", "Panishwar", "Sarail Sadar", "Shahbazpur", "Shahjadapur"] },
          { name: "Akhaura", nameBn: "আখাউড়া", unions: ["Akhaura North", "Akhaura South", "Mogra", "Moniand"] },
          { name: "Nasirnagar", nameBn: "নাসিরনগর", unions: ["Bhatpara", "Burishwar", "Chapartala", "Chatalpar", "Dharmanagar", "Fandauk", "Gokarna", "Haripur", "Nasirnagar Sadar"] },
        ],
      },
      {
        name: "Chandpur",
        nameBn: "চাঁদপুর",
        upazilas: [
          { name: "Chandpur Sadar", nameBn: "চাঁদপুর সদর", unions: ["Ashikati", "Baghadi", "Balyathali", "Chandra", "Ibrahimpur", "Kalyanpur", "Maishadi", "Rampur", "Sreeramdi", "Taras"] },
          { name: "Hajiganj", nameBn: "হাজীগঞ্জ", unions: ["Baraakul", "Barkal", "Gandharbapur", "Hajiganj Pourashava", "Hajiganj Sadar", "Hatimila", "Kalocho", "Rajarhat"] },
          { name: "Matlab South", nameBn: "মতলব দক্ষিণ", unions: ["Dakkhin Upadi", "Khadergaon", "Matlab Pourashava", "Nayergaon", "Uttar Upadi"] },
          { name: "Matlab North", nameBn: "মতলব উত্তর", unions: ["Baganbari", "Durgapur", "Eklaspur", "Farajikandi", "Islamabad", "Kalakanda", "Mohonpur", "Satnal", "Sultanabad"] },
          { name: "Faridganj", nameBn: "ফরিদগঞ্জ", unions: ["Baluthupa", "Char Dukhia", "Faridganj Pourashava", "Gobindapur", "Gupty", "Paikpara", "Rupsha", "Subidpur"] },
          { name: "Shahrasti", nameBn: "শাহরাস্তি", unions: ["Chitoshi", "Meher", "Raysree", "Suchipara", "Tamta", "Waruk"] },
          { name: "Kachua", nameBn: "কচুয়া", unions: ["Ashrafpur", "Bitara", "Kachua Sadar", "Kadirkhil", "Palakhal", "Pathair", "Rahmatganj", "Sahadebpur"] },
          { name: "Haimchar", nameBn: "হাইমচর", unions: ["Algi Durgapur", "Char Bhairabi", "Gazipur", "Haimchar Sadar", "Nilkamal"] },
        ],
      },
      {
        name: "Feni",
        nameBn: "ফেনী",
        upazilas: [
          { name: "Feni Sadar", nameBn: "ফেনী সদর", unions: ["Baligaon", "Barahipur", "Dholia", "Fazilpur", "Forhadnagar", "Kalidah", "Kazirbagh", "Lemua", "Matobi", "Panchgachhia", "Sanua", "Sharshadi"] },
          { name: "Daganbhuiyan", nameBn: "দাগনভূঞা", unions: ["Daganbhuiyan Sadar", "Jayloskor", "Matubhuiyan", "Purba Chandrapur", "Rajapur", "Ramonagar", "Sindurpur", "Yakubpur"] },
          { name: "Chhagalnaiya", nameBn: "ছাগলনাইয়া", unions: ["Chhagalnaiya Pourashava", "Gopal", "Mahamaya", "Pathannagar", "Radhanagar", "Rajnagar", "Shuvapur"] },
          { name: "Sonagazi", nameBn: "সোনাগাজী", unions: ["Amirabad", "Bagadana", "Char Chandia", "Char Darbesh", "Char Majlishpur", "Mangalkandi", "Matiganj", "Nabagram", "Sonagazi Sadar"] },
          { name: "Parshuram", nameBn: "পরশুরাম", unions: ["Boxmahud", "Chitholia", "Mirzanagar", "Parshuram Pourashava"] },
          { name: "Fulgazi", nameBn: "ফুলগাজী", unions: ["Amdarhat", "Anandapur", "Darbarpur", "Fulgazi Sadar", "Gozaria", "Munshirhat"] },
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
          { name: "Chatkhil", nameBn: "চাটখিল", unions: ["Badalkot", "Chatkhil Pourashava", "Hatpukuria", "Khilpara", "Mohammadpur", "Noakhala", "Panchgaon", "Ramnarayanpur", "Sahapur"] },
          { name: "Hatiya", nameBn: "হাতিয়া", unions: ["Burirchar", "Charki", "Harni", "Jahajmara", "Nijhum Dwip", "Sonadia", "Sukchar", "Tamaraddi"] },
          { name: "Subarnachar", nameBn: "সুবর্ণচর", unions: ["Char Amanullah", "Char Bata", "Char Clark", "Char Jabbar", "Char Jubilee", "Char Nangulia", "Char Wahed"] },
        ],
      },
      {
        name: "Lakshmipur",
        nameBn: "লক্ষ্মীপুর",
        upazilas: [
          { name: "Lakshmipur Sadar", nameBn: "লক্ষ্মীপুর সদর", unions: ["Bangakha", "Bhabaniganj", "Char Ruhita", "Char Shahi", "Dalal Bazar", "Dattapara", "Hajirpara", "Kusakhali", "Mandari", "Parbati Nagar", "Tekerhat", "Uttar Joypur"] },
          { name: "Raipur", nameBn: "রায়পুর", unions: ["Bamni", "Char Ababil", "Char Mohana", "Char Bangshi", "Keramatpur", "Raipur Pourashava", "Rampur", "Sonapur"] },
          { name: "Ramganj", nameBn: "রামগঞ্জ", unions: ["Bhadur", "Bhatra", "Chandipur", "Darbeshpur", "Ichhapur", "Kanchanpur", "Karpara", "Lamchar", "Noagaon", "Ramganj Pourashava"] },
          { name: "Ramgati", nameBn: "রামগতি", unions: ["Alexander", "Bara Kheri", "Char Algi", "Char Badam", "Char Falcon", "Char Gazi", "Char Poragachha"] },
          { name: "Kamalnagar", nameBn: "কমলনগর", unions: ["Char Falcon", "Char Kadira", "Char Lawrence", "Char Martin", "Hazirhat", "Kalkini", "Patarirhat", "Saheb Kher"] },
        ],
      },
      {
        name: "Rangamati",
        nameBn: "রাঙ্গামাটি",
        upazilas: [
          { name: "Rangamati Sadar", nameBn: "রাঙ্গামাটি সদর", unions: ["Bandukbhanga", "Balukhali", "Jibtoli", "Kutukchhari", "Mogban", "Rangamati Pourashava", "Sapchhari"] },
          { name: "Kaptai", nameBn: "কাপ্তাই", unions: ["Chandraghona", "Chitmaram", "Kaptai Sadar", "Raikhong", "Wagga"] },
          { name: "Baghaichhari", nameBn: "বাঘাইছড়ি", unions: ["Baghaichhari Sadar", "Bangalhalia", "Khedarmara", "Marishya", "Rupakari", "Sarwatali", "Sajek"] },
          { name: "Barkal", nameBn: "বরকল", unions: ["Aima Chhara", "Barkal Sadar", "Bhushanchhara", "Borohorina", "Subalong"] },
          { name: "Kawkhali", nameBn: "কাউখালী", unions: ["Betbunia", "Fatiksari", "Ghagrachari", "Kalampati"] },
        ],
      },
      {
        name: "Bandarban",
        nameBn: "বান্দরবান",
        upazilas: [
          { name: "Bandarban Sadar", nameBn: "বান্দরবান সদর", unions: ["Bandarban Pourashava", "Kuhalong", "Rajbila", "Rowangchhari", "Suwalok", "Tankabati"] },
          { name: "Ruma", nameBn: "রুমা", unions: ["Galengya", "Paindu", "Remakri", "Ruma Sadar"] },
          { name: "Thanchi", nameBn: "থানচি", unions: ["Balipara", "Remakree", "Thanchi Sadar", "Tindu"] },
          { name: "Lama", nameBn: "লামা", unions: ["Aziznagar", "Faitong", "Gojalia", "Lama Pourashava", "Lama Sadar", "Rupshichhari", "Sarai"] },
          { name: "Alikadam", nameBn: "আলীকদম", unions: ["Alikadam Sadar", "Chokhyong", "Kurukpata", "Naitong"] },
          { name: "Naikhongchhari", nameBn: "নাইক্ষ্যংছড়ি", unions: ["Baishari", "Dhumdumia", "Ghumdhum", "Naikhongchhari Sadar", "Sonachhari"] },
        ],
      },
      {
        name: "Khagrachhari",
        nameBn: "খাগড়াছড়ি",
        upazilas: [
          { name: "Khagrachhari Sadar", nameBn: "খাগড়াছড়ি সদর", unions: ["Golabari", "Kamalchhari", "Khagrachhari Pourashava", "Perachhara", "Bhaibonchhara"] },
          { name: "Dighinala", nameBn: "দীঘিনালা", unions: ["Babuchhara", "Boalkhali", "Dighinala Sadar", "Kabakhali", "Merung"] },
          { name: "Panchhari", nameBn: "পানছড়ি", unions: ["Chengi", "Lathiban", "Logang", "Panchhari Sadar", "Ultachhari"] },
          { name: "Ramgarh", nameBn: "রামগড়", unions: ["Hafchhari", "Patachhara", "Ramgarh Pourashava", "Ramgarh Sadar"] },
          { name: "Mahalchhari", nameBn: "মহালছড়ি", unions: ["Kechang", "Lemuchhari", "Mahalchhari Sadar", "Mubachhari"] },
        ],
      },
    ],
  },

  // ── 3. RAJSHAHI DIVISION (8 Districts) ─────────────────────────────────────
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
          { name: "Durgapur", nameBn: "দুর্গাপুর", unions: ["Deluabari", "Dharampur", "Durgapur Pourashava", "Jhaluka", "Joynagar", "Kalyanpur", "Maria", "Nowpara", "Pananagar"] },
          { name: "Charghat", nameBn: "চারঘাট", unions: ["Charghat Pourashava", "Bhadra", "Nimpara", "Salua", "Sardah", "Yousufpur"] },
          { name: "Bagha", nameBn: "বাঘা", unions: ["Arani", "Bagha Pourashava", "Bajubagha", "Chak Rajapur", "Gorgori", "Monigram", "Pakuria"] },
          { name: "Tanore", nameBn: "তানোর", unions: ["Badhair", "Chanduria", "Gholhati", "Kalma", "Khamargram", "Panchandar", "Saranjai", "Talanda"] },
          { name: "Mohanpur", nameBn: "মোহনপুর", unions: ["Bakshimul", "Dhulauri", "Ghasigram", "Jahanabad", "Mowrail", "Rayghati"] },
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
          { name: "Kahaloo", nameBn: "কাহালু", unions: ["Birchkedar", "Durgapur", "Jamgaon", "Kahaloo Sadar", "Kalyani", "Malancha", "Murail", "Narangali"] },
          { name: "Nandigram", nameBn: "নন্দীগ্রাম", unions: ["Bhatgram", "Bhatra", "Burail", "Nandigram Pourashava", "Thalta Majhgram"] },
          { name: "Sonatola", nameBn: "সোনাতলা", unions: ["Balua", "Digdair", "Jorgachha", "Madhyanagar", "Pakulla", "Sonatola Sadar", "Tekani Chukainagar"] },
          { name: "Sariakandi", nameBn: "সারিয়াকান্দি", unions: ["Bhelabari", "Chandanbaisha", "Chhatiani", "Fulbari", "Hatikandi", "Kamalpur", "Karnaibari", "Kutubpur", "Sariakandi Sadar"] },
          { name: "Dhunat", nameBn: "ধুনট", unions: ["Bhandarbari", "Chowkibari", "Dhunat Sadar", "Elangi", "Gopalnagar", "Kalerpara", "Mathurapur", "Nimtita"] },
          { name: "Adamdighi", nameBn: "আদমদীঘি", unions: ["Adamdighi Sadar", "Chhatiangram", "Kundagram", "Nasratpur", "Santahar", "Sirajpur"] },
        ],
      },
      {
        name: "Pabna",
        nameBn: "পাবনা",
        upazilas: [
          { name: "Pabna Sadar", nameBn: "পাবনা সদর", unions: ["Atgharia", "Bharara", "Char Tarapur", "Dapunia", "Dogachhi", "Gayeshpur", "Hemayetpur", "Maligachha", "Pabna Pourashava", "Sadullahpur"] },
          { name: "Ishwardi", nameBn: "ঈশ্বরদী", unions: ["Dashuria", "Ishwardi Pourashava", "Lakshimikunda", "Muladuli", "Paksey", "Ruppur", "Sahapur", "Silimpur"] },
          { name: "Santhia", nameBn: "সাঁথিয়া", unions: ["Afra", "Ataikula", "Bara Gram", "Dhulauri", "Gourigram", "Karimpur", "Kashinathpur", "Khetupara", "Nandanpur", "Rampur", "Santhia Pourashava"] },
          { name: "Chatmohar", nameBn: "চাটমোহর", unions: ["Bilchalan", "Chatmohar Pourashava", "Danail", "Dighulia", "Failjana", "Gunaighar", "Haripur", "Mathurapur", "Mulgram", "Nimgachhi", "Parshuram"] },
          { name: "Bhangura", nameBn: "ভাঙ্গুড়া", unions: ["Ashtamanisha", "Bhangura Pourashava", "Dilpashar", "Khanmandol", "Mandatosh", "Parbhangura"] },
          { name: "Faridpur", nameBn: "ফরিদপুর", unions: ["Banowarimangal", "Bara Faridpur", "Demra", "Faridpur Pourashava", "Hadol", "Pungali"] },
          { name: "Bera", nameBn: "বেড়া", unions: ["Bera Pourashava", "Chakla", "Dhalarchar", "Haturia Nakalia", "Jatrasakhi", "Kabilpur", "Masumdia", "Natun Bera", "Ruppur"] },
          { name: "Sujanagar", nameBn: "সুজানগর", unions: ["Ahammadpur", "Bhabanipur", "Dulai", "Habibpur", " Manikhat", "Nazirganj", "Raninagar", "Sagarkandi", "Sujanagar Pourashava", "Tatipara"] },
        ],
      },
      {
        name: "Sirajganj",
        nameBn: "সিরাজগঞ্জ",
        upazilas: [
          { name: "Sirajganj Sadar", nameBn: "সিরাজগঞ্জ সদর", unions: ["Bagbati", "Bahuka", "Chhongachha", "Kalia Haripur", "Khokshabari", "Mechhra", "Ratanpur", "Saydabad", "Sirajganj Pourashava", "Soydabad"] },
          { name: "Shahjadpur", nameBn: "শাহজাদপুর", unions: ["Beltail", "Garah", "Habibpur", "Jalalpur", "Kayempur", "Khukni", "Nandina", "Porjana", "Potajia", "Rupbati", "Sonatoni"] },
          { name: "Ullapara", nameBn: "উল্লাপাড়া", unions: ["Bangala", "Barahar", "Bara Pangashi", "Durgapur", "Hatkumrul", "Mohonpur", "Panchakroshi", "Purnimaganti", "Salap", "Ullapara Pourashava", "Ullapara Sadar"] },
          { name: "Belkuchi", nameBn: "বেলকুচি", unions: ["Belkuchi Pourashava", "Bhangabari", "Daulatpur", "Dhurail", "Moydanhatta", "Rajapur", "Tamai"] },
          { name: "Kamarkhanda", nameBn: "কামারখন্দ", unions: ["Bhadroghat", "Jamtoil", "Jhawail", "Raydaulatpur"] },
          { name: "Kazipur", nameBn: "কাজীপুর", unions: ["Gandail", "Khasrajbari", "Mansur Nagar", "Maijbari", "Natuarpara", "Nischintapur", "Sonamukhi", "Subgachha", "Tekani"] },
          { name: "Raiganj", nameBn: "রায়গঞ্জ", unions: ["Brahma gachha", "Chandaikona", "Dhamainagar", "Dhansundi", "Nalka", "Pangashi", "Raiganj Pourashava", "Sonakhara"] },
          { name: "Tarash", nameBn: "তাড়াশ", unions: ["Baruhas", "Bhadash", "Deshigram", "Madhabpur", "Magura Binod", "Naogaon", "Soguna", "Tarash Sadar"] },
        ],
      },
      {
        name: "Naogaon",
        nameBn: "নওগাঁ",
        upazilas: [
          { name: "Naogaon Sadar", nameBn: "নওগাঁ সদর", unions: ["Balihar", "Boalia", "Chandipur", "Dubalhati", "Hapania", "Hashaighari", "Koilashpur", "Naogaon Pourashava", "Sailgachhi", "Shikarpur"] },
          { name: "Badalgachhi", nameBn: "বদলগাছী", unions: ["Adhaipur", "Badalgachhi Sadar", "Balubhora", "Bilashbari", "Kola", "Mathurapur", "Mithapur", "Paharapur"] },
          { name: "Mohadevpur", nameBn: "মহাদেবপুর", unions: ["Chandash", "Cheragpur", "Enayetpur", "Hathur", "Khajur", "Mohadevpur Sadar", "Raigaon", "Safapur", "Sarail", "Uttargram"] },
          { name: "Patnitala", nameBn: "পত্নীতলা", unions: ["Amair", "Divor", "Ghoshnagar", "Kristapur", "Matinder", "Nazipur", "Nirmal", "Patnitala Sadar", "Shiba"] },
          { name: "Manda", nameBn: "মান্দা", unions: ["Bharso", "Ganeshpur", "Kansharat", "Kashobpur", "Kusumba", "Manda Sadar", "Moinam", "Nurullabad", "Prasadpur", "Tentulia", "Varsho"] },
          { name: "Raninagar", nameBn: "রানীনগর", unions: ["Bara Gachha", "Bhatkandi", "Ekdala", "Gona", "Kaligram", "Kasimpur", "Mirzapur", "Paroil", "Raninagar Sadar"] },
          { name: "Atrai", nameBn: "আত্রাই", unions: ["Ahsanganj", "Banjao", "Bara Kalikapur", "Bhadrasa", "Bikrampur", "Hapania", "Moniyari", "Panchupur", "Shahagola", "Vopara"] },
          { name: "Dhamoirhat", nameBn: "ধামইরহাট", unions: ["Alampur", "Agradigun", "Dhamoirhat Sadar", "Isabpur", "Jahanpur", "Khelna", "Umar"] },
          { name: "Sapahar", nameBn: "সাপাহার", unions: ["Aihai", "Goala", "Patari", "Sapahar Sadar", "Shiranti", "Tilna"] },
          { name: "Porsha", nameBn: "পোরশা", unions: ["Chhanabari", "Ghatnagar", "Ganguria", "Mithapur", "Nithpur", "Porsha Sadar", "Tentulia"] },
          { name: "Niamatpur", nameBn: "নিয়ামতপুর", unions: ["Bahadurpur", "Bhabicha", "Chandannagar", "Dharampur", "Hazipur", "Niamatpur Sadar", "Parail", "Rosulpur", "Sreemanta"] },
        ],
      },
      {
        name: "Natore",
        nameBn: "নাটোর",
        upazilas: [
          { name: "Natore Sadar", nameBn: "নাটোর সদর", unions: ["Bara Harishpur", "Bhatkandi", "Brahmapur", "Chhatni", "Dighapatia", "Halsha", "Kafuria", "Lakshmipur Kholabaria", "Natore Pourashava", "Tebaria"] },
          { name: "Baraigram", nameBn: "বড়াইগ্রাম", unions: ["Baraigram Pourashava", "Chandai", "Gopalpur", "Joari", "Majhgaon", "Nagar", "Zonail"] },
          { name: "Bagatipara", nameBn: "বাগাতিপাড়া", unions: ["Bagatipara Sadar", "Dayarampur", "Faguardiar", "Jamnagar", "Panka"] },
          { name: "Singra", nameBn: "সিংড়া", unions: ["Chowgram", "Dahas", "Hatiandaha", "Itali", "Kalam", "Lalore", "Ramananda Khajura", "Sherkol", "Singra Pourashava", "Sukash", "Tajpur"] },
          { name: "Gurudaspur", nameBn: "গুরুদাসপুর", unions: ["Bamondanga", "Bia Ghat", "Chanchkoir", "Chapila", "Dharabarisha", "Gurudaspur Pourashava", "Mashinda", "Nazirpur"] },
          { name: "Lalpur", nameBn: "লালপুর", unions: ["Arbab", "Bilmaria", "Chongdhupoil", "Duaria", "Gopalpur", "Ijjatpur", "Kadimchilan", "Lalpur Sadar", "Walia"] },
          { name: "Naldanga", nameBn: "নলডাঙ্গা", unions: ["Biprabelgharia", "Brahmapur", "Khajura", "Madhahnagar", "Naldanga Sadar", "Piprul"] },
        ],
      },
      {
        name: "Chapainawabganj",
        nameBn: "চাঁপাইনবাবগঞ্জ",
        upazilas: [
          { name: "Nawabganj Sadar", nameBn: "নবাবগঞ্জ সদর", unions: ["Alinagar", "Bara Ghoria", "Baliadanga", "Char Anupnagar", "Debinagar", "Islampur", "Jhilim", "Maharajpur", "Nawabganj Pourashava", "Ranihati", "Shahjahanpur", "Sundarpur"] },
          { name: "Shibganj", nameBn: "শিবগঞ্জ", unions: ["Binodpur", "Chak Kirti", "Chhatrajitpur", "Daipukhuria", "Dhainagar", "Durlovpur", "Ghorapakia", "Monakosha", "Mobarakpur", "Nayalabhang", "Panka", "Radhanagar", "Shahbajpur", "Shibganj Pourashava", "Ujirpur"] },
          { name: "Bholahat", nameBn: "ভোলাহাট", unions: ["Bholahat Sadar", "Daldali", "Gohalbari", "Jambaria"] },
          { name: "Gomastapur", nameBn: "গোমস্তাপুর", unions: ["Alinagar", "Bangabari", "Boalia", "Chowdala", "Gomastapur Sadar", "Parbatipur", "Radhanagar", "Rohanpur"] },
          { name: "Nachole", nameBn: "নাচোল", unions: ["Fatehpur", "Kasba", "Nachole Pourashava", "Nachole Sadar", "Nezampur"] },
        ],
      },
      {
        name: "Joypurhat",
        nameBn: "জয়পুরহাট",
        upazilas: [
          { name: "Joypurhat Sadar", nameBn: "জয়পুরহাট সদর", unions: ["Amrail", "Bhadsa", "Bambur", "Dhanmondi", "Dogachhi", "Jamalpur", "Joypurhat Pourashava", "Mohammadabad", "Purangram", "Sanko"] },
          { name: "Panchbibi", nameBn: "পাঁচবিবি", unions: ["Aymarasulpur", "Bagjana", "Balighata", "Bhadreghat", "Dharanjee", "Kushumba", "Mohammadpur", "Panchbibi Pourashava", "Uchhai"] },
          { name: "Akkelpur", nameBn: "আক্কেলপুর", unions: ["Akkelpur Pourashava", "Gopinathpur", "Rukindipur", "Raykali", "Tilakpur"] },
          { name: "Khetlal", nameBn: "ক্ষেতলাল", unions: ["Alampur", "Bara Tara", "Khetlal Sadar", "Mamudpur", "Tilakpur"] },
          { name: "Kalai", nameBn: "কালাই", unions: ["Ahmadpur", "Harunj", "Kalai Sadar", "Matrai", "Punat", "Zindapur"] },
        ],
      },
    ],
  },

  // ── 4. KHULNA DIVISION (10 Districts) ──────────────────────────────────────
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
          { name: "Phultala", nameBn: "ফুলতলা", unions: ["Damodar", "Jalma", "Phultala Sadar", "Shiromoni"] },
          { name: "Batiaghata", nameBn: "বটিয়াঘাটা", unions: ["Amirpur", "Batiaghata Sadar", "Bhandarpara", "Gangarampur", "Jalma", "Surkhali"] },
          { name: "Dacope", nameBn: "দাকোপ", unions: ["Bajua", "Banishanta", "Chalna", "Dacope Sadar", "Kamarkhola", "Pankhali", "Sutarkhali", "Tildanga"] },
          { name: "Koyra", nameBn: "কয়রা", unions: ["Amadi", "Bagali", "Dakshin Bedkashi", "Koyra Sadar", "Moheshwaripur", "Maharajpur", "Uttar Bedkashi"] },
          { name: "Paikgachha", nameBn: "পাইকগাছা", unions: ["Chandramukhi", "Garaikhali", "Godamari", "Haridhali", "Kapilmuni", "Laskar", "Lata", "Paikgachha Pourashava", "Soladana"] },
          { name: "Terokhada", nameBn: "তেরখাদা", unions: ["Barasat", "Chagladaha", "Madhupur", "Sachiadah", "Terokhada Sadar"] },
        ],
      },
      {
        name: "Jashore",
        nameBn: "যশোর",
        upazilas: [
          { name: "Jashore Sadar", nameBn: "যশোর সদর", unions: ["Basundia", "Chanchra", "Chowgachha", "Deyara", "Fatehpur", "Haibatpur", "Ichhali", "Kashimpur", "Kashobpur", "Narendrapur", "Nawapara", "Rajarhat", "Upashahar"] },
          { name: "Jhikargachha", nameBn: "ঝিকরগাছা", unions: ["Bankra", "Gadkhali", "Ganganandapur", "Hajirbagh", "Jhikargachha Sadar", "Magura", "Nabharan", "Panisara", "Sankarpur", "Shimulia"] },
          { name: "Sharsha", nameBn: "শার্শা", unions: ["Benapole", "Benapole Port", "Bagachra", "Bahadurpur", "Dihi", "Goga", "Kayba", "Lakshmanpur", "Nizampur", "Sharsha Sadar", "Ulashi"] },
          { name: "Manirampur", nameBn: "মণিরামপুর", unions: ["Bhojgati", "Champaful", "Dhurail", "Haridaspur", "Jhanpa", "Kashimpur", "Khedapara", "Manirampur Pourashava", "Nehalpur", "Rohita", "Shyamkur"] },
          { name: "Abhaynagar", nameBn: "অভয়নগর", unions: ["Bhatpara", "Chalishia", "Noapara Pourashava", "Payra", "Prembagh", "Sidhirganj", "Sreedharpur", "Sundoli"] },
          { name: "Bagherpara", nameBn: "বাঘারপাড়া", unions: ["Bandabilla", "Basuari", "Charavita", "Dhalgram", "Dorajhat", "Jamdia", "Raipura"] },
          { name: "Chaugachha", nameBn: "চৌগাছা", unions: ["Chaugachha Pourashava", "Dhuliani", "Hakimpur", "Jagadishpur", "Narayanpur", "Patibila", "Sukhpukuria", "Sworupdaha"] },
          { name: "Keshabpur", nameBn: "কেশবপুর", unions: ["Bidyanandakati", "Gaurighona", "Keshabpur Pourashava", "Majidpur", "Mangalkot", "Panjia", "Sagardari", "Sufalakati", "Trimohini"] },
        ],
      },
      {
        name: "Kushtia",
        nameBn: "কুষ্টিয়া",
        upazilas: [
          { name: "Kushtia Sadar", nameBn: "কুষ্টিয়া সদর", unions: ["Alampur", "Barakhada", "Battail", "Harinakundu", "Harinarayanpur", "Jhaudia", "Kushtia Pourashava", "Monohardia", "Piarpur", "Ujangram"] },
          { name: "Kumarkhali", nameBn: "কুমারখালী", unions: ["Bagulat", "Chandur", "Chapra", "Char Sadipur", "Jodunathpur", "Kumarkhali Pourashava", "Nandanalalpur", "Panti", "Sadaki", "Shelaidaha"] },
          { name: "Bheramara", nameBn: "ভেড়ামারা", unions: ["Bahirchar", "Bheramara Pourashava", "Baraikandi", "Chandgram", "Dharampur", "Junadah", "Mokarimpur"] },
          { name: "Mirpur", nameBn: "মিরপুর", unions: ["Amla", "Bahalbaria", "Baruipara", "Chitholia", "Dharmadaha", "Kanthaldaha", "Kursha", "Maliahat", "Mirpur Pourashava", "Poradah", "Sadarpur"] },
          { name: "Daulatpur", nameBn: "দৌলতপুর", unions: ["Adabaria", "Amla", "Boalia", "Chilmari", "Daulatpur Sadar", "Hogalbaria", "Khalishakundi", "Maricha", "Mathurapur", "Philipnagar", "Pragpur", "Ramkrishnapur"] },
          { name: "Khoksa", nameBn: "খোকসা", unions: ["Ambaria", "Betbaria", "Gopagram", "Janipur", "Khoksa Pourashava", "Osmanpur", "Samshadipur", "Shimulia"] },
        ],
      },
      {
        name: "Jhenaidah",
        nameBn: "ঝিনাইদহ",
        upazilas: [
          { name: "Jhenaidah Sadar", nameBn: "ঝিনাইদহ সদর", unions: ["Dogachhi", "Fursandi", "Ganna", "Harishankarpur", "Jhenaidah Pourashava", "Kalicharanpur", "Kumrabaria", "Madhuhati", "Naldanga", "Padmakar", "Porahati", "Saganna"] },
          { name: "Kaliganj", nameBn: "কালীগঞ্জ", unions: ["Barobazar", "Castabhanga", "Jamal", "Kaliganj Pourashava", "Kola", "Maliat", "Niamatpur", "Rakhalgachhi", "Simla Rokonpur", "Sundarpur Durgapur", "Trilochonpur"] },
          { name: "Kotchandpur", nameBn: "কোটচাঁদপুর", unions: ["Baluhar", "Dohakula", "Elangi", "Kotchandpur Pourashava", "Kushna", "Sabdalpur"] },
          { name: "Maheshpur", nameBn: "মহেশপুর", unions: ["Azampur", "Banshdari", "Fatehpur", "Jadabpur", "Kazirber", "Mandarbaria", "Maheshpur Pourashava", "Natima", "Pantapara", "Sampur", "Swaruppur"] },
          { name: "Shailkupa", nameBn: "শৈলকুপা", unions: ["Abaipur", "Bogura", "Dhopaghata", "Digrail", "Hakimpur", "Kanchonpur", "Manoharpur", "Nityanandapur", "Sarutia", "Shailkupa Pourashava", "Umedpur"] },
          { name: "Harinakundu", nameBn: "হরিণাকুণ্ডু", unions: ["Bhaina", "Chandpur", "Daulatpur", "Falsi", "Harinakundu Pourashava", "Joradaha", "Kapashatia", "Raghunathpur", "Taherhuda"] },
        ],
      },
      {
        name: "Satkhira",
        nameBn: "সাতক্ষীরা",
        upazilas: [
          { name: "Satkhira Sadar", nameBn: "সাতক্ষীরা সদর", unions: ["Agardari", "Alipur", "Balli", "Banshdaha", "Brahmarajpur", "Dhopadanga", "Fingri", "Ghona", "Jhaudanga", "Labsa", "Satkhira Pourashava", "Shibpur"] },
          { name: "Kalaroa", nameBn: "কলারোয়া", unions: ["Chandonpur", "Deyara", "Helatala", "Jaldi", "Kalaroa Pourashava", "Keragachhi", "Langaljhara", "Sonabaria"] },
          { name: "Tala", nameBn: "তালা", unions: ["Dhandia", "Islamkati", "Jalalpur", "Khalishkhali", "Kumira", "Magura", "Nagarghata", "Sarulia", "Tala Sadar", "Tentulia"] },
          { name: "Debhata", nameBn: "দেবহাটা", unions: ["Debhata Sadar", "Kulian", "Nowapara", "Parulia", "Sakhra"] },
          { name: "Kaliganj", nameBn: "কালীগঞ্জ", unions: ["Bishnupur", "Champaphul", "Dhalbaria", "Kaliganj Sadar", "Kushlia", "Mathureshpur", "Moutala", "Nalbhanga", "Ratanpur", "Tarali"] },
          { name: "Shyamnagar", nameBn: "শ্যামনগর", unions: ["Bhurulia", "Gabura", "Ishwaripur", "Kaikhali", "Munshiganj", "Nurnagar", "Padmapukur", "Ramjannagar", "Shyamnagar Sadar"] },
          { name: "Assasuni", nameBn: "আশাশুনি", unions: ["Anulia", "Assasuni Sadar", "Baradal", "Budhhata", "Durgapur", "Khadimpur", "Kulla", "Pratappagar", "Shovnali", "Sreula"] },
        ],
      },
      {
        name: "Bagerhat",
        nameBn: "বাগেরহাট",
        upazilas: [
          { name: "Bagerhat Sadar", nameBn: "বাগেরহাট সদর", unions: ["Baruipara", "Bishnupur", "Gotapara", "Jatrapur", "Karapara", "Khanpur", "Madhabkati", "Rakhalgachhi", "Satgumbad", "Shaitgumbad"] },
          { name: "Mongla", nameBn: "মোংলা", unions: ["Buriirdanga", "Chandpai", "Chilahata", "Mithakhali", "Mongla Port", "Mongla Pourashava", "Sonailtola", "Sundarban"] },
          { name: "Morrelganj", nameBn: "মোড়েলগঞ্জ", unions: ["Baharbunia", "Balaibunia", "Banagram", "Barikhali", "Chingrakhali", "Daibajnaati", "Hoglabunia", "Khaulia", "Morrelganj Pourashava", "Nishanbaria", "Ramchandrapur", "Teligati"] },
          { name: "Rampal", nameBn: "রামপাল", unions: ["Baintala", "Bhojpatia", "Fakirhat", "Gourambha", "Hurka", "Mallikerber", "Perikhali", "Rajnagar", "Rampal Sadar", "Uzirpur"] },
          { name: "Fakirhat", nameBn: "ফকিরহাট", unions: ["Baitpur", "Fakirhat Sadar", "Lakhpur", "Mansha", "Moulvibazar", "Nolodha", "Piljonga", "Subhaddya"] },
          { name: "Kachua", nameBn: "কচুয়া", unions: ["Badhal", "Danail", "Dharia", "Gazalia", "Gopalpur", "Kachua Sadar", "Maghia", "Raripara"] },
          { name: "Chitalmari", nameBn: "চিতলমারী", unions: ["Barabaria", "Charbaniyari", "Chitalmari Sadar", "Hizla", "Kalasur", "Santoshpur", "Shibpur"] },
          { name: "Mollahat", nameBn: "মোল্লাহাট", unions: ["Chunakhola", "Gakulnagar", "Kahalpur", "Kodalia", "Kulian", "Mollahat Sadar", "Udaypur"] },
          { name: "Sarankhola", nameBn: "শরণখোলা", unions: ["Dakkhin Khali", "Dhansagar", "Rayenda", "Sarankhola Sadar", "Southkhali"] },
        ],
      },
      {
        name: "Chuadanga",
        nameBn: "চুয়াডাঙ্গা",
        upazilas: [
          { name: "Chuadanga Sadar", nameBn: "চুয়াডাঙ্গা সদর", unions: ["Alukdia", "Begumpur", "Chuadanga Pourashava", "Kutubpur", "Mominpur", "Padmabil", "Shankarchandra", "Tituda"] },
          { name: "Alamdanga", nameBn: "আলমডাঙ্গা", unions: ["Alamdanga Pourashava", "Bariadi", "Belgachhi", "Dauhaki", "Gongadaspur", "Harddi", "Jamjami", "Jehala", "Kalinagar", "Khadimpur", "Kumari", "Nagdah"] },
          { name: "Damurhuda", nameBn: "দামুড়হুদা", unions: ["Damurhuda Sadar", "Darshana Pourashava", "Howli", "Juranpur", "Karpasdanga", "Kurulgachhi", "Natuda", "Perkrishnapur Madna"] },
          { name: "Jibannagar", nameBn: "জীবননগর", unions: ["Bankra", "Border Area", "Hasadah", "Jibannagar Pourashava", "Kalyanpur", "Monoharpur", "Shimanta", "Uthali"] },
        ],
      },
      {
        name: "Meherpur",
        nameBn: "মেহেরপুর",
        upazilas: [
          { name: "Meherpur Sadar", nameBn: "মেহেরপুর সদর", unions: ["Amjhupi", "Buripota", "Kutubpur", "Meherpur Pourashava", "Monoharpur", "Pirojpur"] },
          { name: "Gangni", nameBn: "গাংনী", unions: ["Bhatpara", "Dhanmondi", "Gangni Pourashava", "Kathuli", "Kazipur", "Mothurapur", "Rampur", "Saharbati", "Tetulbaria"] },
          { name: "Mujibnagar", nameBn: "মুজিবনগর", unions: ["Bagoan", "Dariapur", "Mahajanpur", "Monakhali", "Mujibnagar Complex"] },
        ],
      },
      {
        name: "Magura",
        nameBn: "মাগুরা",
        upazilas: [
          { name: "Magura Sadar", nameBn: "মাগুরা সদর", unions: ["Atharokhada", "Babra", "Chaulia", "Gopalgram", "Harinathpur", "Jagdal", "Kasundi", "Kuchiamora", "Magura Pourashava", "Moghi", "Nanduali", "Raghabpair", "Satjitpur", "Shatrujitpur"] },
          { name: "Sreepur", nameBn: "শ্রীপুর", unions: ["Amolsar", "Darimagura", "Gayeshpur", "Kadirpara", "Nakol", "Sabdalpur", "Srikol", "Sreepur Sadar"] },
          { name: "Mohammadpur", nameBn: "মোহাম্মদপুর", unions: ["Babukhali", "Balidia", "Binodpur", "Digha", "Mohammadpur Sadar", "Nahata", "Palashbaria", "Rajanagar"] },
          { name: "Shalikha", nameBn: "শালিখা", unions: ["Arpara", "Bunagati", "Dhaneswargati", "Gangarampur", "Shatakhali", "Singra", "Talkhiri"] },
        ],
      },
      {
        name: "Narail",
        nameBn: "নড়াইল",
        upazilas: [
          { name: "Narail Sadar", nameBn: "নড়াইল সদর", unions: ["Auria", "Banshigram", "Bhadralila", "Bichhali", "Chandibarpur", "Hobakhali", "Kalia", "Maijpara", "Mullikpur", "Narail Pourashava", "Shahabad", "Tularampur"] },
          { name: "Lohagara", nameBn: "লোহাগড়া", unions: ["Dighalia", "Itna", "Joypur", "Kashipur", "Kotakol", "Laxmipasha", "Lohagara Pourashava", "Mallikpur", "Naldi", "Noagram", "Salnagar"] },
          { name: "Kalia", nameBn: "কালিয়া", unions: ["Babra Hachla", "Baoysona", "Chhachuri", "Hamidpur", "Jadabpur", "Joynagar", "Kalia Pourashava", "Khalsi", "Paharpur", "Pateswari", "Peroli", "Purulia", "Salamabad"] },
        ],
      },
    ],
  },

  // ── 5. BARISHAL DIVISION (6 Districts) ─────────────────────────────────────
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
          { name: "Banaripara", nameBn: "বানারীপাড়া", unions: ["Baisari", "Banaripara Pourashava", "Chakhar", "Iluhar", "Salia Bakpur", "Syedkati", "Udaykati"] },
          { name: "Gournadi", nameBn: "গৌরনদী", unions: ["Bararthi", "Batajor", "Chandshi", "Gournadi Pourashava", "Khanjapur", "Mahilara", "Nalchira", "Sarikal"] },
          { name: "Agailjhara", nameBn: "আগৈলঝাড়া", unions: ["Bakal", "Bagdha", "Gaila", "Rajihor", "Ratnapur"] },
          { name: "Mehendiganj", nameBn: "মেহেন্দিগঞ্জ", unions: ["Alimabad", "Andharmanik", "Bhasanchar", "Chanpur", "Char Ekkarie", "Char Gopalpur", "Darial", "Gobindapur", "Jangalia", "Mehendiganj Pourashava", "Uzirpur"] },
          { name: "Muladi", nameBn: "মুলাদী", unions: ["Batamara", "Char Kalekhan", "Ghasirchar", "Kazirchar", "Muladi Pourashava", "Muladi Sadar", "Nazirpur", "Safipur"] },
          { name: "Wazirpur", nameBn: "উজিরপুর", unions: ["Bamrail", "Bara Kotha", "Guthia", "Harta", "Jalla", "Orakandi", "Otra", "Satla", "Sholakhali", "Wazirpur Pourashava"] },
        ],
      },
      {
        name: "Patuakhali",
        nameBn: "পটুয়াখালী",
        upazilas: [
          { name: "Patuakhali Sadar", nameBn: "পটুয়াখালী সদর", unions: ["Auliapur", "Badarpur", "Chowdhury Bazar", "Itbaria", "Kalikapur", "Kamalapur", "Lauhati", "Madarbunia", "Marichbunia", "Patuakhali Pourashava"] },
          { name: "Kalapara", nameBn: "কলাপাড়া", unions: ["Chakamaiya", "Dhankhali", "Kuakata", "Lalua", "Mahipur", "Mithaganj", "Nilganj", "Tiakhali"] },
          { name: "Bauphal", nameBn: "বাউফল", unions: ["Adabaria", "Baga", "Bauphal Pourashava", "Daspara", "Dhulia", "Kalaiya", "Kalisuri", "Kanakdia", "Madhanpura", "Mominpur", "Nazirpur", "Nowmala", "Surjomoni"] },
          { name: "Galachipa", nameBn: "গলাচিপা", unions: ["Amkhola", "Baidyadanga", "Bakulbaria", "Char Biswas", "Char Kajal", "Dakshin Dakua", "Galachipa Pourashava", "Gazalia", "Golkhali", "Panpatty", "Ratandi Taltali"] },
          { name: "Dumki", nameBn: "দুমকি", unions: ["Angaria", "Bhuria", "Dumki Sadar", "Lebukhali", "Muradia", "Pangashia"] },
          { name: "Mirzaganj", nameBn: "মির্জাগঞ্জ", unions: ["Amragachhia", "Deuli Subidpur", "Madhabakhali", "Majidbaria", "Mirzaganj Sadar", "Sundura"] },
          { name: "Dashmina", nameBn: "দশমিনা", unions: ["Ali Pura", "Bansh Baria", "Betagi Sankipura", "Char Borhan", "Dashmina Sadar", "Rongopaldi"] },
          { name: "Rangabali", nameBn: "রাঙ্গাবালী", unions: ["Barabaishdia", "Chalitabunia", "Chhotabaishdia", "Moudubi", "Rangabali Sadar"] },
        ],
      },
      {
        name: "Bhola",
        nameBn: "ভোলা",
        upazilas: [
          { name: "Bhola Sadar", nameBn: "ভোলা সদর", unions: ["Alinagar", "Bapta", "Char Samaiya", "Dhania", "Ilisha", "Kachia", "Paschim Ilsha", "Rajapur", "Shibpur", "Velumia"] },
          { name: "Borhanuddin", nameBn: "বোরহানউদ্দিন", unions: ["Baramoni", "Bara Manika", "Chowdhury Hat", "Deula", "Gangapur", "Hasan Nagar", "Kachia", "Pakshia", "Sachra", "Toyka"] },
          { name: "Char Fasson", nameBn: "চরফ্যাশন", unions: ["Abubakar Pur", "Adarsha Kapalikandhi", "Aminabad", "Aslampur", "Char Kukri Mukri", "Char Manika", "Dhal Char", "Ewazpur", "Jahanpur", "Jinnagar", "Madras", "Nazrul Nagar", "Nilkamal", "Nurabad", "Osmanganj", "Rasulpur"] },
          { name: "Daulatkhan", nameBn: "দৌলতখান", unions: ["Bhabanipur", "Char Khalifa", "Char Pata", "Hajipur", "Madhyam Joynagar", "Maju Chowdhurir Hat", "Sayedpur", "Uttar Joynagar"] },
          { name: "Lalmohan", nameBn: "লালমোহন", unions: ["Badarpur", "Char Bhuta", "Dhaligournagar", "Farashganj", "Kalma", "Lalmohan Pourashava", "Lord Hardinge", "Paschim Char Umed", "Romaganj"] },
          { name: "Monpura", nameBn: "মনপুরা", unions: ["Dakshin Sakuchia", "Hajirhat", "Monpura Sadar", "Uttar Sakuchia"] },
          { name: "Tazumuddin", nameBn: "তজুমদ্দিন", unions: ["Boro Mullah", "Chanchra", "Shambhupur", "Sonapur"] },
        ],
      },
      {
        name: "Pirojpur",
        nameBn: "পিরোজপুর",
        upazilas: [
          { name: "Pirojpur Sadar", nameBn: "পিরোজপুর সদর", unions: ["Durgapur", "Kadamtala", "Kalakhali", "Pirojpur Pourashava", "Rayerkathi", "Shariktala", "Sikder Mallik", "Tonabati"] },
          { name: "Bhandaria", nameBn: "ভাণ্ডারিয়া", unions: ["Bhandaria Pourashava", "Bhitabaria", "Dhaoa", "Gowripur", "Ikri", "Nudmulla", "Telikhali"] },
          { name: "Mathbaria", nameBn: "মঠবাড়িয়া", unions: ["Amragachhia", "Bara Machhua", "Betmor Rajput", "Daudkhali", "Dhanisafa", "Gulishakhali", "Mathbaria Pourashava", "Mirzukhali", "Sapleja", "Tikikata", "Tushkhali"] },
          { name: "Nazirpur", nameBn: "নাজিরপুর", unions: ["Deulbari Dobra", "Dirghatal", "Malikhali", "Matibhanga", "Nazirpur Sadar", "Sekhmatia", "Sreeramkathi"] },
          { name: "Nesarabad (Swarupkati)", nameBn: "নেছারাবাদ (স্বরূপকাঠি)", unions: ["Atghor Kuriana", "Balihari", "Daihari", "Guarekha", "Jhulonbari", "Sohagdal", "Swarupkati Pourashava"] },
          { name: "Kawkhali", nameBn: "কাউখালী", unions: ["Amrajuri", "Chirapara Parshaturia", "Kawkhali Sadar", "Sayna Raghunathpur", "Shirkhali"] },
          { name: "Indurkani (Zianagar)", nameBn: "ইন্দুরকানী", unions: ["Balipara", "Chondipur", "Indurkani Sadar", "Pattashi"] },
        ],
      },
      {
        name: "Barguna",
        nameBn: "বরগুনা",
        upazilas: [
          { name: "Barguna Sadar", nameBn: "বরগুনা সদর", unions: ["Ayla Patakata", "Badarkhali", "Burirchar", "Dhalua", "Gaurichanna", "Keorabunia", "Mridhabari", "Naltona", "Phuljhuri", "Sadar Union"] },
          { name: "Amtali", nameBn: "আমতলী", unions: ["Amtali Pourashava", "Arpangashia", "Atharagashia", "Chawra", "Ghulishakhali", "Haldia", "Kukua"] },
          { name: "Patharghata", nameBn: "পাথরঘাটা", unions: ["Charduani", "Kakchira", "Kalmegha", "Kanthaltali", "Nachnapara", "Patharghata Pourashava", "Rayhanpur"] },
          { name: "Betagi", nameBn: "বেতাগী", unions: ["Betagi Pourashava", "Bibichini", "Buramazumdar", "Hosnabad", "Kazirhat", "Mokamia", "Sarishamunda"] },
          { name: "Bamna", nameBn: "বামনা", unions: ["Bamna Sadar", "Bokabunia", "Dauatola", "Ramna"] },
          { name: "Taltali", nameBn: "তালতলী", unions: ["Barabagi", "Chhotabagi", "Khaiyabhanga", "Nishanbaria", "Panchakhar", "Saralpunia", "Sonakata"] },
        ],
      },
      {
        name: "Jhalokati",
        nameBn: "ঝালকাঠি",
        upazilas: [
          { name: "Jhalokati Sadar", nameBn: "ঝালকাঠি সদর", unions: ["Basanda", "Binoykathi", "Gabha Ramchandrapur", "Keora", "Kirtipasha", "Nabagram", "Ponabalia", "Sekherhat", "Taranagar"] },
          { name: "Nalchity", nameBn: "নলছিটি", unions: ["Bhabanipur", "Dapdapia", "Deopasha", "Kodaldoi", "Kulsakati", "Mollahat", "Nalchity Pourashava", "Ranapashar", "Siddhakathi", "Subidpur"] },
          { name: "Rajapur", nameBn: "রাজাপুর", unions: ["Badurtala", "Galua", "Khamarbari", "Mathbari", "Orakandi", "Rajapur Sadar", "Satani", "Shuktagar"] },
          { name: "Kathalia", nameBn: "কাঠালিয়া", unions: ["Amua", "Chenchrirampur", "Jalakhali", "Kathalia Sadar", "Patakhali", "Shaulajalia"] },
        ],
      },
    ],
  },

  // ── 6. SYLHET DIVISION (4 Districts) ───────────────────────────────────────
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
          { name: "Zakiganj", nameBn: "জকিগঞ্জ", unions: ["Barathakuri", "Birasri", "Kajalshah", "Kholachhara", "Manikpur", "Sultanpur", "Zakiganj Pourashava"] },
          { name: "Kanaighat", nameBn: "কানাইঘাট", unions: ["Bara Chatul", "Dakshin Banagram", "Jhilbari", "Kanaighat Pourashava", "Lakshipur", "Purba Dighirpar", "Rajaganj", "Satbak"] },
          { name: "Companiganj", nameBn: "কোম্পানীগঞ্জ", unions: ["East Islamganj", "Ichhamati", "Ranikhai", "Telikhal", "West Islamganj"] },
          { name: "Gowainghat", nameBn: "গোয়াইনঘাট", unions: ["Alirgaon", "Fatehpur", "Jaflong", "Lengura", "Nandirgaon", "Paschim Jaflong", "Rustampur", "Towakul"] },
          { name: "Jaintiapur", nameBn: "জৈন্তাপুর", unions: ["Charikatha", "Darbast", "Fatehpur", "Jaintiapur Sadar", "Nijpat", "Tikarpada"] },
          { name: "Bishwanath", nameBn: "বিশ্বনাথ", unions: ["Alankari", "Bishwanath Pourashava", "Daulatpur", "Deokalas", "Dashghar", "Khajanchi", "Lama Kazi", "Rampur"] },
          { name: "Balaganj", nameBn: "বালাগঞ্জ", unions: ["Balaganj Sadar", "Boaljur", "Dewanbazar", "Goyashpur", "Omarpur", "Purbapashchim"] },
          { name: "Osmani Nagar", nameBn: "ওসমানী নগর", unions: ["Burungabazar", "Dayamir", "Goalabazar", "Sadrunnessa", "Tajpur", "Tekerhat", "Umarpur"] },
          { name: "Dakshin Surma", nameBn: "দক্ষিণ সুরমা", unions: ["Boroikandi", "Daudpur", "Jalalpur", "Kuchai", "Mogla Bazar", "Mollargaon", "Silam", "Tetli"] },
          { name: "Fenchuganj", nameBn: "ফেঞ্চুগঞ্জ", unions: ["Fenchuganj Sadar", "Ghilachhara", "Maijgaon", "Nutun Bazar", "Uttar Fenchuganj"] },
        ],
      },
      {
        name: "Moulvibazar",
        nameBn: "মৌলভীবাজার",
        upazilas: [
          { name: "Moulvibazar Sadar", nameBn: "মৌলভীবাজার সদর", unions: ["Akhailkura", "Amtail", "Chandnighat", "Ekatuna", "Giasnagar", "Kamalpur", "Kholilpur", "Manumukh", "Moulvibazar Pourashava", "Nazirabad"] },
          { name: "Sreemangal", nameBn: "শ্রীমঙ্গল", unions: ["Ashidron", "Bhunabir", "Kalapur", "Kalighat", "Mirzapur", "Rajghat", "Satgaon", "Sindurkhan", "Sreemangal Pourashava"] },
          { name: "Kamalganj", nameBn: "কামালগঞ্জ", unions: ["Adampur", "Alinagar", "Islampur", "Kamalganj Pourashava", "Madhabpur", "Munshibazar", "Patrakhola", "Rahimpur", "Shamshernagar"] },
          { name: "Kulaura", nameBn: "কুলাউড়া", unions: ["Baramchal", "Bhattera", "Bramhanbazar", "Hazipur", "Joychandi", "Kadirpur", "Karmadha", "Kulaura Pourashava", "Prithimpassa", "Routhgaon", "Sharifpur", "Tilagaon"] },
          { name: "Rajnagar", nameBn: "রাজনগর", unions: ["Fatehpur", "Kamarchak", "Mansurnagar", "Munshibazar", "Rajnagar Sadar", "Tengra", "Uttarbhag"] },
          { name: "Barlekha", nameBn: "বড়লেখা", unions: ["Barlekha Pourashava", "Barnali", "Dakshinbhag", "Dakhin Shahbazpur", "Nij Bahadurpur", "Sujanagar", "Talimpur", "Uttar Shahbazpur"] },
          { name: "Juri", nameBn: "জুড়ী", unions: ["Fultala", "Goalbari", "Juri Sadar", "Jaifarnagar", "Sagarnal", "West Juri"] },
        ],
      },
      {
        name: "Habiganj",
        nameBn: "হবিগঞ্জ",
        upazilas: [
          { name: "Habiganj Sadar", nameBn: "হবিগঞ্জ সদর", unions: ["Gopaya", "Habiganj Pourashava", "Lakhai", "Lokhra", "Nurpur", "Poinda", "Richi", "Sayestanagar", "Tegharia"] },
          { name: "Madhabpur", nameBn: "মাধবপুর", unions: ["Adaoir", "Baghachara", "Bahuamala", "Choumohani", "Dharmaghar", "Jagadishpur", "Madhabpur Pourashava", "Shahjahanpur"] },
          { name: "Nabiganj", nameBn: "নবীগঞ্জ", unions: ["Ausgandi", "Bausha", "Debpara", "Dighalbak", "Goplarbazar", "Inathganj", "Kalairbazar", "Karab", "Nabiganj Pourashava", "Paniumda"] },
          { name: "Bahubal", nameBn: "বাহুবল", unions: ["Bahubal Sadar", "Bharaura", "Lamatashi", "Mirpur", "Putijuri", "Snanghat"] },
          { name: "Chunarughat", nameBn: "চুনারুঘাট", unions: ["Ahmmedabad", "Deoragachh", "Gazipur", "Mirashi", "Paikpara", "Ranigaon", "Shankhola", "Uzirpur"] },
          { name: "Baniachong", nameBn: "বানিয়াচং", unions: ["Baniachong North East", "Baniachong North West", "Baniachong South East", "Baniachong South West", "Doulatpur", "Kagapasha", "Makrampur", "Manderandi", "Muradpur", "Pailakandi", "Subidpur"] },
          { name: "Ajmiriganj", nameBn: "আজমিরীগঞ্জ", unions: ["Ajmiriganj Sadar", "Badalpur", "Jolsuka", "Kakailseo", "Shibpasha"] },
          { name: "Lakhai", nameBn: "লাখাই", unions: ["Bamoi", "Bullabazar", "Karab", "Lakhai Sadar", "Morakari", "Muradpur"] },
          { name: "Sayestaganj", nameBn: "শায়েস্তাগঞ্জ", unions: ["Bara Churmoni", "Nurpur", "Sayestaganj Pourashava", "Sayestaganj Sadar"] },
        ],
      },
      {
        name: "Sunamganj",
        nameBn: "সুনামগঞ্জ",
        upazilas: [
          { name: "Sunamganj Sadar", nameBn: "সুনামগঞ্জ সদর", unions: ["Bhatgaon", "Gourarang", "Kathair", "Kurbannagar", "Laxmansree", "Mollapara", "Rangarchar", "Surma", "Sunamganj Pourashava"] },
          { name: "Chhatak", nameBn: "ছাতক", unions: ["Bhatgaon", "Chhatak Pourashava", "Dalarbazar", "Gobindaganj Syedergaon", "Islampur", "Jahedpur", "Kalaruka", "Khikharbazar", "Niamatpur", "Singchapair"] },
          { name: "Jagannathpur", nameBn: "জগন্নাথপুর", unions: ["Asharkandi", "Chilahata", "Haldipur", "Jagannathpur Pourashava", "Kolkolia", "Mirpur", "Pailgaon", "Ranadighi", "Syedpur Shaharpara"] },
          { name: "Derai", nameBn: "দিরাই", unions: ["Bhatiapara", "Charnarchar", "Derai Pourashava", "Derai Sarmangal", "Jagdal", "Karimpur", "Kulanj", "Rajanagar", "Taral"] },
          { name: "Tahirpur", nameBn: "তাহিরপুর", unions: ["Badaghat", "Balijuri", "Dakshin Sreepur", "Tahirpur Sadar", "Uttar Badaghat", "Uttar Sreepur"] },
          { name: "Dharampasha", nameBn: "ধর্মপাশা", unions: ["Chamardani", "Dharampasha Sadar", "Jayashree", "Madhyanagar", "Paikurati", "Pipra", "Sukair Rajapur"] },
          { name: "Jamalganj", nameBn: "জামালগঞ্জ", unions: ["Beheli", "Bhimkhali", "Fenarbak", "Jamalganj Sadar", "Sachnabazar"] },
          { name: "Shanthiganj (South Sunamganj)", nameBn: "শান্তিগঞ্জ", unions: ["Durgapur", "Joykalash", "Patharia", "Paschim Pagla", "Purba Pagla", "Shimulbak"] },
          { name: "Dowarabazar", nameBn: "দোয়ারাবাজার", unions: ["Banglabazar", "Bogla Bazar", "Dohalia", "Dowarabazar Sadar", "Laksmipur", "Mannargoan", "Pandargaon", "Surma"] },
          { name: "Sullah", nameBn: "শাল্লা", unions: ["Atgaon", "Bahara", "Habibpur", "Sullah Sadar"] },
        ],
      },
    ],
  },

  // ── 7. RANGPUR DIVISION (8 Districts) ──────────────────────────────────────
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
          { name: "Badarganj", nameBn: "বদরগঞ্জ", unions: ["Badarganj Pourashava", "Bishnupur", "Damodarpur", "Gopalpur", "Kalupara", "Kutubpur", "Lohanipara", "Madhupur", "Radhanagar"] },
          { name: "Gangachhara", nameBn: "গংগাচড়া", unions: ["Alambiditor", "Barabil", "Betgari", "Gangachhara Sadar", "Gajaghanta", "Kolakandha", "Laxmitari", "Mornea", "Nohali"] },
          { name: "Kaunia", nameBn: "কাউনিয়া", unions: ["Balapara", "Haragach Pourashava", "Haragach Union", "Kursha", "Mirbagh", "Shahidbagh", "Tepamadhupur"] },
          { name: "Pirgachha", nameBn: "পীরগাছা", unions: ["Annadanagar", "Chhayghari", "Itakumari", "Kandi", "Kaoradaha", "Parul", "Pirgachha Sadar", "Tambulpur"] },
          { name: "Taraganj", nameBn: "তারাগঞ্জ", unions: ["Alampur", "Ekorchali", "Hariarkuthi", "Kursha", "Sayar"] },
        ],
      },
      {
        name: "Dinajpur",
        nameBn: "দিনাজপুর",
        upazilas: [
          { name: "Dinajpur Sadar", nameBn: "দিনাজপুর সদর", unions: ["Askerpur", "Chehelgazi", "Dinajpur Pourashava", "Fazilpur", "Kamalpur", "Pulhat", "Sankarpur", "Sashtitala", "Sundarban", "Uthrail"] },
          { name: "Birganj", nameBn: "বীরগঞ্জ", unions: ["Bhogdori", "Birganj Pourashava", "Golabari", "Kahanol", "Mohanpur", "Moricha", "Nizpara", "Palashbari", "Satkhamar", "Shatagram", "Suakuri"] },
          { name: "Biral", nameBn: "বিরল", unions: ["Azimpur", "Bhandara", "Biral Pourashava", "Dharmapur", "Farakkabad", "Mongolpur", "Ranipukur", "Shaharbati"] },
          { name: "Parbatipur", nameBn: "পার্বতীপুর", unions: ["Belaichandi", "Chandipur", "Habra", "Harirampur", "Manmathpur", "Mominpur", "Mustafapur", "Palashbari", "Parbatipur Pourashava", "Rampur"] },
          { name: "Fulbari", nameBn: "ফুলবাড়ী", unions: ["Alaikapur", "Betdighi", "Daulatpur", "Eluari", "Fulbari Pourashava", "Kajihal", "Khayerbari", "Shibnagar"] },
          { name: "Nawabganj", nameBn: "নবাবগঞ্জ", unions: ["Bhaduria", "Binodnagar", "Daudpur", "Golabganj", "Joypur", "Kushdaha", "Mahmudpur", "Putimari", "Shalgachhi"] },
          { name: "Ghoraghat", nameBn: "ঘোড়াঘাট", unions: ["Buldakiganj", "Ghoraghat Pourashava", "Ghoraghat Sadar", "Palsha", "Singra"] },
          { name: "Hakimpur (Hili)", nameBn: "হাকিমপুর", unions: ["Alihat", "Boaldar", "Hakimpur Pourashava", "Hili Port", "Khatto Madhabpur"] },
          { name: "Kaharole", nameBn: "কাহারোল", unions: ["Dabor", "Kaharole Sadar", "Mukundapur", "Ramchandrapur", "Rasulpur", "Targaon"] },
          { name: "Khansama", nameBn: "খানসামা", unions: ["Alokjhari", "Bherbheri", "Ghonoshampur", "Gopalpur", "Khamarpara", "Pakerhat"] },
          { name: "Bochaganj", nameBn: "বোচাগঞ্জ", unions: ["Atgaon", "Bochaganj Pourashava", "Chowdhury Hat", "Ishania", "Muradpur", "Nafanagar", "Rangaon"] },
          { name: "Chirirbandar", nameBn: "চিরিরবন্দর", unions: ["Abdulpur", "Aowliapukur", "Baitara", "Chirirbandar Sadar", "Fatehpur", "Isobpur", "Nasratpur", "Puntti", "Saikata", "Satnala", "Tentulia", "Viadanga"] },
        ],
      },
      {
        name: "Kurigram",
        nameBn: "কুড়িগ্রাম",
        upazilas: [
          { name: "Kurigram Sadar", nameBn: "কুড়িগ্রাম সদর", unions: ["Belgachha", "Bhogdanga", "Holokhana", "Jatrapur", "Kanthalbari", "Kurigram Pourashava", "Moghalbasa", "Panchgachhi"] },
          { name: "Nageshwari", nameBn: "নাগেশ্বরী", unions: ["Bamondanga", "Berubari", "Hasnabad", "Kaliganj", "Nageshwari Pourashava", "Noyashil", "Raiganj", "Santoshpur", "Takea"] },
          { name: "Bhurungamari", nameBn: "ভুরুঙ্গামারী", unions: ["Andharijhar", "Bhurungamari Sadar", "Char Bhurungamari", "Joymonirhat", "Paikerchhara", "Pathardubi", "Shilkhuri", "Tilai"] },
          { name: "Ulipur", nameBn: "উলিপুর", unions: ["Bazra", "Begumganj", "Buraburi", "Dhamerhat", "Dharonibari", "Durgapur", "Gunaigachh", "Hatia", "Pandul", "Saheberalga", "Tabakpur", "Thetroy", "Ulipur Pourashava"] },
          { name: "Chilmari", nameBn: "চিলমারী", unions: ["Ashtomirchar", "Chilmari Sadar", "Nayarhat", "Ramna", "Raniganj", "Thana Hat"] },
          { name: "Rajarhat", nameBn: "রাজারহাট", unions: ["Bidyananda", "Chakpashar", "Chakarhat", "Gharialdanga", "Nazimkhan", "Rajarhat Sadar", "Umar Majid"] },
          { name: "Rowmari", nameBn: "রৌমারী", unions: ["Bandaber", "Bhowmik Para", "Char Sholmari", "Dantbhanga", "Jadur Char", "Rowmari Sadar", "Saulmari"] },
          { name: "Char Rajibpur", nameBn: "চর রাজিবপুর", unions: ["Char Rajibpur Sadar", "Kodalkati", "Mohanganj"] },
          { name: "Phulbari", nameBn: "ফুলবাড়ী", unions: ["Bhangamor", "Kashipur", "Naodanga", "Phulbari Sadar", "Shimulbari"] },
        ],
      },
      {
        name: "Gaibandha",
        nameBn: "গাইবান্ধা",
        upazilas: [
          { name: "Gaibandha Sadar", nameBn: "গাইবান্ধা সদর", unions: ["Balia", "Boali", "Ghaghoa", "Gidari", "Kamarbari", "Kholabati", "Kholahati", "Mollarchar", "Ramchandrapur", "Sahapara"] },
          { name: "Gobindaganj", nameBn: "গোবিন্দগঞ্জ", unions: ["Darbarpur", "Ghaghadaha", "Gobindaganj Pourashava", "Gundabari", "Harirampur", "Kamardanga", "Katamor", "Kochashahar", "Mahimaganj", "Nakai", "Shampur", "Talukfulbari"] },
          { name: "Palashbari", nameBn: "পলাশবাড়ী", unions: ["Barishal", "Betkapa", "Harinarayanpur", "Hossainpur", "Kishoregari", "Mohonpur", "Monoharpur", "Palashbari Pourashava", "Pabnapur"] },
          { name: "Sadullapur", nameBn: "সাদুল্লাপুর", unions: ["Bhatgram", "Bongram", "Damodarpur", "Dhaperhat", "Faridpur", "Idilpur", "Kamalpur", "Naldanga", "Rasulpur"] },
          { name: "Sundarganj", nameBn: "সুন্দরগঞ্জ", unions: ["Belka", "Chandipur", "Dahabandha", "Dhobadanga", "Haripur", "Kanchibari", "Kapasia", "Ramjibon", "Shantiram", "Sundarganj Pourashava", "Tarapur"] },
          { name: "Saghata", nameBn: "সাঘাটা", unions: ["Bhadurpur", "Bonarpara", "Ghurgachha", "Haldia", "Jumarbari", "Kachua", "Kamarpara", "Padmasahar", "Saghata Sadar"] },
          { name: "Fulchhari", nameBn: "ফুলছড়ি", unions: ["Erendabari", "Fazlupur", "Fulchhari Sadar", "Ghazaria", "Kanchipara", "Uria", "Uria Sadar"] },
        ],
      },
      {
        name: "Nilphamari",
        nameBn: "নীলফামারী",
        upazilas: [
          { name: "Nilphamari Sadar", nameBn: "নীলফামারী সদর", unions: ["Charaikhola", "Chapra Jharbari", "Gorgram", "Itakhola", "Kachukata", "Khoksabari", "Kundumura", "Nilphamari Pourashava", "Palashbari", "Ramnagar", "Sangashi", "Tupamari"] },
          { name: "Saidpur", nameBn: "সৈয়দপুর", unions: ["Bangalipur", "Botlagari", "Kashiram Belpukur", "Khatamadhupur", "Kamarpukur", "Saidpur Cantonment", "Saidpur Pourashava"] },
          { name: "Domar", nameBn: "ডোমার", unions: ["Bhaturia", "Bhogdaburi", "Boragari", "Domar Pourashava", "Gomnati", "Harowati", "Jorabari", "Ketakibari", "Sonaroy"] },
          { name: "Dimla", nameBn: "ডিমলা", unions: ["Balapara", "Dimla Sadar", "Gayabari", "Jharshingheswar", "Khoga Kharibari", "Nauwabari", "Paschim Chhatnai", "Tepakharibari"] },
          { name: "Jaldhaka", nameBn: "জলঢাকা", unions: ["Balapara", "Bhogmari", "Dharmapal", "Golmunda", "Golna", "Jaldhaka Pourashava", "Kaimari", "Kanthali", "Mirganj", "Saulmari", "Shimulbari"] },
          { name: "Kishoreganj", nameBn: "কিশোরগঞ্জ", unions: ["Bahagili", "Chandkhana", "Garagram", "Kishoreganj Sadar", "Magura", "Nityanandapur", "Pannabari", "Ranachandi"] },
        ],
      },
      {
        name: "Lalmonirhat",
        nameBn: "লালমনিরহাট",
        upazilas: [
          { name: "Lalmonirhat Sadar", nameBn: "লালমনিরহাট সদর", unions: ["Bara Bari", "Gokunda", "Harati", "Khuniagachh", "Kulaghat", "Lalmonirhat Pourashava", "Mahendranagar", "Mogholhat", "Rajpur"] },
          { name: "Patgram", nameBn: "পাটগ্রাম", unions: ["Baura", "Burimari", "Dhabalsuti", "Jagatber", "Kuchlibari", "Patgram Pourashava", "Sreerampur"] },
          { name: "Hatibandha", nameBn: "হাতীবান্ধা", unions: ["Barakhata", "Daudpur", "Goddimari", "Hatibandha Sadar", "Patikapara", "Saniazan", "Sindurna", "Singimari", "Tongbhanga"] },
          { name: "Kaliganj", nameBn: "কালীগঞ্জ", unions: ["Bhelabari", "Chalbala", "Chandrapur", "Dalgram", "Gorzamari", "Kakina", "Madati", "Tushbhandar"] },
          { name: "Aditmari", nameBn: "আদিতমারী", unions: ["Bhadai", "Bhelabari", "Durgapur", "Kamalabari", "Mohishkhocha", "Palashi", "Saptibari", "Sarippara"] },
        ],
      },
      {
        name: "Thakurgaon",
        nameBn: "ঠাকুরগাঁও",
        upazilas: [
          { name: "Thakurgaon Sadar", nameBn: "ঠাকুরগাঁও সদর", unions: ["Akcha", "Auliapur", "Baliadangi", "Begunbari", "Chilarang", "Debipur", "Gorea", "Jagannathpur", "Nargun", "Rahimanpur", "Raypur", "Ruhia", "Salander", "Thakurgaon Pourashava"] },
          { name: "Pirganj", nameBn: "পীরগঞ্জ", unions: ["Bairati", "Daulatpur", "Hajipur", "Jabarhat", "Kowgaon", "Pirganj Pourashava", "Rampur", "Sengaon", "Syedpur"] },
          { name: "Baliadangi", nameBn: "বালিয়াডাঙ্গী", unions: ["Amjankhor", "Bara Palashbari", "Barabari", "Charnia", "Duosuo", "Paria", "Ranisankail"] },
          { name: "Ranisankail", nameBn: "রাণীশংকৈল", unions: ["Bachor", "Bhadurpur", "Dharmagarh", "Hossainpur", "Kashipur", "Lehemba", "Nanduar", "Ranisankail Pourashava", "Rathbaria"] },
          { name: "Haripur", nameBn: "হরিপুর", unions: ["Bakhorhat", "Bhaturia", "Dangipara", "Gedura", "Haripur Sadar", "Ranidhar"] },
        ],
      },
      {
        name: "Panchagarh",
        nameBn: "পঞ্চগড়",
        upazilas: [
          { name: "Panchagarh Sadar", nameBn: "পঞ্চগড় সদর", unions: ["Amar Khana", "Chaklahat", "Dhapdighi", "Garoal", "Hafizabad", "Magura", "Noyabari", "Panchagarh Pourashava"] },
          { name: "Tetulia", nameBn: "তেঁতুলিয়া", unions: ["Banglabandha", "Bhangamor", "Buraburi", "Devnagar", "Salbahan", "Tetulia Sadar", "Tirnaikhali"] },
          { name: "Boda", nameBn: "বোদা", unions: ["Benghari Banagram", "Boda Pourashava", "Boda Sadar", "Chandanbari", "Jholai Salgram", "Kajal Dighi", "Mareya Bamanhat", "Moydandighi", "Panchpir", "Sakoa"] },
          { name: "Debiganj", nameBn: "দেবীগঞ্জ", unions: ["Checheng", "Dandapal", "Debiganj Pourashava", "Debiganj Sadar", "Pamuli", "Shaldanga", "Sonahar Mallikadaha", "Sundardighi", "Tepriganj"] },
          { name: "Atwari", nameBn: "আটোয়ারী", unions: ["Balarampur", "Dhamor", "Mirzapur", "Radhanagar", "Torikhati", "Totil"] },
        ],
      },
    ],
  },

  // ── 8. MYMENSINGH DIVISION (4 Districts) ───────────────────────────────────
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
          { name: "Fulbaria", nameBn: "ফুলবাড়িয়া", unions: ["Bakta", "Bhabanipur", "Enayetpur", "Fulbaria Pourashava", "Kaladaha", "Kushmail", "Naogaon", "Putijana", "Radhakanai"] },
          { name: "Gaffargaon", nameBn: "গফরগাঁও", unions: ["Barobaria", "Char Algi", "Dattapara", "Gaffargaon Pourashava", "Gaffargaon Sadar", "Mashakhali", "Panchbhag", "Raona", "Salthia", "Tangab"] },
          { name: "Gouripur", nameBn: "গৌরীপুর", unions: ["Achintapur", "Bokainagar", "Bhangnamari", "Dhanikhola", "Gouripur Pourashava", "Maoha", "Ramgopalpur", "Sahapara", "Siddhamukh"] },
          { name: "Ishwarganj", nameBn: "ঈশ্বরগঞ্জ", unions: ["Barahit", "Ishwarganj Pourashava", "Jatia", "Maijbagh", "Magtula", "Rajibpur", "Sarisha", "Sohagi", "Tarundia", "Uchakhila"] },
          { name: "Haluaghat", nameBn: "হালুয়াঘাট", unions: ["Amtoil", "Bhuapur", "Dhara", "Gazirbhit", "Haluaghat Sadar", "Jugli", "Kailati", "Nalitabari", "Sakua", "Sujonokati"] },
          { name: "Dhobaura", nameBn: "ধোবাউড়া", unions: ["Bagber", "Dakshin Maijpara", "Dhobaura Sadar", "Gamaritala", "Ghoshgaon", "Purakandulia"] },
          { name: "Nandail", nameBn: "নান্দাইল", unions: ["Achintapur", "Betagair", "Chandipasha", "Gangail", "Kharua", "Moazzampur", "Musulli", "Nandail Pourashava", "Rajgati", "Sherpur", "Singrail"] },
          { name: "Phulpur", nameBn: "ফুলপুর", unions: ["Bhaitkandi", "Balia", "Chalitabari", "Payari", "Phulpur Pourashava", "Phulpur Sadar", "Rambhadrapur", "Ruhi", "Singheswar"] },
          { name: "Tarakanda", nameBn: "তারাকান্দা", unions: ["Baniachapra", "Biska", "Daldalia", "Galagaon", "Kakni", "Kamaragaon", "Rampur", "Tarakanda Sadar"] },
        ],
      },
      {
        name: "Jamalpur",
        nameBn: "জামালপুর",
        upazilas: [
          { name: "Jamalpur Sadar", nameBn: "জামালপুর সদর", unions: ["Banshchara", "Digpaith", "Ghoradhap", "Itail", "Jamalpur Pourashava", "Kendua", "Lakshmirchar", "Meshra", "Nandina", "Narundi", "Ranagachha", "Sharifpur", "Titpalla"] },
          { name: "Sarishabari", nameBn: "সরিষাবাড়ী", unions: ["Aona", "Bhatara", "Doail", "Kamrabad", "Mahadan", "Pingna", "Pogaldigha", "Sarishabari Pourashava"] },
          { name: "Melandaha", nameBn: "মেলান্দহ", unions: ["Adra", "Charbanipakuria", "Durmuth", "Fulkocha", "Ghoshirpara", "Jhaoil", "Kulian", "Melandaha Pourashava", "Nangla", "Shampur"] },
          { name: "Islampur", nameBn: "ইসলামপুর", unions: ["Beldanga", "Char Goalini", "Char Putimari", "Chinaduli", "Gaibandha", "Gohalbari", "Islampur Pourashava", "Palbandha", "Parthashi", "Sapdhari"] },
          { name: "Dewanganj", nameBn: "দেওয়ানগঞ্জ", unions: ["Bahadurabad", "Char Aomari", "Chikajani", "Chukaibari", "Dangdhara", "Dewanganj Pourashava", "Hathibandha", "Parramrampur"] },
          { name: "Madarganj", nameBn: "মাদারগঞ্জ", unions: ["Adarsha Madarganj", "Balijhuri", "Char Pakerdah", "Gunaritola", "Jorakhali", "Kallyanpur", "Madarganj Pourashava", "Siddhipasha"] },
          { name: "Bakshiganj", nameBn: "বকশীগঞ্জ", unions: ["Baghmara", "Bakshiganj Pourashava", "Battajore", "Dhanua", "Kamalpur", "Merur Char", "Nilakhia", "Sadhurpara"] },
        ],
      },
      {
        name: "Netrokona",
        nameBn: "নেত্রকোণা",
        upazilas: [
          { name: "Netrokona Sadar", nameBn: "নেত্রকোণা সদর", unions: ["Amthol", "Badla", "Challisha", "Dakshin Singher", "Kailati", "Laxmigonj", "Medda", "Mougati", "Netrokona Pourashava", "Rautha"] },
          { name: "Kendua", nameBn: "কেন্দুয়া", unions: ["Ashujia", "Balla", "Dalpa", "Gondol", "Gourirgaon", "Kandiura", "Kendua Pourashava", "Masjidpara", "Nowpara", "Paikura", "Roa"] },
          { name: "Mohanganj", nameBn: "মোহনগঞ্জ", unions: ["Barkashia Bisha", "Gaglajur", "Hathia", "Maghan Siadhar", "Mohanganj Pourashava", "Suarmanto", "Teligati"] },
          { name: "Durgapur", nameBn: "দুর্গাপুর", unions: ["Bakbakia", "Birishiri", "Chandigarh", "Durgapur Pourashava", "Gaulkandhi", "Kakorkandi", "Kullagora"] },
          { name: "Purbadhala", nameBn: "পূর্বধলা", unions: ["Agia", "Bishkakuni", "Dhalamulgaon", "Ghaghur", "Gohalakanda", "Hugla", "Jaria", "Narayanhar", "Purbadhala Sadar", "Vaigoan"] },
          { name: "Barhatta", nameBn: "বারহাট্টা", unions: ["Asma", "Baushi", "Barhatta Sadar", "Chirai", "Kalia", "Raypur", "Sahata", "Singdha"] },
          { name: "Kalmakanda", nameBn: "কলমাকান্দা", unions: ["Boroikandi", "Chirang", "Kalmakanda Sadar", "Kharamnagar", "Lengura", "Nazirpur", "Pogla", "Rangchhati"] },
          { name: "Atpara", nameBn: "আটপাড়া", unions: ["Baniachapra", "Duoj", "Luneswar", "Sonai", "Sukhari", "Swarupdaha", "Teligati"] },
          { name: "Madan", nameBn: "মদন", unions: ["Fatehpur", "Gobindasree", "Jahangirpur", "Kaikuria", "Madan Pourashava", "Maghan", "Naogaon", "Tiyashree"] },
          { name: "Khaliajuri", nameBn: "খালিয়াজুড়ি", unions: ["Chakua", "Dhanpur", "Gajirgaon", "Khaliajuri Sadar", "Krishnapur", "Mendipur", "Nagar"] },
        ],
      },
      {
        name: "Sherpur",
        nameBn: "শেরপুর",
        upazilas: [
          { name: "Sherpur Sadar", nameBn: "শেরপুর সদর", unions: ["Bajitpur", "Balia", "Bhatshala", "Char Charbata", "Char Moktar", "Char Pakshia", "Dhala", "Gharerchar", "Kamaria", "Pakuria", "Rampur", "Rownmari", "Sherpur Pourashava"] },
          { name: "Nalitabari", nameBn: "নালিতাবাড়ী", unions: ["Baghber", "Baromari", "Kakorkandi", "Kolashpashar", "Moricha", "Nalitabari Pourashava", "Noyabil", "Polashikura", "Rajnagar", "Ramchandrapur", "Rupnarayan Kura"] },
          { name: "Nakla", nameBn: "নকলা", unions: ["Baneshwardi", "Char Ashtadhar", "Gauradwar", "Ganapaddi", "Nakla Pourashava", "Pathakata", "Pikurati", "Taluk Pathakata", "Urfa"] },
          { name: "Jhenaigati", nameBn: "ঝিনাইগাতী", unions: ["Dhanshail", "Gauripur", "Hatibandha", "Jhenaigati Sadar", "Kangsha", "Malijhikanda", "Nolkhura"] },
          { name: "Sreebardi", nameBn: "শ্রীবরদী", unions: ["Bhelanpur", "Goshaipur", "Kakilakura", "Kharamoan", "Kukurikandi", "Ranisimul", "Singhabaruna", "Sreebardi Pourashava", "Tatihati"] },
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
 * e.g. "House 12, Road 4, Sector 7, Uttara, Dhaka"
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
